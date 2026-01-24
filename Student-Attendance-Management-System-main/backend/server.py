from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    college_id: str
    name: str
    email: EmailStr
    role: str  # admin, faculty, student
    password_hash: str
    department_id: Optional[str] = None
    course_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class UserCreate(BaseModel):
    college_id: str
    name: str
    email: EmailStr
    password: str
    role: str
    department_id: Optional[str] = None
    course_id: Optional[str] = None

class LoginRequest(BaseModel):
    college_id: str
    password: str

class Department(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DepartmentCreate(BaseModel):
    name: str
    code: str

class Course(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    department_id: str
    year: int
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class CourseCreate(BaseModel):
    name: str
    code: str
    department_id: str
    year: int

class Subject(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    course_id: str
    faculty_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SubjectCreate(BaseModel):
    name: str
    code: str
    course_id: str
    faculty_id: Optional[str] = None

class ClassSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subject_id: str
    faculty_id: str
    date: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ClassSessionCreate(BaseModel):
    subject_id: str
    date: str

class AttendanceRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    student_id: str
    subject_id: str
    status: str  # present, absent
    marked_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class AttendanceCreate(BaseModel):
    session_id: str
    student_id: str
    subject_id: str
    status: str

class AttendanceUpdate(BaseModel):
    status: str

# Helper functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def send_email_alert(to_email: str, student_name: str, subject_name: str, attendance_percentage: float):
    """Send email alert for low attendance"""
    smtp_host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "587"))
    smtp_user = os.environ.get("SMTP_USER", "")
    smtp_password = os.environ.get("SMTP_PASSWORD", "")
    
    if not smtp_user or not smtp_password:
        logging.warning("SMTP credentials not configured")
        return
    
    try:
        msg = MIMEMultipart()
        msg['From'] = smtp_user
        msg['To'] = to_email
        msg['Subject'] = f"Low Attendance Alert - {subject_name}"
        
        body = f"""
        Dear {student_name},
        
        This is to inform you that your attendance in {subject_name} is currently at {attendance_percentage:.2f}%.
        
        The minimum required attendance for exam eligibility is 75%.
        
        Please ensure regular attendance to maintain eligibility.
        
        Regards,
        Academic Department
        """
        
        msg.attach(MIMEText(body, 'plain'))
        
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        logging.info(f"Email sent to {to_email}")
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")

# Auth routes
@api_router.post("/auth/login")
async def login(request: LoginRequest):
    user = await db.users.find_one({"college_id": request.college_id}, {"_id": 0})
    if not user or not verify_password(request.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "college_id": user["college_id"]
        }
    }

@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# Admin routes
@api_router.post("/admin/departments", response_model=Department)
async def create_department(dept: DepartmentCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    department = Department(**dept.model_dump())
    await db.departments.insert_one(department.model_dump())
    return department

@api_router.get("/admin/departments")
async def get_departments(current_user: dict = Depends(get_current_user)):
    departments = await db.departments.find({}, {"_id": 0}).to_list(1000)
    return departments

@api_router.post("/admin/courses", response_model=Course)
async def create_course(course: CourseCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    course_obj = Course(**course.model_dump())
    await db.courses.insert_one(course_obj.model_dump())
    return course_obj

@api_router.get("/admin/courses")
async def get_courses(current_user: dict = Depends(get_current_user)):
    courses = await db.courses.find({}, {"_id": 0}).to_list(1000)
    return courses

@api_router.post("/admin/subjects", response_model=Subject)
async def create_subject(subject: SubjectCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    subject_obj = Subject(**subject.model_dump())
    await db.subjects.insert_one(subject_obj.model_dump())
    return subject_obj

@api_router.get("/admin/subjects")
async def get_subjects(current_user: dict = Depends(get_current_user)):
    subjects = await db.subjects.find({}, {"_id": 0}).to_list(1000)
    return subjects

@api_router.post("/admin/users", response_model=User)
async def create_user(user_create: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if college_id already exists
    existing = await db.users.find_one({"college_id": user_create.college_id})
    if existing:
        raise HTTPException(status_code=400, detail="College ID already exists")
    
    user_dict = user_create.model_dump()
    password = user_dict.pop("password")
    user_dict["password_hash"] = hash_password(password)
    
    user = User(**user_dict)
    await db.users.insert_one(user.model_dump())
    return user

@api_router.get("/admin/users")
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.put("/admin/users/{user_id}")
async def update_user(user_id: str, user_update: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_dict = user_update.model_dump()
    if "password" in update_dict:
        password = update_dict.pop("password")
        update_dict["password_hash"] = hash_password(password)
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_dict})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User updated successfully"}

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.put("/admin/subjects/{subject_id}/assign-faculty")
async def assign_faculty(subject_id: str, faculty_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.subjects.update_one({"id": subject_id}, {"$set": {"faculty_id": faculty_id}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    return {"message": "Faculty assigned successfully"}

# Faculty routes
@api_router.post("/faculty/sessions", response_model=ClassSession)
async def create_session(session: ClassSessionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    session_dict = session.model_dump()
    session_dict["faculty_id"] = current_user["id"]
    session_obj = ClassSession(**session_dict)
    await db.class_sessions.insert_one(session_obj.model_dump())
    return session_obj

@api_router.get("/faculty/sessions")
async def get_faculty_sessions(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    sessions = await db.class_sessions.find({"faculty_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    return sessions

@api_router.post("/faculty/attendance", response_model=AttendanceRecord)
async def mark_attendance(attendance: AttendanceCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    # Check if already marked
    existing = await db.attendance_records.find_one({
        "session_id": attendance.session_id,
        "student_id": attendance.student_id
    })
    
    if existing:
        raise HTTPException(status_code=400, detail="Attendance already marked for this session")
    
    attendance_dict = attendance.model_dump()
    attendance_dict["marked_by"] = current_user["id"]
    attendance_obj = AttendanceRecord(**attendance_dict)
    await db.attendance_records.insert_one(attendance_obj.model_dump())
    return attendance_obj

@api_router.get("/faculty/attendance/{subject_id}")
async def get_subject_attendance(subject_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    records = await db.attendance_records.find({"subject_id": subject_id}, {"_id": 0}).to_list(10000)
    return records

@api_router.put("/faculty/attendance/{attendance_id}")
async def update_attendance(attendance_id: str, update: AttendanceUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    result = await db.attendance_records.update_one({"id": attendance_id}, {"$set": {"status": update.status}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Attendance record not found")
    
    return {"message": "Attendance updated successfully"}

@api_router.get("/faculty/reports/{subject_id}")
async def get_faculty_report(subject_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    # Get all students in the course
    subject = await db.subjects.find_one({"id": subject_id}, {"_id": 0})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    course = await db.courses.find_one({"id": subject["course_id"]}, {"_id": 0})
    students = await db.users.find({"role": "student", "course_id": subject["course_id"]}, {"_id": 0}).to_list(1000)
    
    # Get all sessions for this subject
    sessions = await db.class_sessions.find({"subject_id": subject_id}, {"_id": 0}).to_list(1000)
    total_classes = len(sessions)
    
    # Calculate attendance for each student
    report = []
    for student in students:
        attended = await db.attendance_records.count_documents({
            "subject_id": subject_id,
            "student_id": student["id"],
            "status": "present"
        })
        
        percentage = (attended / total_classes * 100) if total_classes > 0 else 0
        eligible = percentage >= 75
        
        report.append({
            "student_id": student["id"],
            "student_name": student["name"],
            "college_id": student["college_id"],
            "email": student["email"],
            "total_classes": total_classes,
            "attended": attended,
            "percentage": round(percentage, 2),
            "eligible": eligible
        })
    
    return {
        "subject": subject,
        "course": course,
        "total_classes": total_classes,
        "students": report
    }

@api_router.post("/faculty/send-alerts/{subject_id}")
async def send_alerts(subject_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "faculty":
        raise HTTPException(status_code=403, detail="Faculty access required")
    
    # Get subject info
    subject = await db.subjects.find_one({"id": subject_id}, {"_id": 0})
    if not subject:
        raise HTTPException(status_code=404, detail="Subject not found")
    
    course = await db.courses.find_one({"id": subject["course_id"]}, {"_id": 0})
    students = await db.users.find({"role": "student", "course_id": subject["course_id"]}, {"_id": 0}).to_list(1000)
    
    sessions = await db.class_sessions.find({"subject_id": subject_id}, {"_id": 0}).to_list(1000)
    total_classes = len(sessions)
    
    alerts_sent = 0
    for student in students:
        attended = await db.attendance_records.count_documents({
            "subject_id": subject_id,
            "student_id": student["id"],
            "status": "present"
        })
        
        percentage = (attended / total_classes * 100) if total_classes > 0 else 0
        
        if percentage < 75:
            await send_email_alert(student["email"], student["name"], subject["name"], percentage)
            alerts_sent += 1
    
    return {"message": f"Sent {alerts_sent} alerts", "total_students": len(students)}

# Student routes
@api_router.get("/student/attendance")
async def get_student_attendance(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    # Get student's course
    course = await db.courses.find_one({"id": current_user.get("course_id")}, {"_id": 0})
    if not course:
        return {"subjects": []}
    
    # Get all subjects for this course
    subjects = await db.subjects.find({"course_id": course["id"]}, {"_id": 0}).to_list(1000)
    
    attendance_data = []
    for subject in subjects:
        # Get total sessions
        sessions = await db.class_sessions.find({"subject_id": subject["id"]}, {"_id": 0}).to_list(1000)
        total_classes = len(sessions)
        
        # Get attended sessions
        attended = await db.attendance_records.count_documents({
            "subject_id": subject["id"],
            "student_id": current_user["id"],
            "status": "present"
        })
        
        percentage = (attended / total_classes * 100) if total_classes > 0 else 0
        eligible = percentage >= 75
        
        attendance_data.append({
            "subject_id": subject["id"],
            "subject_name": subject["name"],
            "subject_code": subject["code"],
            "total_classes": total_classes,
            "attended": attended,
            "percentage": round(percentage, 2),
            "eligible": eligible
        })
    
    return {"subjects": attendance_data}

@api_router.get("/student/eligibility")
async def get_eligibility(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "student":
        raise HTTPException(status_code=403, detail="Student access required")
    
    attendance = await get_student_attendance(current_user)
    eligible_count = sum(1 for s in attendance["subjects"] if s["eligible"])
    total_subjects = len(attendance["subjects"])
    
    return {
        "eligible_subjects": eligible_count,
        "total_subjects": total_subjects,
        "overall_eligible": eligible_count == total_subjects and total_subjects > 0
    }

# Reports
@api_router.get("/reports/overall")
async def get_overall_report(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    total_students = await db.users.count_documents({"role": "student"})
    total_faculty = await db.users.count_documents({"role": "faculty"})
    total_subjects = await db.subjects.count_documents({})
    total_sessions = await db.class_sessions.count_documents({})
    
    return {
        "total_students": total_students,
        "total_faculty": total_faculty,
        "total_subjects": total_subjects,
        "total_sessions": total_sessions
    }

@api_router.get("/courses/{course_id}/students")
async def get_course_students(course_id: str, current_user: dict = Depends(get_current_user)):
    students = await db.users.find({"role": "student", "course_id": course_id}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return students

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

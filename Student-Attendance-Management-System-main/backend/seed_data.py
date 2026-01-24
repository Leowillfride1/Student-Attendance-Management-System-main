import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from datetime import datetime, timedelta, timezone
import random

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["attendance_system"]
    
    # Clear existing data
    await db.users.delete_many({})
    await db.departments.delete_many({})
    await db.courses.delete_many({})
    await db.subjects.delete_many({})
    await db.class_sessions.delete_many({})
    await db.attendance_records.delete_many({})
    
    print("Creating admin user...")
    admin = {
        "id": "admin-001",
        "college_id": "ADMIN001",
        "name": "System Administrator",
        "email": "admin@college.edu",
        "role": "admin",
        "password_hash": pwd_context.hash("admin123"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin)
    
    print("Creating departments...")
    departments = [
        {"id": "dept-cs", "name": "Computer Science", "code": "CS", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "dept-ece", "name": "Electronics & Communication", "code": "ECE", "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    await db.departments.insert_many(departments)
    
    print("Creating courses...")
    courses = [
        {"id": "course-cs1", "name": "Computer Science - Year 1", "code": "CS-Y1", "department_id": "dept-cs", "year": 1, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "course-cs2", "name": "Computer Science - Year 2", "code": "CS-Y2", "department_id": "dept-cs", "year": 2, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "course-ece1", "name": "Electronics - Year 1", "code": "ECE-Y1", "department_id": "dept-ece", "year": 1, "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    await db.courses.insert_many(courses)
    
    print("Creating faculty...")
    faculty_data = [
        {"id": f"faculty-{i}", "college_id": f"FAC{1000+i}", "name": f"Dr. Faculty {i}", "email": f"faculty{i}@college.edu", 
         "role": "faculty", "department_id": "dept-cs" if i <= 3 else "dept-ece", "password_hash": pwd_context.hash("faculty123"),
         "created_at": datetime.now(timezone.utc).isoformat()}
        for i in range(1, 6)
    ]
    await db.users.insert_many(faculty_data)
    
    print("Creating subjects...")
    subjects = [
        {"id": "subj-1", "name": "Data Structures", "code": "CS101", "course_id": "course-cs1", "faculty_id": "faculty-1", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "subj-2", "name": "Database Systems", "code": "CS102", "course_id": "course-cs1", "faculty_id": "faculty-2", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "subj-3", "name": "Web Development", "code": "CS103", "course_id": "course-cs1", "faculty_id": "faculty-1", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "subj-4", "name": "Algorithms", "code": "CS201", "course_id": "course-cs2", "faculty_id": "faculty-3", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "subj-5", "name": "Digital Electronics", "code": "ECE101", "course_id": "course-ece1", "faculty_id": "faculty-4", "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    await db.subjects.insert_many(subjects)
    
    print("Creating students...")
    students = []
    for i in range(1, 31):
        course_id = "course-cs1" if i <= 20 else "course-ece1"
        dept_id = "dept-cs" if i <= 20 else "dept-ece"
        students.append({
            "id": f"student-{i}",
            "college_id": f"STU{2000+i}",
            "name": f"Student {i}",
            "email": f"student{i}@college.edu",
            "role": "student",
            "department_id": dept_id,
            "course_id": course_id,
            "password_hash": pwd_context.hash("student123"),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    await db.users.insert_many(students)
    
    print("Creating class sessions and attendance records...")
    # Create sessions for the past 30 days
    base_date = datetime.now(timezone.utc) - timedelta(days=30)
    
    for subject in subjects:
        session_count = 0
        for day in range(0, 30, 2):  # Classes every 2 days
            session_date = (base_date + timedelta(days=day)).date().isoformat()
            session_id = f"session-{subject['id']}-{session_count}"
            
            session = {
                "id": session_id,
                "subject_id": subject["id"],
                "faculty_id": subject["faculty_id"],
                "date": session_date,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.class_sessions.insert_one(session)
            session_count += 1
            
            # Mark attendance for students in this course
            course_students = [s for s in students if s["course_id"] == subject["course_id"]]
            
            for student in course_students:
                # Random attendance with 70-90% probability of being present
                status = "present" if random.random() < 0.80 else "absent"
                
                attendance = {
                    "id": f"att-{session_id}-{student['id']}",
                    "session_id": session_id,
                    "student_id": student["id"],
                    "subject_id": subject["id"],
                    "status": status,
                    "marked_by": subject["faculty_id"],
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                await db.attendance_records.insert_one(attendance)
    
    print("\n✅ Database seeded successfully!")
    print("\n📋 Login Credentials:")
    print("\nAdmin:")
    print("  College ID: ADMIN001")
    print("  Password: admin123")
    print("\nFaculty (any of these):")
    print("  College ID: FAC1001, FAC1002, FAC1003, FAC1004, FAC1005")
    print("  Password: faculty123")
    print("\nStudent (any of these):")
    print("  College ID: STU2001, STU2002, ... STU2030")
    print("  Password: student123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())

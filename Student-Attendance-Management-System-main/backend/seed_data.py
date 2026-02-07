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
        "college_id": "brubk2025",
        "name": "Leowillfride A",
        "email": "leowillfride@gmail.com",
        "role": "admin",
        "password_hash": pwd_context.hash("Leow1012"),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(admin)
    
    print("Creating Department and Course...")
    dept_id = "dept-bca"
    course_id = "course-bca-3"
    await db.departments.insert_one({
        "id": dept_id, "name": "Computer Applications", "code": "BCA", "created_at": datetime.now(timezone.utc).isoformat()
    })
    await db.courses.insert_one({
        "id": course_id, "name": "BCA - Year 3", "code": "BCA-Y3", "department_id": dept_id, "year": 3, "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    print("Creating Faculty and Subjects...")
    # Faculty based on your uploaded table
    staff_list = [
        {"id": "fac-suganya", "name": "Ms. B. Suganya", "college_id": "FAC_SUG_01", "password": "faculty123"},
        {"id": "fac-shunmuga", "name": "Ms. K. Shunmugapriya", "college_id": "FAC_SHU_02", "password": "faculty123"},
        {"id": "fac-sathya", "name": "Ms. K. Sathya", "college_id": "FAC_SAT_03", "password": "faculty123"},
        {"id": "fac-ganesan", "name": "Dr. A. Ganesan", "college_id": "FAC_GAN_04", "password": "faculty123"}
    ]
    
    faculty_users = []
    for staff in staff_list:
        faculty_users.append({
            "id": staff["id"],
            "college_id": staff["college_id"],
            "name": staff["name"],
            "email": f"{staff['id']}@scas.edu.in",
            "role": "faculty",
            "department_id": dept_id,
            "password_hash": pwd_context.hash(staff["password"]),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    await db.users.insert_many(faculty_users)

    # Subjects based on your uploaded table
    subjects_data = [
        {"id": "sub-63a", "name": "Graphics & Multimedia", "code": "63A", "faculty_id": "fac-suganya"},
        {"id": "sub-63b", "name": "Project Work Lab", "code": "63B", "faculty_id": "fac-shunmuga"},
        {"id": "sub-6ea", "name": "Computer Networks", "code": "6EA", "faculty_id": "fac-ganesan"},
        {"id": "sub-6ef", "name": "Internet of Things (IoT)", "code": "6EF", "faculty_id": "fac-suganya"},
        {"id": "sub-nm", "name": "Cyber Security", "code": "NM", "faculty_id": "fac-shunmuga"}
    ]
    for sub in subjects_data:
        sub.update({"course_id": course_id, "created_at": datetime.now(timezone.utc).isoformat()})
    await db.subjects.insert_many(subjects_data)

    print("Creating 23 Students from roster...")
    # Excluding 10 and 11 as requested
    student_roster = [
        ("2322J0998", "ABINAYA V"), ("2322J0999", "ANBAZHAGAN S"), ("2322J1000", "ANBUSIVAM M"),
        ("2322J1001", "ATCHAYA V"), ("2322J1002", "ATHIHIYAN R"), ("2322J1003", "BALACHANDAR R"),
        ("2322J1004", "DHANALAKSHMI"), ("2322J1005", "EZHUMALAI A"), ("2322J1006", "HARIKARAN M"),
        ("2322J1009", "KALAIYARASI K"), ("2322J1010", "KISHORE KUMAR R"), ("2322J1011", "LAKSHMANAN"),
        ("2322J1012", "LEOWILLFRIDE A"), ("2322J1013", "MADHUSREE P"), ("2322J1014", "MANOGARAN M"),
        ("2322J1015", "NIVIN KUMAR M"), ("2322J1016", "POOJADHARSHINI M"), ("2322J1017", "SANJITH KUMAR P"),
        ("2322J1018", "SRI HARIHARAN S J"), ("2322J1019", "THIMONIN THIBISHA P"), ("2322J1020", "VEERAPANDIYAN R"),
        ("2322J1021", "YASHVANTH"), ("2322J1022", "YOGESWARAN K")
    ]

    students = []
    for idx, (reg_no, name) in enumerate(student_roster, 1):
        students.append({
            "id": f"student-{reg_no}",
            "college_id": reg_no,
            "name": name,
            "email": f"scasstudent{idx}@gmail.com",
            "role": "student",
            "department_id": dept_id,
            "course_id": course_id,
            "password_hash": pwd_context.hash("student123"), # Default pass for classmates
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    await db.users.insert_many(students)

    print("Generating class history for past 10 days...")
    # This creates fake attendance history so your charts look full
    base_date = datetime.now(timezone.utc) - timedelta(days=10)
    for sub in subjects_data:
        for day in range(10):
            session_date = (base_date + timedelta(days=day)).date().isoformat()
            s_id = f"sess-{sub['code']}-{day}"
            await db.class_sessions.insert_one({
                "id": s_id, "subject_id": sub["id"], "faculty_id": sub["faculty_id"],
                "date": session_date, "created_at": datetime.now(timezone.utc).isoformat()
            })
            for stu in students:
                status = "present" if random.random() < 0.85 else "absent"
                await db.attendance_records.insert_one({
                    "id": f"att-{s_id}-{stu['college_id']}", "session_id": s_id,
                    "student_id": stu["id"], "subject_id": sub["id"], "status": status,
                    "marked_by": sub["faculty_id"], "created_at": datetime.now(timezone.utc).isoformat()
                })

    print("\n✅ BCA Class Database seeded successfully!")
    print(f"Total Students: {len(students)}")
    print("\n📋 NEW LOGIN CREDENTIALS:")
    print("ADMIN: brubk2025 / Leow1012")
    print("FACULTY: FAC_SUG_01 (Ms. Suganya) / faculty123")
    print("STUDENT: 2322J1012 (Your ID) / student123")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())

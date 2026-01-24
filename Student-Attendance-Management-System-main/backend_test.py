import requests
import sys
from datetime import datetime, date
import json

class AttendanceSystemTester:
    def __init__(self, base_url="https://student-presence-36.preview.emergentagent.com"):
        self.base_url = base_url
        self.admin_token = None
        self.faculty_token = None
        self.student_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            return False, {}

    def test_authentication(self):
        """Test login for all user roles"""
        print("\n=== AUTHENTICATION TESTS ===")
        
        # Test Admin Login
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"college_id": "ADMIN001", "password": "admin123"}
        )
        if success and 'token' in response:
            self.admin_token = response['token']
            print(f"   Admin user: {response.get('user', {}).get('name', 'Unknown')}")
        
        # Test Faculty Login
        success, response = self.run_test(
            "Faculty Login",
            "POST",
            "auth/login",
            200,
            data={"college_id": "FAC1001", "password": "faculty123"}
        )
        if success and 'token' in response:
            self.faculty_token = response['token']
            print(f"   Faculty user: {response.get('user', {}).get('name', 'Unknown')}")
        
        # Test Student Login
        success, response = self.run_test(
            "Student Login",
            "POST",
            "auth/login",
            200,
            data={"college_id": "STU2001", "password": "student123"}
        )
        if success and 'token' in response:
            self.student_token = response['token']
            print(f"   Student user: {response.get('user', {}).get('name', 'Unknown')}")
        
        # Test Invalid Login
        self.run_test(
            "Invalid Login",
            "POST",
            "auth/login",
            401,
            data={"college_id": "INVALID", "password": "wrong"}
        )

    def test_admin_functionality(self):
        """Test admin-specific features"""
        if not self.admin_token:
            print("\n❌ Skipping admin tests - no admin token")
            return
            
        print("\n=== ADMIN FUNCTIONALITY TESTS ===")
        
        # Test dashboard statistics
        self.run_test(
            "Admin Dashboard Stats",
            "GET",
            "reports/overall",
            200,
            token=self.admin_token
        )
        
        # Test departments management
        self.run_test(
            "Get Departments",
            "GET",
            "admin/departments",
            200,
            token=self.admin_token
        )
        
        # Test courses management
        self.run_test(
            "Get Courses",
            "GET",
            "admin/courses",
            200,
            token=self.admin_token
        )
        
        # Test subjects management
        self.run_test(
            "Get Subjects",
            "GET",
            "admin/subjects",
            200,
            token=self.admin_token
        )
        
        # Test users management
        self.run_test(
            "Get Users",
            "GET",
            "admin/users",
            200,
            token=self.admin_token
        )
        
        # Test creating a new department
        test_dept_data = {
            "name": "Test Department",
            "code": "TEST"
        }
        success, dept_response = self.run_test(
            "Create Department",
            "POST",
            "admin/departments",
            200,
            data=test_dept_data,
            token=self.admin_token
        )
        
        # Test creating a new course
        if success and dept_response:
            test_course_data = {
                "name": "Test Course",
                "code": "TEST-Y1",
                "department_id": dept_response.get("id"),
                "year": 1
            }
            success, course_response = self.run_test(
                "Create Course",
                "POST",
                "admin/courses",
                200,
                data=test_course_data,
                token=self.admin_token
            )
            
            # Test creating a new subject
            if success and course_response:
                test_subject_data = {
                    "name": "Test Subject",
                    "code": "TEST101",
                    "course_id": course_response.get("id")
                }
                self.run_test(
                    "Create Subject",
                    "POST",
                    "admin/subjects",
                    200,
                    data=test_subject_data,
                    token=self.admin_token
                )

    def test_faculty_functionality(self):
        """Test faculty-specific features"""
        if not self.faculty_token:
            print("\n❌ Skipping faculty tests - no faculty token")
            return
            
        print("\n=== FACULTY FUNCTIONALITY TESTS ===")
        
        # Test getting faculty sessions
        self.run_test(
            "Get Faculty Sessions",
            "GET",
            "faculty/sessions",
            200,
            token=self.faculty_token
        )
        
        # Test creating a session
        session_data = {
            "subject_id": "subj-1",  # From seed data
            "date": date.today().isoformat()
        }
        success, session_response = self.run_test(
            "Create Class Session",
            "POST",
            "faculty/sessions",
            200,
            data=session_data,
            token=self.faculty_token
        )
        
        # Test marking attendance
        if success and session_response:
            attendance_data = {
                "session_id": session_response.get("id"),
                "student_id": "student-1",  # From seed data
                "subject_id": "subj-1",
                "status": "present"
            }
            self.run_test(
                "Mark Attendance",
                "POST",
                "faculty/attendance",
                200,
                data=attendance_data,
                token=self.faculty_token
            )
        
        # Test getting attendance records
        self.run_test(
            "Get Subject Attendance",
            "GET",
            "faculty/attendance/subj-1",
            200,
            token=self.faculty_token
        )
        
        # Test getting faculty reports
        self.run_test(
            "Get Faculty Report",
            "GET",
            "faculty/reports/subj-1",
            200,
            token=self.faculty_token
        )
        
        # Test sending email alerts
        self.run_test(
            "Send Email Alerts",
            "POST",
            "faculty/send-alerts/subj-1",
            200,
            token=self.faculty_token
        )

    def test_student_functionality(self):
        """Test student-specific features"""
        if not self.student_token:
            print("\n❌ Skipping student tests - no student token")
            return
            
        print("\n=== STUDENT FUNCTIONALITY TESTS ===")
        
        # Test getting student attendance
        self.run_test(
            "Get Student Attendance",
            "GET",
            "student/attendance",
            200,
            token=self.student_token
        )
        
        # Test getting eligibility status
        self.run_test(
            "Get Eligibility Status",
            "GET",
            "student/eligibility",
            200,
            token=self.student_token
        )

    def test_authorization(self):
        """Test role-based access control"""
        print("\n=== AUTHORIZATION TESTS ===")
        
        # Test student trying to access admin endpoint
        if self.student_token:
            self.run_test(
                "Student Access Admin Endpoint (Should Fail)",
                "GET",
                "admin/users",
                403,
                token=self.student_token
            )
        
        # Test faculty trying to access admin endpoint
        if self.faculty_token:
            self.run_test(
                "Faculty Access Admin Endpoint (Should Fail)",
                "GET",
                "admin/users",
                403,
                token=self.faculty_token
            )
        
        # Test unauthenticated access
        self.run_test(
            "Unauthenticated Access (Should Fail)",
            "GET",
            "admin/users",
            401
        )

    def test_data_integrity(self):
        """Test data relationships and integrity"""
        print("\n=== DATA INTEGRITY TESTS ===")
        
        if not self.admin_token:
            print("❌ Skipping data integrity tests - no admin token")
            return
        
        # Test getting course students
        success, response = self.run_test(
            "Get Course Students",
            "GET",
            "courses/course-cs1/students",
            200,
            token=self.admin_token
        )
        
        if success:
            print(f"   Found {len(response)} students in course-cs1")

def main():
    print("🚀 Starting Student Attendance Management System API Tests")
    print("=" * 60)
    
    tester = AttendanceSystemTester()
    
    # Run all test suites
    tester.test_authentication()
    tester.test_admin_functionality()
    tester.test_faculty_functionality()
    tester.test_student_functionality()
    tester.test_authorization()
    tester.test_data_integrity()
    
    # Print final results
    print("\n" + "=" * 60)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 60)
    print(f"Total Tests: {tester.tests_run}")
    print(f"Passed: {tester.tests_passed}")
    print(f"Failed: {len(tester.failed_tests)}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.failed_tests:
        print("\n❌ FAILED TESTS:")
        for test in tester.failed_tests:
            error_msg = test.get('error', f"Expected {test.get('expected')}, got {test.get('actual')}")
            print(f"  - {test['test']}: {error_msg}")
    
    return 0 if len(tester.failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())
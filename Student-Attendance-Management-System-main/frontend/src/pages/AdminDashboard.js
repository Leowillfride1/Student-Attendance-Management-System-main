import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { axiosInstance } from '../App';
import { toast } from 'sonner';
import { LayoutDashboard, Users as UsersIcon, Building2, BookOpen, GraduationCap, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

function Sidebar({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/admin/departments', label: 'Departments', icon: Building2 },
    { path: '/admin/courses', label: 'Courses', icon: BookOpen },
    { path: '/admin/subjects', label: 'Subjects', icon: GraduationCap },
    { path: '/admin/users', label: 'Users', icon: UsersIcon },
  ];

  return (
    <div className="sidebar">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
        <p className="text-sm text-gray-500 mt-1">{user.name}</p>
      </div>

      <nav>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            data-testid={`nav-${item.label.toLowerCase()}`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
          </Link>
        ))}
      </nav>

      <button onClick={onLogout} className="nav-item mt-8 w-full" data-testid="logout-button">
        <LogOut className="w-5 h-5 mr-3" />
        Logout
      </button>
    </div>
  );
}

function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await axiosInstance.get('/reports/overall');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load statistics');
    }
  };

  if (!stats) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8" data-testid="dashboard-title">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="total-students-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.total_students}</div>
          </CardContent>
        </Card>

        <Card data-testid="total-faculty-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Faculty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.total_faculty}</div>
          </CardContent>
        </Card>

        <Card data-testid="total-subjects-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.total_subjects}</div>
          </CardContent>
        </Card>

        <Card data-testid="total-sessions-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{stats.total_sessions}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Departments() {
  const [departments, setDepartments] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const response = await axiosInstance.get('/admin/departments');
      setDepartments(response.data);
    } catch (error) {
      toast.error('Failed to load departments');
    }
  };

  const handleCreate = async () => {
    try {
      await axiosInstance.post('/admin/departments', { name, code });
      toast.success('Department created successfully');
      setOpen(false);
      setName('');
      setCode('');
      loadDepartments();
    } catch (error) {
      toast.error('Failed to create department');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="departments-title">Departments</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-department-button">Add Department</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Department</DialogTitle>
              <DialogDescription>Add a new department to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Department Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Computer Science" data-testid="dept-name-input" />
              </div>
              <div>
                <Label>Department Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., CS" data-testid="dept-code-input" />
              </div>
              <Button onClick={handleCreate} className="w-full" data-testid="create-dept-button">Create Department</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((dept) => (
              <tr key={dept.id} data-testid={`dept-row-${dept.code}`}>
                <td>{dept.name}</td>
                <td><span className="badge badge-info">{dept.code}</span></td>
                <td>{new Date(dept.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Courses() {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [year, setYear] = useState('1');

  useEffect(() => {
    loadCourses();
    loadDepartments();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await axiosInstance.get('/admin/courses');
      setCourses(response.data);
    } catch (error) {
      toast.error('Failed to load courses');
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await axiosInstance.get('/admin/departments');
      setDepartments(response.data);
    } catch (error) {
      toast.error('Failed to load departments');
    }
  };

  const handleCreate = async () => {
    try {
      await axiosInstance.post('/admin/courses', { name, code, department_id: departmentId, year: parseInt(year) });
      toast.success('Course created successfully');
      setOpen(false);
      setName('');
      setCode('');
      setDepartmentId('');
      setYear('1');
      loadCourses();
    } catch (error) {
      toast.error('Failed to create course');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="courses-title">Courses</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-course-button">Add Course</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Course</DialogTitle>
              <DialogDescription>Add a new course to a department</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Course Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Computer Science - Year 1" data-testid="course-name-input" />
              </div>
              <div>
                <Label>Course Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., CS-Y1" data-testid="course-code-input" />
              </div>
              <div>
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger data-testid="dept-select">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger data-testid="year-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                    <SelectItem value="3">Year 3</SelectItem>
                    <SelectItem value="4">Year 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" data-testid="create-course-button">Create Course</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Year</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id} data-testid={`course-row-${course.code}`}>
                <td>{course.name}</td>
                <td><span className="badge badge-info">{course.code}</span></td>
                <td>{course.year}</td>
                <td>{new Date(course.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Subjects() {
  const [subjects, setSubjects] = useState([]);
  const [courses, setCourses] = useState([]);
  const [faculty, setFaculty] = useState([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [courseId, setCourseId] = useState('');
  const [facultyId, setFacultyId] = useState('');

  useEffect(() => {
    loadSubjects();
    loadCourses();
    loadFaculty();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await axiosInstance.get('/admin/subjects');
      setSubjects(response.data);
    } catch (error) {
      toast.error('Failed to load subjects');
    }
  };

  const loadCourses = async () => {
    try {
      const response = await axiosInstance.get('/admin/courses');
      setCourses(response.data);
    } catch (error) {
      toast.error('Failed to load courses');
    }
  };

  const loadFaculty = async () => {
    try {
      const response = await axiosInstance.get('/admin/users');
      setFaculty(response.data.filter(u => u.role === 'faculty'));
    } catch (error) {
      toast.error('Failed to load faculty');
    }
  };

  const handleCreate = async () => {
    try {
      await axiosInstance.post('/admin/subjects', { name, code, course_id: courseId, faculty_id: facultyId || null });
      toast.success('Subject created successfully');
      setOpen(false);
      setName('');
      setCode('');
      setCourseId('');
      setFacultyId('');
      loadSubjects();
    } catch (error) {
      toast.error('Failed to create subject');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="subjects-title">Subjects</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-subject-button">Add Subject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Subject</DialogTitle>
              <DialogDescription>Add a new subject and optionally assign faculty</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Subject Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Data Structures" data-testid="subject-name-input" />
              </div>
              <div>
                <Label>Subject Code</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g., CS101" data-testid="subject-code-input" />
              </div>
              <div>
                <Label>Course</Label>
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger data-testid="course-select">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Assign Faculty (Optional)</Label>
                <Select value={facultyId} onValueChange={setFacultyId}>
                  <SelectTrigger data-testid="faculty-select">
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {faculty.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name} ({f.college_id})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" data-testid="create-subject-button">Create Subject</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Code</th>
              <th>Faculty</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => {
              const assignedFaculty = faculty.find(f => f.id === subject.faculty_id);
              return (
                <tr key={subject.id} data-testid={`subject-row-${subject.code}`}>
                  <td>{subject.name}</td>
                  <td><span className="badge badge-info">{subject.code}</span></td>
                  <td>{assignedFaculty ? assignedFaculty.name : 'Not assigned'}</td>
                  <td>{new Date(subject.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Users() {
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [open, setOpen] = useState(false);
  const [collegeId, setCollegeId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [departmentId, setDepartmentId] = useState('');
  const [courseId, setCourseId] = useState('');

  useEffect(() => {
    loadUsers();
    loadDepartments();
    loadCourses();
  }, []);

  const loadUsers = async () => {
    try {
      const response = await axiosInstance.get('/admin/users');
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to load users');
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await axiosInstance.get('/admin/departments');
      setDepartments(response.data);
    } catch (error) {
      toast.error('Failed to load departments');
    }
  };

  const loadCourses = async () => {
    try {
      const response = await axiosInstance.get('/admin/courses');
      setCourses(response.data);
    } catch (error) {
      toast.error('Failed to load courses');
    }
  };

  const handleCreate = async () => {
    try {
      await axiosInstance.post('/admin/users', {
        college_id: collegeId,
        name,
        email,
        password,
        role,
        department_id: departmentId || null,
        course_id: courseId || null
      });
      toast.success('User created successfully');
      setOpen(false);
      resetForm();
      loadUsers();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create user');
    }
  };

  const resetForm = () => {
    setCollegeId('');
    setName('');
    setEmail('');
    setPassword('');
    setRole('student');
    setDepartmentId('');
    setCourseId('');
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axiosInstance.delete(`/admin/users/${userId}`);
        toast.success('User deleted successfully');
        loadUsers();
      } catch (error) {
        toast.error('Failed to delete user');
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="users-title">Users Management</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-button">Add User</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create User</DialogTitle>
              <DialogDescription>Add a new admin, faculty or student to the system</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>College ID</Label>
                <Input value={collegeId} onChange={(e) => setCollegeId(e.target.value)} placeholder="e.g., STU2050" data-testid="user-college-id-input" />
              </div>
              <div>
                <Label>Full Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., John Doe" data-testid="user-name-input" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g., john@college.edu" data-testid="user-email-input" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" data-testid="user-password-input" />
              </div>
              <div>
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="faculty">Faculty</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Department</Label>
                <Select value={departmentId} onValueChange={setDepartmentId}>
                  <SelectTrigger data-testid="user-dept-select">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {role === 'student' && (
                <div>
                  <Label>Course</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger data-testid="user-course-select">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={handleCreate} className="w-full" data-testid="create-user-button">Create User</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>College ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} data-testid={`user-row-${user.college_id}`}>
                <td><span className="badge badge-info">{user.college_id}</span></td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`badge ${user.role === 'admin' ? 'badge-danger' : user.role === 'faculty' ? 'badge-warning' : 'badge-success'}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800 text-sm font-medium" data-testid={`delete-user-${user.college_id}`}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AdminDashboard({ user, onLogout }) {
  return (
    <div className="dashboard-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/departments" element={<Departments />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/subjects" element={<Subjects />} />
          <Route path="/users" element={<Users />} />
        </Routes>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { axiosInstance } from '../App';
import { toast } from 'sonner';
import { LayoutDashboard, ClipboardCheck, BarChart3, Mail, LogOut } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

function Sidebar({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { path: '/faculty', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/faculty/attendance', label: 'Mark Attendance', icon: ClipboardCheck },
    { path: '/faculty/reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <div className="sidebar">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">Faculty Panel</h2>
        <p className="text-sm text-gray-500 mt-1">{user.name}</p>
      </div>

      <nav>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
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
  const [subjects, setSubjects] = useState([]);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [subjectsRes, sessionsRes] = await Promise.all([
        axiosInstance.get('/admin/subjects'),
        axiosInstance.get('/faculty/sessions')
      ]);
      
      const mySubjects = subjectsRes.data.filter(s => s.faculty_id);
      setSubjects(mySubjects);
      setSessions(sessionsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8" data-testid="faculty-dashboard-title">Faculty Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card data-testid="assigned-subjects-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Assigned Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{subjects.length}</div>
          </CardContent>
        </Card>

        <Card data-testid="total-sessions-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{sessions.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sessions yet</p>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 10).map((session) => {
                const subject = subjects.find(s => s.id === session.subject_id);
                return (
                  <div key={session.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg" data-testid={`session-${session.id}`}>
                    <div>
                      <p className="font-medium">{subject?.name || 'Unknown Subject'}</p>
                      <p className="text-sm text-gray-500">{new Date(session.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MarkAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [sessionId, setSessionId] = useState('');
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await axiosInstance.get('/admin/subjects');
      const mySubjects = response.data.filter(s => s.faculty_id);
      setSubjects(mySubjects);
    } catch (error) {
      toast.error('Failed to load subjects');
    }
  };

  const loadStudents = async (subjectId) => {
    try {
      const subject = subjects.find(s => s.id === subjectId);
      if (!subject) return;

      const courseRes = await axiosInstance.get('/admin/courses');
      const course = courseRes.data.find(c => c.id === subject.course_id);
      
      if (course) {
        const studentsRes = await axiosInstance.get(`/courses/${course.id}/students`);
        setStudents(studentsRes.data);
        
        // Initialize attendance as present for all
        const initialAttendance = {};
        studentsRes.data.forEach(student => {
          initialAttendance[student.id] = 'present';
        });
        setAttendance(initialAttendance);
      }
    } catch (error) {
      toast.error('Failed to load students');
    }
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    loadStudents(subjectId);
  };

  const createSession = async () => {
    if (!selectedSubject || !date) {
      toast.error('Please select subject and date');
      return;
    }

    try {
      const response = await axiosInstance.post('/faculty/sessions', {
        subject_id: selectedSubject,
        date: date
      });
      setSessionId(response.data.id);
      toast.success('Session created successfully');
    } catch (error) {
      toast.error('Failed to create session');
    }
  };

  const handleSubmitAttendance = async () => {
    if (!sessionId) {
      await createSession();
      return;
    }

    setLoading(true);
    try {
      const promises = students.map(student => 
        axiosInstance.post('/faculty/attendance', {
          session_id: sessionId,
          student_id: student.id,
          subject_id: selectedSubject,
          status: attendance[student.id]
        })
      );

      await Promise.all(promises);
      toast.success('Attendance marked successfully');
      
      // Reset
      setSelectedSubject('');
      setStudents([]);
      setSessionId('');
      setAttendance({});
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to mark attendance');
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8" data-testid="mark-attendance-title">Mark Attendance</h1>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Select Subject</Label>
              <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                <SelectTrigger data-testid="subject-select">
                  <SelectValue placeholder="Choose a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name} ({subject.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="date-input" />
            </div>
          </div>
        </CardContent>
      </Card>

      {students.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Students List</CardTitle>
            <Button onClick={handleSubmitAttendance} disabled={loading} data-testid="submit-attendance-button">
              {loading ? 'Submitting...' : 'Submit Attendance'}
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.map((student) => (
                <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg" data-testid={`student-${student.college_id}`}>
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-gray-500">{student.college_id}</p>
                  </div>
                  <button
                    onClick={() => toggleAttendance(student.id)}
                    className={`px-4 py-2 rounded-lg font-medium ${attendance[student.id] === 'present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                    data-testid={`toggle-${student.college_id}`}
                  >
                    {attendance[student.id] === 'present' ? 'Present' : 'Absent'}
                  </button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Reports() {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const response = await axiosInstance.get('/admin/subjects');
      const mySubjects = response.data.filter(s => s.faculty_id);
      setSubjects(mySubjects);
    } catch (error) {
      toast.error('Failed to load subjects');
    }
  };

  const loadReport = async (subjectId) => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(`/faculty/reports/${subjectId}`);
      setReport(response.data);
    } catch (error) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId) => {
    setSelectedSubject(subjectId);
    loadReport(subjectId);
  };

  const handleSendAlerts = async () => {
    if (!selectedSubject) return;

    try {
      const response = await axiosInstance.post(`/faculty/send-alerts/${selectedSubject}`);
      toast.success(response.data.message);
    } catch (error) {
      toast.error('Failed to send alerts');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900" data-testid="reports-title">Attendance Reports</h1>
        {report && (
          <Button onClick={handleSendAlerts} data-testid="send-alerts-button">
            <Mail className="w-4 h-4 mr-2" />
            Send Low Attendance Alerts
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <Label>Select Subject</Label>
          <Select value={selectedSubject} onValueChange={handleSubjectChange}>
            <SelectTrigger data-testid="report-subject-select">
              <SelectValue placeholder="Choose a subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>{subject.name} ({subject.code})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {loading && <div className="text-center py-8">Loading report...</div>}

      {report && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>{report.subject.name} - Attendance Report</CardTitle>
            <p className="text-sm text-gray-500 mt-2">Total Classes: {report.total_classes}</p>
          </CardHeader>
          <CardContent>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>College ID</th>
                    <th>Student Name</th>
                    <th>Total Classes</th>
                    <th>Attended</th>
                    <th>Percentage</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.students.map((student) => (
                    <tr key={student.student_id} data-testid={`report-row-${student.college_id}`}>
                      <td><span className="badge badge-info">{student.college_id}</span></td>
                      <td>{student.student_name}</td>
                      <td>{student.total_classes}</td>
                      <td>{student.attended}</td>
                      <td>
                        <span className={`font-bold ${student.percentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                          {student.percentage}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${student.eligible ? 'badge-success' : 'badge-danger'}`}>
                          {student.eligible ? 'Eligible' : 'Not Eligible'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function FacultyDashboard({ user, onLogout }) {
  return (
    <div className="dashboard-layout">
      <Sidebar user={user} onLogout={onLogout} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/attendance" element={<MarkAttendance />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </div>
    </div>
  );
}

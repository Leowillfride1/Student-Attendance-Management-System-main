import { useState, useEffect } from 'react';
import { axiosInstance } from '../App';
import { toast } from 'sonner';
import { LogOut, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function StudentDashboard({ user, onLogout }) {
  const [attendance, setAttendance] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [attendanceRes, eligibilityRes] = await Promise.all([
        axiosInstance.get('/student/attendance'),
        axiosInstance.get('/student/eligibility')
      ]);
      
      setAttendance(attendanceRes.data.subjects);
      setEligibility(eligibilityRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  const overallPercentage = attendance.length > 0
    ? (attendance.reduce((sum, s) => sum + s.percentage, 0) / attendance.length).toFixed(2)
    : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900" data-testid="student-dashboard-title">Student Portal</h1>
            <p className="text-sm text-gray-500">{user.name} ({user.college_id})</p>
          </div>
          <button onClick={onLogout} className="btn-secondary" data-testid="logout-button">
            <LogOut className="w-4 h-4 mr-2 inline" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card data-testid="overall-attendance-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Overall Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{overallPercentage}%</div>
            </CardContent>
          </Card>

          <Card data-testid="eligible-subjects-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Eligible Subjects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {eligibility?.eligible_subjects || 0}/{eligibility?.total_subjects || 0}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="exam-eligibility-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-500">Exam Eligibility</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                {eligibility?.overall_eligible ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-600 mr-2" />
                    <span className="text-xl font-bold text-green-600">Eligible</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-600 mr-2" />
                    <span className="text-xl font-bold text-red-600">Not Eligible</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Low Attendance Alert */}
        {attendance.some(s => s.percentage < 75) && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r-lg" data-testid="low-attendance-alert">
            <div className="flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">Low Attendance Warning</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  You have subjects with attendance below 75%. Please attend classes regularly to maintain eligibility.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        <Card>
          <CardHeader>
            <CardTitle>Subject-wise Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            {attendance.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No attendance records found</p>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Total Classes</th>
                      <th>Attended</th>
                      <th>Percentage</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((subject) => (
                      <tr key={subject.subject_id} data-testid={`subject-row-${subject.subject_code}`}>
                        <td><span className="badge badge-info">{subject.subject_code}</span></td>
                        <td>{subject.subject_name}</td>
                        <td>{subject.total_classes}</td>
                        <td>{subject.attended}</td>
                        <td>
                          <span className={`font-bold ${subject.percentage >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                            {subject.percentage}%
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${subject.eligible ? 'badge-success' : 'badge-danger'}`}>
                            {subject.eligible ? 'Eligible' : 'Not Eligible'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Section */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Attendance Policy</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Minimum 75% attendance required for exam eligibility</li>
                <li>• Attend classes regularly to maintain good standing</li>
                <li>• Contact faculty for any attendance-related queries</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

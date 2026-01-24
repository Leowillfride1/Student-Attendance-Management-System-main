import { useState } from 'react';
import axios from 'axios';
import { API } from '../App';
import { toast } from 'sonner';
import { GraduationCap } from 'lucide-react';

export default function Login({ onLogin }) {
  const [collegeId, setCollegeId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, {
        college_id: collegeId,
        password: password,
      });

      onLogin(response.data.user, response.data.token);
      toast.success('Login successful!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-3 rounded-xl mb-4">
              <GraduationCap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900" data-testid="login-title">Student Attendance</h1>
            <p className="text-gray-500 mt-2">College Management System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">College ID</label>
              <input
                type="text"
                value={collegeId}
                onChange={(e) => setCollegeId(e.target.value)}
                className="form-input"
                placeholder="Enter your college ID"
                required
                data-testid="college-id-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Enter your password"
                required
                data-testid="password-input"
              />
            </div>

            <button
              type="submit"
              className="w-full btn-primary py-3 text-base"
              disabled={loading}
              data-testid="login-button"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <p className="text-xs text-gray-600 font-medium mb-2">Demo Credentials:</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p><strong>Admin:</strong> ADMIN001 / admin123</p>
              <p><strong>Faculty:</strong> FAC1001 / faculty123</p>
              <p><strong>Student:</strong> STU2001 / student123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

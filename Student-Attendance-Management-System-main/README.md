# Student Attendance Management System

A comprehensive web-based attendance tracking system built for college-level institutions. Built with **FastAPI (Python)**, **React**, and **MongoDB**.

## 🎯 Purpose

This system serves as an educational, open-source attendance management platform designed for small to medium-sized colleges. It provides core functionality for tracking student attendance, managing courses, and ensuring exam eligibility based on attendance thresholds.

## ✨ Features

### Admin Features
- Manage departments, courses, and subjects
- Create and manage student and faculty accounts
- Assign faculty to subjects
- View overall statistics and reports

### Faculty Features
- Mark attendance for assigned subjects
- View and manage attendance records
- Generate detailed attendance reports per subject
- Send email alerts to students with low attendance

### Student Features
- View personal attendance by subject
- Check exam eligibility status (75% minimum)
- Receive low attendance alerts
- View overall attendance percentage

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Frontend**: React 19 with Shadcn/UI components
- **Database**: MongoDB
- **Authentication**: JWT-based with College ID login
- **Email**: SMTP for low attendance alerts

## 📋 Prerequisites

- Python 3.11+
- Node.js 18+ and Yarn
- MongoDB (running locally or remotely)

## 🚀 Setup Instructions

### 1. Clone and Navigate to Project

```bash
cd /app
```

### 2. Backend Setup

```bash
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
# Edit backend/.env file with your settings:
# - MONGO_URL: Your MongoDB connection string
# - SMTP_USER and SMTP_PASSWORD: For email alerts (optional)

# Seed the database with demo data
python seed_data.py

# Start the backend server (handled by supervisor in deployment)
# For local development:
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
yarn install

# Configure environment variables
# Edit frontend/.env file:
# - REACT_APP_BACKEND_URL: Your backend URL

# Start the development server
yarn start
```

### 4. Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:8001
- API Documentation: http://localhost:8001/docs

## 👤 Demo Credentials

The seed script creates demo users for testing:

**Admin:**
- College ID: `ADMIN001`
- Password: `admin123`

**Faculty:**
- College ID: `FAC1001`, `FAC1002`, `FAC1003`, `FAC1004`, `FAC1005`
- Password: `faculty123`

**Students:**
- College ID: `STU2001` to `STU2030`
- Password: `student123`

## 📊 Database Structure

### Collections:
- `users` - Admin, faculty, and student accounts
- `departments` - Academic departments
- `courses` - Course information
- `subjects` - Subject details with faculty assignments
- `class_sessions` - Individual class sessions
- `attendance_records` - Student attendance records

## 🔐 Authentication

The system uses JWT-based authentication with College ID login:
1. Users log in with their College ID and password
2. System returns a JWT token valid for 7 days
3. Token is stored in localStorage and sent with all API requests

## 📧 Email Alerts (Optional)

To enable email alerts for low attendance:

1. Update `backend/.env` with SMTP credentials:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

2. Faculty can send alerts from the Reports page
3. Students with <75% attendance will receive email notifications

## 📈 Attendance Eligibility Logic

- **Minimum Requirement**: 75% attendance
- **Calculation**: (Classes Attended / Total Classes) × 100
- **Eligibility**: Students must maintain ≥75% in all subjects for exam eligibility

## 🎨 UI/UX Design

- Clean, modern interface with Space Grotesk font
- Responsive design for desktop and mobile
- Color-coded status indicators (green=eligible, red=not eligible)
- Shadcn/UI components for consistent design

## 📁 Project Structure

```
/app/
├── backend/
│   ├── server.py           # FastAPI application
│   ├── seed_data.py        # Database seeding script
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables
├── frontend/
│   ├── src/
│   │   ├── pages/         # React page components
│   │   ├── components/    # Reusable UI components
│   │   ├── App.js         # Main application
│   │   └── App.css        # Styles
│   ├── package.json       # Node dependencies
│   └── .env              # Frontend environment variables
└── README.md             # This file
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Admin
- `GET/POST /api/admin/departments` - Manage departments
- `GET/POST /api/admin/courses` - Manage courses
- `GET/POST /api/admin/subjects` - Manage subjects
- `GET/POST/PUT/DELETE /api/admin/users` - Manage users
- `PUT /api/admin/subjects/{id}/assign-faculty` - Assign faculty

### Faculty
- `GET/POST /api/faculty/sessions` - Manage class sessions
- `GET/POST/PUT /api/faculty/attendance` - Mark attendance
- `GET /api/faculty/reports/{subject_id}` - Get attendance reports
- `POST /api/faculty/send-alerts/{subject_id}` - Send email alerts

### Student
- `GET /api/student/attendance` - View personal attendance
- `GET /api/student/eligibility` - Check exam eligibility

## 🧪 Testing

Test the system using the demo credentials provided above:

1. **Admin**: Create departments, courses, subjects, and users
2. **Faculty**: Mark attendance and generate reports
3. **Student**: View attendance and eligibility status

## 📝 Notes

- This is an **educational project** for academic use
- Not intended for production deployment without additional security hardening
- Designed for small to medium-sized institutions
- Demo data includes 2 departments, 3 courses, 5 subjects, 5 faculty, and 30 students

## 🤝 Contributing

This is an open-source educational project. Feel free to:
- Report issues
- Suggest features
- Submit pull requests
- Use as a learning resource

## 📄 License

This project is open-source and available for educational purposes.

## 🆘 Troubleshooting

### Backend not starting?
- Check MongoDB is running: `sudo systemctl status mongod`
- Verify environment variables in `backend/.env`
- Check logs: `tail -f /var/log/supervisor/backend.err.log`

### Frontend not connecting?
- Verify `REACT_APP_BACKEND_URL` in `frontend/.env`
- Check backend is running on port 8001
- Clear browser cache and restart

### Database issues?
- Re-run seed script: `python backend/seed_data.py`
- Check MongoDB connection string in `.env`

## 📧 Support

For questions or issues, please refer to the project documentation or create an issue in the repository.

---

**Built with FastAPI + React + MongoDB**  
*Educational Open-Source Project*

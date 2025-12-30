# Escape Matrix - Habit Tracking App

A production-ready full-stack habit tracking application built with FastAPI backend, React (Next.js) frontend, Clerk authentication, and Supabase (Postgres) database.

## 🚀 Features

### Authentication
- **Clerk Google OAuth** - One-tap sign-in with Google
- Secure JWT-based authentication for all API requests
- Protected routes with middleware

### Onboarding Experience
- **3-Screen Carousel** - Welcoming onboarding flow
- Smooth animations and professional UI
- Progressive dots indicator

### Task Management
- **Create Tasks** with detailed information:
  - Task name and description
  - Task type: Short-term or Long-term
  - Priority using Eisenhower Matrix (4 quadrants)
  - Status: To-Do, Pending, Completed
  
- **Short-term Tasks** - Daily habits with:
  - Custom repetition days (select specific weekdays)
  - Time scheduling
  
- **Long-term Goals** - Big picture planning without repetition

### Dashboard
- **Kanban-style Layout** - Tasks organized in 3 columns:
  - To-Do
  - Pending  
  - Completed
- **Responsive Design**:
  - Desktop: Sidebar visible with full dashboard
  - Tablet: Optimized layout
  - Mobile: Burger menu with app-like experience

### Eisenhower Matrix Integration
Tasks are prioritized using the proven Eisenhower Matrix:
- 🔴 **Urgent & Important** - Do first
- 🟠 **Urgent Only** - Schedule
- 🔵 **Important Only** - Delegate
- ⚪ **Low Priority** - Eliminate

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern, fast Python web framework
- **Uvicorn** - ASGI server
- **Supabase (Postgres)** - Serverless database with RLS
- **Pydantic** - Data validation
- **PyJWT** - JWT token verification

### Frontend
- **Next.js 14** - React framework with App Router
- **Clerk** - Authentication platform
- **Tailwind CSS** - Utility-first CSS
- **shadcn/ui** - High-quality React components
- **Lucide Icons** - Beautiful icon library

### Database
- **Supabase Postgres** with:
  - Row Level Security (RLS)
  - Automatic timestamps
  - Indexed queries for performance

## 📁 Project Structure

```
/app/
├── backend/
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── create_table.sql        # Database schema
│   └── init_db.py             # Database initialization
│
├── app/
│   ├── page.js                # Login page
│   ├── layout.js              # Root layout with Clerk
│   ├── onboarding/page.js     # Onboarding carousel
│   ├── dashboard/page.js      # Main dashboard
│   └── long-term/page.js      # Long-term goals
│
├── components/
│   ├── TaskCard.js            # Task card component
│   ├── TaskFormModal.js       # Task creation modal
│   └── ui/                    # shadcn components
│
├── middleware.js              # Clerk authentication middleware
└── .env                       # Environment variables
```

## 🔧 Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Yarn package manager
- Supabase account
- Clerk account

### Environment Variables

Already configured in `/app/.env`:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YWNjdXJhdGUtdGFoci0xNC5jbGVyay5hY2NvdW50cy5kZXYk
CLERK_SECRET_KEY=sk_test_GSoql3LhPPt565kBxeAsFxU09B4BwicvvqMP4Jejq1

# Supabase Database
SUPABASE_URL=https://bqwkekylncfqzyiltqgj.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# FastAPI Backend
FASTAPI_URL=http://localhost:8000

# Next.js
NEXT_PUBLIC_BASE_URL=https://task-master-444.preview.emergentagent.com
```

### Database Schema

The database table has been created in Supabase with the following schema:

```sql
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    task_name TEXT NOT NULL,
    task_description TEXT,
    agent_description TEXT,
    task_type TEXT NOT NULL CHECK (task_type IN ('LONG_TERM', 'SHORT_TERM')),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('TO-DO', 'PENDING', 'COMPLETED')),
    priority TEXT NOT NULL DEFAULT 'NOTURGENT-NOTIMPORTANT',
    repetition_days TEXT[],
    repetition_time TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_task_type ON tasks(task_type);
```

### Running the Application

Both services are managed by **supervisor** and are already running:

```bash
# Check service status
sudo supervisorctl status

# FastAPI Backend: http://localhost:8000
# Next.js Frontend: http://localhost:3000

# Restart services if needed
sudo supervisorctl restart fastapi
sudo supervisorctl restart nextjs
```

## 🔌 API Endpoints

Base URL: `http://localhost:8000`

### Authentication
All endpoints require `Authorization: Bearer <clerk_jwt>` header.

### Endpoints

#### `GET /`
Health check endpoint.

**Response:**
```json
{
  "message": "Escape Matrix API is running",
  "status": "healthy",
  "version": "1.0.0"
}
```

#### `POST /api/tasks`
Create a new task.

**Request Body:**
```json
{
  "task_name": "Morning Exercise",
  "task_description": "30 minutes workout",
  "task_type": "SHORT_TERM",
  "priority": "URGENT-IMPORTANT",
  "status": "PENDING",
  "repetition_days": ["Monday", "Wednesday", "Friday"],
  "repetition_time": "07:00"
}
```

**Response:** Created task object

#### `GET /api/tasks`
Get all tasks for the authenticated user, grouped by status.

**Response:**
```json
{
  "TO-DO": [...],
  "PENDING": [...],
  "COMPLETED": [...]
}
```

#### `GET /api/tasks/long-term`
Get all long-term goals for the authenticated user.

**Response:** Array of long-term tasks

#### `PUT /api/tasks/{task_id}`
Update a task.

**Request Body:**
```json
{
  "status": "COMPLETED"
}
```

**Response:** Updated task object

#### `DELETE /api/tasks/{task_id}`
Delete a task.

**Response:**
```json
{
  "message": "Task deleted successfully",
  "task_id": "uuid"
}
```

## 🎨 UI/UX Features

### Responsive Design
- **Mobile**: Full mobile app experience with burger menu
- **Tablet**: Optimized two-column layout
- **Desktop**: Full dashboard with visible sidebar

### Task Cards
Each task card displays:
- Task title
- Description (truncated)
- Priority badge with color coding
- Task type (Long-term/Short-term)
- Repetition schedule (if applicable)
- Action buttons (Complete, Delete)

### Color Scheme
- **Primary**: Purple gradient (900-600)
- **Secondary**: Indigo
- **Accent**: Blue
- **Status Colors**:
  - To-Do: Blue
  - Pending: Orange
  - Completed: Green

## 🔒 Security Features

1. **JWT Authentication** - All API requests verified with Clerk tokens
2. **Row Level Security** - Database policies enforce user isolation
3. **CORS Configuration** - Controlled cross-origin requests
4. **Input Validation** - Pydantic models validate all inputs
5. **Protected Routes** - Middleware guards all authenticated pages

## 🚦 User Flow

1. **Landing Page** → Google OAuth sign-in via Clerk
2. **Onboarding** → 3-screen carousel explaining features
3. **Dashboard** → View tasks in Kanban columns
4. **Create Task** → Modal form with all options
5. **Manage Tasks** → Complete, reopen, or delete tasks
6. **Long-term Goals** → Separate view for big-picture planning

## 📱 Mobile Experience

The app is fully responsive and provides a native-like mobile experience:
- Touch-optimized buttons and cards
- Swipeable carousel
- Collapsible sidebar (burger menu)
- Optimized for one-handed use
- Fast loading and smooth animations

## 🧪 Testing

### Backend Testing
```bash
# Test health endpoint
curl http://localhost:8000/

# Test protected endpoint (will fail without auth)
curl http://localhost:8000/api/tasks
```

### Frontend Testing
- Visit `http://localhost:3000`
- Sign in with Google
- Complete onboarding
- Create tasks
- Test all CRUD operations

## 🔄 Development Workflow

### Making Changes

#### Backend Changes
```bash
# Edit /app/backend/main.py
# FastAPI has hot reload enabled, changes reflect automatically
```

#### Frontend Changes
```bash
# Edit files in /app/app/ or /app/components/
# Next.js has Fast Refresh, changes reflect automatically
```

#### Restart Services
```bash
# Only needed for environment variable changes
sudo supervisorctl restart fastapi
sudo supervisorctl restart nextjs
```

## 📊 Database Management

View your data in Supabase:
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to **Table Editor**
4. View the `tasks` table

## 🎯 Future Enhancements

Potential features to add:
- Task analytics and progress charts
- Streak tracking
- Team collaboration
- Task categories and tags
- Notifications and reminders
- Dark mode
- Export data functionality
- Mobile native apps (React Native)

## 🐛 Troubleshooting

### FastAPI not starting
```bash
# Check logs
tail -f /var/log/supervisor/fastapi.out.log
tail -f /var/log/supervisor/fastapi.err.log

# Restart service
sudo supervisorctl restart fastapi
```

### Next.js errors
```bash
# Check logs
tail -f /var/log/supervisor/nextjs.out.log

# Restart service
sudo supervisorctl restart nextjs
```

### Database connection issues
- Verify Supabase credentials in `.env`
- Check if table exists in Supabase dashboard
- Ensure RLS policies are configured correctly

### Authentication issues
- Verify Clerk keys in `.env`
- Check Clerk dashboard for application status
- Ensure Google OAuth is enabled in Clerk

## 📝 License

MIT License - Feel free to use this project for learning or commercial purposes.

## 👥 Support

For issues or questions:
1. Check the logs in `/var/log/supervisor/`
2. Review Supabase dashboard for database issues
3. Check Clerk dashboard for authentication issues

---

Built with ❤️ using FastAPI, Next.js, Clerk, and Supabase

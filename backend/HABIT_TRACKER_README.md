# Daily Habit Tracker - Setup Instructions

## Overview
The Daily Habit Tracker feature has been successfully implemented! It includes:
- ✅ Backend API endpoints for habits and completions
- ✅ Frontend page with Chart.js line chart
- ✅ Monthly checkbox grid for tracking habits
- ✅ Dynamic chart that updates in real-time when you check/uncheck habits
- ✅ Navigation links added to all pages

## Database Setup Required

Before you can use the Daily Habit Tracker, you need to run the SQL schema to create the required database tables.

### Steps:

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://supabase.com/dashboard
   - Navigate to the SQL Editor

2. **Run the Schema**
   - Copy the contents of `/app/backend/daily_habits_schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to create the tables

3. **Verify Tables**
   After running the SQL, you should have these new tables:
   - `daily_habits` - Stores habit names and settings
   - `habit_completions` - Stores which habits were completed on which dates

## Features

### Line Chart (Progress Chart)
- Shows daily completion percentage
- Dynamically updates when you check/uncheck habits
- Higher score when more habits are completed in a day
- Powered by Chart.js

### Habit Grid
- One row per habit
- Columns for each day of the current month
- Checkboxes to mark habits as complete
- Current day is highlighted
- Color-coded rows for visual appeal

### Habit Management
- Add new habits with the "+ Add Habit" button
- Delete habits with the trash icon
- Habits are color-coded automatically

## API Endpoints

All endpoints require Clerk JWT authentication:

- `GET /api/habits` - Get all habits for the user
- `POST /api/habits` - Create a new habit
- `DELETE /api/habits/{habit_id}` - Delete a habit
- `GET /api/habits/completions/{year}/{month}` - Get completions for a month
- `POST /api/habits/completions` - Toggle a habit completion

## Files Created/Modified

### New Files:
- `/app/backend/daily_habits_schema.sql` - Database schema
- `/app/app/habits/page.js` - Frontend page
- `/app/backend/HABIT_TRACKER_README.md` - This file

### Modified Files:
- `/app/backend/main.py` - Added habit endpoints
- `/app/app/dashboard/page.js` - Added navigation link
- `/app/app/long-term/page.js` - Added navigation link
- `/app/app/ai/page.js` - Added navigation link
- `/app/app/call-me/page.js` - Added navigation link
- `/app/package.json` - Added chart.js and react-chartjs-2

## Usage

1. Navigate to "Daily Habit Tracker" from the sidebar
2. Click "+ Add Habit" to create your first habit
3. Check the boxes to mark habits as complete for each day
4. Watch the chart update in real-time!

## Technical Details

- **Frontend**: React with Chart.js for visualization
- **Backend**: FastAPI with Supabase
- **Real-time Updates**: Chart recalculates on every checkbox change
- **Month-wise View**: Automatically shows correct number of days (28-31)
- **Score Calculation**: (Completed habits / Total habits) * 100 for each day

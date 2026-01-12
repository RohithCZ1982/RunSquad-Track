# RunSquad - Running Club Tracker

A full-stack application for tracking running progress and managing running clubs.

## Features

- ✅ User authentication (Login/Register with email)
- ✅ Create and join running clubs
- ✅ Club features: Name, Description, Location (Optional)
- ✅ Track running progress (distance, duration, speed in km/h)
- ✅ My Progress screen with statistics
- ✅ Display club members
- ✅ Schedule runs within clubs
- ✅ Activity feed for clubs

## Tech Stack

- **Frontend**: React 18 with React Router
- **Backend**: Python (Flask) with Flask-SQLAlchemy
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Deployment**: Render (Backend, Frontend, Database)

## Project Structure

```
RunSquad-Track/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── routes/
│   │       ├── auth.py
│   │       ├── clubs.py
│   │       ├── runs.py
│   │       └── users.py
│   ├── requirements.txt
│   └── run.py
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── utils/
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
└── render.yaml
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- PostgreSQL (local or remote)
- pip and npm

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv

# On Windows:
venv\Scripts\activate

# On Mac/Linux:
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create `.env` file in backend directory:
```env
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here
DATABASE_URL=postgresql://user:password@localhost/runsquad
```

5. Set up PostgreSQL database:
```sql
CREATE DATABASE runsquad;
```

6. Run the server:
```bash
python run.py
```

The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Run the development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Clubs
- `GET /api/clubs` - Get all clubs
- `POST /api/clubs` - Create new club (protected)
- `GET /api/clubs/:id` - Get club details (protected)
- `POST /api/clubs/:id/join` - Join a club (protected)

### Runs
- `POST /api/runs/track` - Track a run (protected)
- `GET /api/runs/my-progress` - Get user's running progress (protected)
- `POST /api/runs/schedule` - Schedule a run in a club (protected)
- `GET /api/runs/schedule/:club_id` - Get scheduled runs for a club (protected)

### Users
- `GET /api/users/activity-feed/:club_id` - Get activity feed for a club (protected)

## Deployment to Render

### Quick Deploy (Recommended)

1. **Push to GitHub**: 
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. **Deploy on Render**:
   - Go to https://dashboard.render.com
   - Click **"New +"** → **"Blueprint"**
   - Connect your GitHub repository
   - Render will auto-detect `render.yaml`
   - Click **"Apply"** to deploy all services

3. **Set Frontend API URL** (After backend deploys):
   - Go to `runsquad-frontend` service → Environment
   - Add: `REACT_APP_API_URL` = `https://runsquad-backend.onrender.com/api`
   - (Replace with your actual backend URL)
   - Service will auto-redeploy

### What Gets Created

- ✅ **PostgreSQL Database** (`runsquad-db`) - Auto-configured
- ✅ **Backend Service** (`runsquad-backend`) - Python web service
- ✅ **Frontend Service** (`runsquad-frontend`) - Static React site

### Environment Variables (Auto-configured)

- `DATABASE_URL` - Automatically linked from database
- `SECRET_KEY` - Auto-generated
- `JWT_SECRET_KEY` - Auto-generated
- `REACT_APP_API_URL` - **Set manually** after backend deploys

📖 **See `QUICK_DEPLOY.md` for detailed step-by-step instructions!**

## Convert to Android App

Use Capacitor to convert the web app to Android:

1. Install Capacitor in frontend directory:
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
```

2. Initialize Capacitor:
```bash
npx cap init
```

3. Add Android platform:
```bash
npx cap add android
```

4. Build the React app:
```bash
npm run build
```

5. Sync with Capacitor:
```bash
npx cap sync
```

6. Open in Android Studio:
```bash
npx cap open android
```

7. Build and run from Android Studio

**Note**: You'll need to update the API URL in the Android app to point to your deployed Render backend URL.

## Environment Variables

### Backend (.env)
- `SECRET_KEY` - Flask secret key
- `JWT_SECRET_KEY` - JWT signing key
- `DATABASE_URL` - PostgreSQL connection string

### Frontend (.env)
- `REACT_APP_API_URL` - Backend API URL

## Features Overview

### User Authentication
- Secure registration and login
- JWT-based authentication
- Password hashing with Werkzeug

### Club Management
- Create clubs with name, description, and optional location
- Join existing clubs
- View all club members
- See member count

### Running Tracking
- Track runs with distance (km) and duration (minutes)
- Automatic speed calculation (km/h)
- Add notes to runs
- View running history
- Statistics: Total runs, total distance, average speed

### Club Features
- **Members**: View all club members with their details
- **Scheduled Runs**: Schedule group runs with title, description, date, and location
- **Activity Feed**: Real-time feed showing all club activities (runs, joins, scheduled runs)

## Development

### Running Tests
```bash
# Backend tests (if added)
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Database Migrations
The app uses Flask-SQLAlchemy with automatic table creation. For production, consider using Flask-Migrate for database migrations.

## License

MIT License

## Contributing

Feel free to submit issues and enhancement requests!

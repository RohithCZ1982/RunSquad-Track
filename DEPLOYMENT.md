# RunSquad Deployment Guide for Render

This guide will help you deploy RunSquad to Render step by step.

## Prerequisites

1. A GitHub account
2. A Render account (sign up at https://render.com)
3. Your code pushed to a GitHub repository

## Step-by-Step Deployment

### Step 1: Push Code to GitHub

1. Initialize git (if not already done):
```bash
git init
git add .
git commit -m "Initial commit - RunSquad app"
```

2. Create a new repository on GitHub

3. Push your code:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Render

1. **Log in to Render**: Go to https://dashboard.render.com

2. **Create New Blueprint**: 
   - Click "New +" button
   - Select "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`

3. **Review Services**: Render will create 3 services:
   - **runsquad-db**: PostgreSQL database
   - **runsquad-backend**: Python web service
   - **runsquad-frontend**: Static site

4. **Apply Configuration**: Click "Apply" to deploy

### Step 3: Environment Variables (Auto-configured)

The following environment variables are automatically configured:
- `DATABASE_URL` - Automatically linked from the database service
- `SECRET_KEY` - Auto-generated
- `JWT_SECRET_KEY` - Auto-generated
- `REACT_APP_API_URL` - Automatically set from backend service URL

### Step 4: Wait for Deployment

1. Render will:
   - Create the PostgreSQL database
   - Build and deploy the backend
   - Build and deploy the frontend
   - Link all services together

2. This process takes about 5-10 minutes

### Step 5: Access Your Application

1. Once deployed, you'll get URLs:
   - **Backend**: `https://runsquad-backend.onrender.com`
   - **Frontend**: `https://runsquad-frontend.onrender.com`

2. Visit the frontend URL to use your app!

## Manual Configuration (If Needed)

If you need to manually configure services:

### Backend Service

1. **Service Type**: Web Service
2. **Environment**: Python 3
3. **Build Command**: `pip install -r backend/requirements.txt`
4. **Start Command**: `cd backend && gunicorn --bind 0.0.0.0:$PORT run:app`
5. **Environment Variables**:
   - `DATABASE_URL` - From database service
   - `SECRET_KEY` - Generate random string
   - `JWT_SECRET_KEY` - Generate random string
   - `PORT` - Automatically set by Render

### Frontend Service

1. **Service Type**: Static Site
2. **Build Command**: `cd frontend && npm install && npm run build`
3. **Publish Directory**: `frontend/build`
4. **Environment Variables**:
   - `REACT_APP_API_URL` - Your backend URL (e.g., `https://runsquad-backend.onrender.com/api`)

### Database Service

1. **Service Type**: PostgreSQL
2. **Plan**: Starter (Free tier available)
3. **Database Name**: `runsquad`
4. **User**: `runsquad_user`

## Troubleshooting

### Backend Issues

1. **Check Logs**: Go to your backend service → Logs
2. **Common Issues**:
   - Database connection errors: Check `DATABASE_URL` is set correctly
   - Import errors: Check `requirements.txt` has all dependencies
   - Port issues: Make sure using `$PORT` environment variable

### Frontend Issues

1. **Check Build Logs**: Go to your frontend service → Logs
2. **Common Issues**:
   - Build fails: Check `package.json` dependencies
   - API connection errors: Verify `REACT_APP_API_URL` is correct
   - CORS errors: Check backend CORS configuration

### Database Issues

1. **Connection String**: Should be in format:
   ```
   postgresql://user:password@host:port/database
   ```
2. **Tables Not Created**: The app auto-creates tables on first run

## Post-Deployment

### Initialize Database

The database tables are automatically created when the backend starts. If you need to manually initialize:

1. Go to backend service → Shell
2. Run:
```bash
cd backend
python
>>> from app import create_app
>>> from app.database import db
>>> app = create_app()
>>> with app.app_context():
...     db.create_all()
```

### Update API URL

If you need to update the frontend API URL:

1. Go to frontend service → Environment
2. Update `REACT_APP_API_URL` to your backend URL
3. Redeploy the frontend

## Free Tier Limitations

- Services may spin down after 15 minutes of inactivity
- First request after spin-down may be slow (cold start)
- Database has size limitations on free tier

## Upgrading to Paid Plan

For production use, consider upgrading:
- No spin-downs
- Better performance
- More database storage
- Custom domains

## Support

If you encounter issues:
1. Check Render documentation: https://render.com/docs
2. Check service logs in Render dashboard
3. Verify all environment variables are set correctly

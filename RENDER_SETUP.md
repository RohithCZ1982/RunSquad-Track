# Quick Render Deployment Guide

## 🚀 Quick Start (5 Steps)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Ready for Render deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2. Go to Render Dashboard
Visit: https://dashboard.render.com

### 3. Create Blueprint
- Click **"New +"** → **"Blueprint"**
- Connect your GitHub repository
- Render will auto-detect `render.yaml`

### 4. Review & Deploy
- Review the 3 services (Database, Backend, Frontend)
- Click **"Apply"**
- Wait 5-10 minutes for deployment

### 5. Access Your App
- Frontend URL: `https://runsquad-frontend.onrender.com`
- Backend URL: `https://runsquad-backend.onrender.com`

## 📋 What Gets Created

1. **PostgreSQL Database** (`runsquad-db`)
   - Automatically configured
   - Connection string auto-linked to backend

2. **Backend Service** (`runsquad-backend`)
   - Python web service
   - Runs on port 10000 (Render default)
   - Auto-creates database tables on first run

3. **Frontend Service** (`runsquad-frontend`)
   - Node.js web service (serves React app with Express)
   - Handles client-side routing properly
   - Automatically connects to backend

## 🗄️ Database Initialization

The database tables are automatically created when the backend starts (via `create_app()` in `app/__init__.py`).

**Optional: Manual Database Initialization**

If you want to manually initialize the database, you can run:

1. Go to your backend service in Render dashboard
2. Click on **"Shell"** tab
3. Run:
   ```bash
   cd backend
   python init_db.py
   ```

This will create all tables and verify the database structure.

## ⚙️ Environment Variables (Auto-Configured)

All these are set automatically:
- ✅ `DATABASE_URL` - From database service
- ✅ `SECRET_KEY` - Auto-generated
- ✅ `JWT_SECRET_KEY` - Auto-generated  
- ✅ `REACT_APP_API_URL` - From backend service URL

## 🔧 Manual Setup (If Blueprint Doesn't Work)

### Database Service
1. **New** → **PostgreSQL**
2. Name: `runsquad-db`
3. Plan: **Starter** (Free)
4. Click **Create**

### Backend Service
1. **New** → **Web Service**
2. Connect your GitHub repo
3. Settings:
   - **Name**: `runsquad-backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && gunicorn --bind 0.0.0.0:$PORT run:app`
4. **Environment Variables**:
   - `DATABASE_URL` → Link from `runsquad-db`
   - `SECRET_KEY` → Generate random string
   - `JWT_SECRET_KEY` → Generate random string
5. Click **Create Web Service**

### Frontend Service
1. **New** → **Web Service** (⚠️ NOT Static Site - important for React Router!)
2. Connect your GitHub repo
3. Settings:
   - **Name**: `runsquad-frontend`
   - **Environment**: `Node`
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Start Command**: `cd frontend && node server.js`
4. **Environment Variables**:
   - `REACT_APP_API_URL` → `https://runsquad-backend.onrender.com/api`
   - `NODE_ENV` → `production`
5. Click **Create Web Service**

**⚠️ Important**: Use **Web Service**, not Static Site, because:
- React Router needs server-side routing support
- Static sites return 404 for routes like `/dashboard`
- Web service with Express handles all routes correctly

## 🐛 Troubleshooting

### Backend Won't Start
- Check logs in Render dashboard
- Verify `DATABASE_URL` is set
- Ensure `requirements.txt` is correct

### Frontend Can't Connect to Backend
- Check `REACT_APP_API_URL` is set correctly
- Should be: `https://YOUR-BACKEND-URL.onrender.com/api`
- Rebuild frontend after changing env vars

### Database Connection Errors
- Wait 2-3 minutes after database creation
- Check `DATABASE_URL` format: `postgresql://...`
- Verify database is running (not sleeping)

### CORS Errors
- Backend CORS is already configured
- Check backend URL in frontend env vars
- Ensure backend is running

## 📝 Important Notes

1. **Free Tier**: Services may sleep after 15 min inactivity
2. **Cold Start**: First request after sleep takes ~30 seconds
3. **Database**: Auto-creates tables on first backend start
4. **HTTPS**: All Render URLs use HTTPS automatically

## ✅ Post-Deployment Checklist

- [ ] Backend service is running (green status)
- [ ] Frontend service is running (green status)
- [ ] Database is running (green status)
- [ ] Can access frontend URL
- [ ] Can register/login
- [ ] Can create clubs
- [ ] Database tables created (check backend logs)

## 🎉 You're Done!

Your app is live! Share the frontend URL with users.

For production, consider:
- Upgrading to paid plan (no sleep, better performance)
- Adding custom domain
- Setting up monitoring

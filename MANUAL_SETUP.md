# Manual Render Setup Guide

This guide will help you set up the RunSquad backend and frontend manually on Render (without using Blueprint).

## Prerequisites

1. GitHub account with your code pushed to a repository
2. Render account (sign up at https://render.com)
3. Payment method (required for account verification, even for free tier)

---

## Step 1: Create PostgreSQL Database

1. **Go to Render Dashboard**: https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `runsquad-db`
   - **Database**: `runsquad`
   - **User**: `runsquad_user`
   - **Region**: Choose closest to you
   - **Plan**: **Free** (or Starter if you prefer)
4. Click **"Create Database"**
5. **Wait for database to be created** (takes 1-2 minutes)
6. **Copy the Internal Database URL** (you'll need this later)
   - Go to your database → **"Connections"** tab
   - Copy the **"Internal Database URL"**

---

## Step 2: Create Backend Web Service

1. **Go to Render Dashboard**
2. Click **"New +"** → **"Web Service"**
3. **Connect Repository**:
   - Connect your GitHub account if not already connected
   - Select your repository
   - Click **"Connect"**
4. **Configure Service**:
   - **Name**: `runsquad-backend`
   - **Region**: Same as database (recommended)
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty (or `backend` if your backend is in a subdirectory)
   - **Environment**: **Python 3**
   - **Build Command**: 
     ```bash
     cd backend && pip install --upgrade pip && pip install -r requirements.txt
     ```
   - **Start Command**: 
     ```bash
     gunicorn --chdir backend run:app --bind 0.0.0.0:$PORT
     ```
   - **Plan**: **Free** (or Starter)
5. **Environment Variables**:
   Click **"Add Environment Variable"** and add:
   
   | Key | Value |
   |-----|-------|
   | `DATABASE_URL` | (Click "Link" → Select `runsquad-db` → Select "Internal Database URL") |
   | `SECRET_KEY` | (Click "Generate" or use a random string) |
   | `JWT_SECRET_KEY` | (Click "Generate" or use a random string) |
   | `PYTHON_VERSION` | `3.11.0` |
   
6. Click **"Create Web Service"**
7. **Wait for deployment** (takes 5-10 minutes)

---

## Step 3: Create Frontend Static Site

1. **Go to Render Dashboard**
2. Click **"New +"** → **"Static Site"**
3. **Connect Repository**:
   - Select the same repository
   - Click **"Connect"**
4. **Configure Site**:
   - **Name**: `runsquad-frontend`
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: Leave empty
   - **Build Command**: 
     ```bash
     cd frontend && npm install && npm run build
     ```
   - **Publish Directory**: `frontend/build`
   - **Plan**: **Free**
5. **Environment Variables**:
   Click **"Add Environment Variable"** and add:
   
   | Key | Value |
   |-----|-------|
   | `REACT_APP_API_URL` | `https://runsquad-backend.onrender.com/api` |
   
   ⚠️ **Important**: Replace `runsquad-backend` with your actual backend service name if different!
   
6. Click **"Create Static Site"**
7. **Wait for deployment** (takes 3-5 minutes)

---

## Step 4: Verify Deployment

### Check Backend
1. Go to your backend service
2. Check **"Logs"** tab - should show:
   - Build successful
   - Server running on port
   - No errors
3. Visit: `https://runsquad-backend.onrender.com/api/auth/me` (should return 401, which is expected without auth)

### Check Frontend
1. Go to your static site
2. Visit the provided URL (e.g., `https://runsquad-frontend.onrender.com`)
3. Should see the login page

---

## Step 5: Initialize Database (Optional)

The database tables are automatically created when the backend starts. If you want to manually verify:

1. Go to backend service → **"Shell"** tab
2. Run:
   ```bash
   cd backend
   python init_db.py
   ```

---

## Troubleshooting

### Backend Won't Start

**Error: `psycopg2` compatibility issue**
- **Solution**: Make sure `PYTHON_VERSION` is set to `3.11.0` in environment variables
- The `runtime.txt` file in `backend/` should also specify `python-3.11.0`

**Error: Database connection failed**
- Check `DATABASE_URL` is set correctly
- Make sure you're using the **Internal Database URL** (not External)
- Verify database is running (green status)

**Error: Module not found**
- Check `requirements.txt` has all dependencies
- Rebuild the service

### Frontend Can't Connect to Backend

**Error: CORS or Network errors**
- Verify `REACT_APP_API_URL` is set correctly
- Should be: `https://YOUR-BACKEND-NAME.onrender.com/api`
- Rebuild frontend after changing env vars

**Error: 404 on API calls**
- Check backend URL is correct
- Verify backend is running (check logs)

### Database Issues

**Tables not created**
- Check backend logs for errors
- Run `init_db.py` manually (see Step 5)
- Verify `DATABASE_URL` is correct

---

## Environment Variables Reference

### Backend Required Variables:
- `DATABASE_URL` - PostgreSQL connection string (auto-linked from database)
- `SECRET_KEY` - Flask secret key (generate random string)
- `JWT_SECRET_KEY` - JWT token secret (generate random string)
- `PYTHON_VERSION` - Set to `3.11.0` (important for psycopg2 compatibility)

### Frontend Required Variables:
- `REACT_APP_API_URL` - Backend API URL (e.g., `https://runsquad-backend.onrender.com/api`)

---

## Free Tier Limitations

- Services may spin down after 15 minutes of inactivity
- First request after spin-down may be slow (cold start ~30 seconds)
- Database has size limitations
- Limited build minutes per month

---

## Updating Your App

After making code changes:

1. **Push to GitHub**:
   ```bash
   git add .
   git commit -m "Your changes"
   git push
   ```

2. **Render will auto-deploy** (if auto-deploy is enabled)
   - Or manually trigger: Service → **"Manual Deploy"** → **"Deploy latest commit"**

3. **Wait for deployment** to complete

---

## Support

- Render Docs: https://render.com/docs
- Render Community: https://community.render.com
- Check service logs for detailed error messages

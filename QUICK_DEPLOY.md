# 🚀 Quick Render Deployment - Step by Step

## Prerequisites ✅
- GitHub account
- Render account (free tier works!)
- Your code ready

## Step 1: Push to GitHub

```bash
# If you haven't initialized git yet
git init
git add .
git commit -m "Initial commit - RunSquad"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy on Render

### Option A: Using Blueprint (Easiest) ⭐

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub account
4. Select your repository
5. Render will detect `render.yaml` automatically
6. Click **"Apply"** to create all services
7. Wait 5-10 minutes

**Done!** Your app will be live at:
- Frontend: `https://runsquad-frontend.onrender.com`
- Backend: `https://runsquad-backend.onrender.com`

### Option B: Manual Setup (If Blueprint Fails)

#### 1. Create Database
- **New** → **PostgreSQL**
- Name: `runsquad-db`
- Plan: **Starter** (Free)
- Click **Create Database**

#### 2. Create Backend Service
- **New** → **Web Service**
- Connect GitHub repo
- Settings:
  ```
  Name: runsquad-backend
  Environment: Python 3
  Region: (choose closest)
  Branch: main
  Root Directory: (leave empty)
  Build Command: pip install -r backend/requirements.txt
  Start Command: cd backend && gunicorn --bind 0.0.0.0:$PORT run:app
  ```
- **Environment Variables**:
  - `DATABASE_URL` → Click "Link" → Select `runsquad-db`
  - `SECRET_KEY` → Click "Generate" or use random string
  - `JWT_SECRET_KEY` → Click "Generate" or use random string
- Click **Create Web Service**

#### 3. Create Frontend Service
- **New** → **Static Site**
- Connect GitHub repo
- Settings:
  ```
  Name: runsquad-frontend
  Branch: main
  Root Directory: (leave empty)
  Build Command: cd frontend && npm install && npm run build
  Publish Directory: frontend/build
  ```
- **Environment Variables**:
  - `REACT_APP_API_URL` → `https://runsquad-backend.onrender.com/api`
    (Replace with your actual backend URL after it's deployed)
- Click **Create Static Site**

## Step 3: Update Frontend API URL (If Manual Setup)

After backend is deployed:

1. Go to **runsquad-frontend** service
2. Click **Environment**
3. Update `REACT_APP_API_URL` to: `https://YOUR-BACKEND-URL.onrender.com/api`
4. Click **Save Changes**
5. Service will auto-redeploy

## Step 4: Verify Deployment

1. ✅ Check all services show **"Live"** status
2. ✅ Visit frontend URL
3. ✅ Try registering a new user
4. ✅ Check backend logs for any errors

## Common Issues & Fixes

### ❌ Build Fails
- **Backend**: Check `requirements.txt` has all packages
- **Frontend**: Check `package.json` is correct
- **Solution**: Check logs in Render dashboard

### ❌ Database Connection Error
- **Issue**: Backend can't connect to database
- **Solution**: 
  1. Wait 2-3 minutes after database creation
  2. Verify `DATABASE_URL` is linked correctly
  3. Check database is running (not sleeping)

### ❌ Frontend Can't Reach Backend
- **Issue**: CORS or connection errors
- **Solution**:
  1. Verify `REACT_APP_API_URL` is correct
  2. Should be: `https://backend-url.onrender.com/api`
  3. Rebuild frontend after changing env vars

### ❌ Services Keep Sleeping
- **Issue**: Free tier services sleep after 15 min
- **Solution**: 
  - First request after sleep takes ~30 seconds
  - Consider upgrading to paid plan for production

## Environment Variables Reference

### Backend (Auto-configured with Blueprint)
```
DATABASE_URL=postgresql://... (from database)
SECRET_KEY=... (auto-generated)
JWT_SECRET_KEY=... (auto-generated)
PORT=10000 (auto-set by Render)
```

### Frontend (Set manually if needed)
```
REACT_APP_API_URL=https://runsquad-backend.onrender.com/api
```

## Testing Your Deployment

1. **Register**: Create a new account
2. **Login**: Sign in with your account
3. **Create Club**: Test club creation
4. **Track Run**: Test manual run tracking
5. **View Progress**: Check My Progress page

## Next Steps

- ✅ Your app is live!
- 📱 Consider converting to Android app (see README.md)
- 🔒 For production: Upgrade to paid plan
- 🌐 Add custom domain (paid plan)

## Need Help?

- Check Render logs: Dashboard → Service → Logs
- Render Docs: https://render.com/docs
- Check service status: All should be "Live" (green)

---

**🎉 Congratulations! Your RunSquad app is now live on Render!**

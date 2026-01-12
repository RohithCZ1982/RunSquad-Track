# Troubleshooting Guide for Render Deployment

## 404 Error on Login/Register

### Step 1: Check Backend is Running

1. Go to Render Dashboard → Your Backend Service
2. Check **"Logs"** tab
3. Look for:
   - ✅ "Booting worker" or "Listening at: http://0.0.0.0:XXXX"
   - ❌ Any errors or crashes

### Step 2: Test Backend Health Endpoint

Open in browser:
```
https://runsquad-backend.onrender.com
https://runsquad-backend.onrender.com/api
https://runsquad-backend.onrender.com/api/health
```

**Expected Response:**
```json
{"status": "ok", "message": "RunSquad API is running", "endpoints": {...}}
```

**If 404:**
- Backend might not be running
- Check logs for errors
- Verify gunicorn command is correct
- Check logs for "✅ All blueprints registered successfully"

**If 200:**
- Backend is running, check frontend API URL

### Step 3: Check Frontend API URL

1. Open browser console (F12)
2. Look for log: `API Base URL: ...`
3. Should show: `https://runsquad-backend.onrender.com/api`

**If wrong URL:**
- Go to Frontend Service → Environment
- Set `REACT_APP_API_URL` to: `https://runsquad-backend.onrender.com/api`
- **Rebuild frontend** (Manual Deploy → Clear cache & deploy)

### Step 4: Test API Endpoint Directly

Try in browser or Postman:
```
POST https://runsquad-backend.onrender.com/api/auth/login
Content-Type: application/json

{
  "email": "test@example.com",
  "password": "test123"
}
```

**If 404:**
- Routes not registered correctly
- Check backend logs

**If 401:**
- Endpoint works! Issue is with credentials or frontend

### Step 5: Verify Environment Variables

**Backend Service:**
- ✅ `DATABASE_URL` - Should be linked from database
- ✅ `SECRET_KEY` - Should be set
- ✅ `JWT_SECRET_KEY` - Should be set
- ✅ `PYTHON_VERSION` - Should be `3.11.0`

**Frontend Service:**
- ✅ `REACT_APP_API_URL` - Should be `https://runsquad-backend.onrender.com/api`
  - **MUST end with `/api`**
  - Replace `runsquad-backend` with your actual service name

### Step 6: Rebuild Services

After changing environment variables:

1. **Backend**: Usually auto-redeploys
2. **Frontend**: **MUST manually rebuild**
   - Go to Frontend Service
   - Click "Manual Deploy"
   - Select "Clear build cache & deploy"

## Common Issues

### Issue: Backend Won't Start

**Symptoms:**
- Service shows "Failed" or keeps restarting
- Logs show import errors or crashes

**Solutions:**
1. Check Python version (should be 3.11.0)
2. Verify `requirements.txt` is correct
3. Check `runtime.txt` exists with `python-3.11.0`
4. Verify `DATABASE_URL` is set

### Issue: CORS Errors

**Symptoms:**
- "Access-Control-Allow-Origin" errors in browser console

**Solutions:**
1. Backend CORS is configured to allow all origins (`*`)
2. Check backend logs for CORS-related errors
3. Verify backend is actually running

### Issue: Database Connection Errors

**Symptoms:**
- Backend logs show "connection refused" or "database does not exist"

**Solutions:**
1. Verify database is running (green status)
2. Check `DATABASE_URL` is correct
3. Use **Internal Database URL** (not External)
4. Verify database name matches

### Issue: Frontend Shows Wrong API URL

**Symptoms:**
- Console shows `API Base URL: http://localhost:5000/api` (local URL)

**Solutions:**
1. `REACT_APP_API_URL` not set in Render
2. Frontend wasn't rebuilt after setting env var
3. **Fix**: Set env var → Rebuild frontend

## Quick Fixes

### Fix API URL Issue

1. **Frontend Service** → **Environment**
2. Add/Update: `REACT_APP_API_URL` = `https://YOUR-BACKEND-NAME.onrender.com/api`
3. **Manual Deploy** → **Clear cache & deploy**

### Fix Backend Not Starting

1. Check **Logs** for specific error
2. Verify `PYTHON_VERSION=3.11.0` is set
3. Check `runtime.txt` exists in root: `python-3.11.0`
4. Try redeploying

### Test Backend Manually

Use curl or Postman:
```bash
# Health check
curl https://runsquad-backend.onrender.com/api/health

# Test login (will fail with 401, but confirms endpoint works)
curl -X POST https://runsquad-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
```

## Still Having Issues?

1. **Check Render Status Page**: https://status.render.com
2. **Check Service Logs**: Most detailed error info
3. **Verify Service Names**: Make sure URLs match your actual service names
4. **Test Locally First**: Ensure app works locally before deploying

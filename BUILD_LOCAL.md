# Build Locally

Instructions to build the RunSquad project locally before deploying.

## Quick Build Commands

### Frontend Build

```bash
cd frontend
npm install
npm run build
```

This will:
- Install all npm dependencies
- Build the React app for production
- Create a `build/` directory with optimized production files

### Backend Check

```bash
cd backend
pip install -r requirements.txt
python -c "from app import create_app; app = create_app(); print('✓ Backend imports successful')"
```

This will:
- Install all Python dependencies
- Verify that the app can be imported without errors

## Full Build Script

Run these commands from the project root:

```bash
# Build Frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Check Backend
echo "Checking backend..."
cd backend
pip install -r requirements.txt
python -c "from app import create_app; app = create_app(); print('✓ Backend OK')"
cd ..

echo "✓ Build complete!"
```

## What Gets Built

### Frontend (`frontend/build/`)
- Optimized React bundle
- Minified JavaScript and CSS
- Production-ready static files
- Ready to deploy to Render or any static hosting

### Backend
- Dependencies installed
- Code validated (no import errors)
- Ready to run with `python run.py`

## Build Output

After building, you'll see:

```
frontend/
  build/          ← Production build (created)
  node_modules/   ← Dependencies (created)
  src/            ← Source files (unchanged)
  package.json
  ...

backend/
  app/            ← Source files (unchanged)
  venv/           ← Virtual environment (if created)
  requirements.txt
  ...
```

## Troubleshooting

### Frontend Build Errors

**Error: Missing dependencies**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run build
```

**Error: Out of memory**
- Close other applications
- Try: `NODE_OPTIONS=--max_old_space_size=4096 npm run build`

### Backend Import Errors

**Error: Module not found**
```bash
cd backend
pip install -r requirements.txt
```

**Error: Database connection**
- This is OK - you don't need a database to build
- The import check only verifies code syntax

## Next Steps

After building locally:

1. **Verify build succeeded** - Check for errors
2. **Test locally** (optional):
   ```bash
   # Terminal 1: Backend
   cd backend
   python run.py
   
   # Terminal 2: Frontend (if you want to serve the build)
   cd frontend/build
   python -m http.server 3000
   ```
3. **Deploy to Render** - Push to GitHub and deploy

## Notes

- Building locally helps catch errors before deploying
- Frontend build is **required** for production deployment
- Backend check is **optional** but recommended
- You don't need a database running to build
- Build files are gitignored (they're regenerated on Render)

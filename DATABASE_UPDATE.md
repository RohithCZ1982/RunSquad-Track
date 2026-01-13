# How to Update Database Schema on Render

When you add new tables or modify the database schema, you need to update your database on Render. Here are the methods:

## Method 1: Automatic Update (Recommended - Easiest)

**SQLAlchemy's `db.create_all()` automatically creates missing tables.**

Since your `app/__init__.py` calls `db.create_all()` on startup, the new `club_admins` table will be created automatically when you deploy the updated code.

### Steps:

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Add club_admins table for admin promotions"
   git push origin main
   ```

2. **Render will automatically redeploy** your backend service

3. **The new table will be created** when the backend starts (via `db.create_all()` in `app/__init__.py`)

4. **Verify the table was created:**
   - Check backend logs in Render dashboard
   - Look for successful startup messages
   - The table should exist automatically

## Method 2: Manual Update via Render Shell

If you want to manually run the database initialization script:

### Steps:

1. **Go to Render Dashboard**: https://dashboard.render.com

2. **Select your backend service** (`runsquad-backend`)

3. **Click on "Shell" tab** (at the top of the service page)

4. **Run the initialization script:**
   ```bash
   cd backend
   python init_db.py
   ```

   This will:
   - Check database connection
   - Create all missing tables (including `club_admins`)
   - List all created tables

5. **Verify success** - You should see output like:
   ```
   ✓ Database connection successful!
   ✓ All tables created successfully!
   ✓ Database initialized successfully!
   
   Created X tables:
     - club_admins
     - club_members
     - ...
   ```

## Method 3: Direct Python Command (Advanced)

If you prefer to run Python commands directly:

1. **Go to Render Dashboard** → Your backend service → **Shell**

2. **Run Python:**
   ```bash
   cd backend
   python
   ```

3. **Execute commands:**
   ```python
   from app import create_app
   from app.database import db
   from app.models import club_admins
   
   app = create_app()
   with app.app_context():
       db.create_all()
       print("Tables created!")
   ```

4. **Exit Python:**
   ```python
   exit()
   ```

## Verification

After updating, verify the table was created:

### Option 1: Check Backend Logs
- Go to backend service → Logs
- Look for successful startup messages
- Should see no errors about missing tables

### Option 2: Use Render Shell to Query Database
```bash
cd backend
python
```

```python
from app import create_app
from app.database import db

app = create_app()
with app.app_context():
    inspector = db.inspect(db.engine)
    tables = inspector.get_table_names()
    print("Tables in database:", sorted(tables))
    
    # Check if club_admins exists
    if 'club_admins' in tables:
        print("✓ club_admins table exists!")
        
        # Check columns
        columns = inspector.get_columns('club_admins')
        print("Columns:", [col['name'] for col in columns])
    else:
        print("✗ club_admins table not found")
```

## Important Notes: What Happens to Existing Tables

### ✅ What `db.create_all()` DOES:

1. **Creates NEW tables** - Only tables that don't exist yet will be created
   - ✅ Safe for adding new tables (like `club_admins`)
   - ✅ Your existing tables are NOT affected

2. **No data loss** - All existing data is preserved
   - ✅ All your users, clubs, runs, etc. remain intact
   - ✅ No data is deleted or modified

3. **Idempotent operation** - Can be run multiple times safely
   - ✅ If a table already exists, nothing happens to it
   - ✅ Only missing tables are created

### ❌ What `db.create_all()` DOES NOT Do:

1. **Does NOT modify existing tables**
   - ❌ Won't add new columns to existing tables
   - ❌ Won't remove columns from existing tables
   - ❌ Won't change column types or constraints
   - ❌ Won't rename columns or tables

2. **Does NOT drop tables**
   - ❌ Won't delete existing tables
   - ❌ Won't remove any data

3. **Does NOT run migrations**
   - ❌ Not suitable for schema changes to existing tables

### Example: What Happens When You Deploy

**Before deployment:**
- You have: `user`, `club`, `run`, `activity`, `club_members` tables
- All your data is intact

**After deploying new code with `club_admins` table:**
- You still have: `user`, `club`, `run`, `activity`, `club_members` (unchanged)
- **NEW table created**: `club_admins` (empty, ready to use)
- All existing data: **100% preserved**

### ⚠️ Important: Modifying Existing Tables

If you need to **modify existing tables** (not just add new ones), you need **database migrations**:

**Examples of schema changes that need migrations:**
- Adding a column to `user` table (e.g., `phone_number`)
- Removing a column from `club` table
- Changing a column type (e.g., `VARCHAR` to `TEXT`)
- Adding indexes to existing columns
- Renaming columns

**For these changes, use Flask-Migrate:**
```bash
# Install Flask-Migrate
pip install Flask-Migrate

# Initialize migrations
flask db init

# Create a migration
flask db migrate -m "Add phone_number to users"

# Apply the migration
flask db upgrade
```

**For this specific change (adding `club_admins` table):**
- ✅ `db.create_all()` is perfect and sufficient
- ✅ No migrations needed
- ✅ Safe to deploy

## Troubleshooting

### Table Not Created

1. **Check backend logs** for errors
2. **Verify connection string** - `DATABASE_URL` should be set correctly
3. **Check database status** - Database should be running (not sleeping)
4. **Try manual method** - Use Render Shell to run `init_db.py`

### Connection Errors

- Wait 2-3 minutes after database creation
- Check `DATABASE_URL` format: `postgresql://...`
- Verify database is running (not sleeping on free tier)

### Import Errors

- Ensure all model imports are correct
- Check that `club_admins` is imported in routes that use it
- Verify `app/models.py` has no syntax errors

## Summary

**Recommended approach**: Just push your code changes and let Render redeploy. The `db.create_all()` call in `app/__init__.py` will automatically create the new `club_admins` table when the backend starts.

If you want to be extra sure, use Method 2 (Render Shell with `init_db.py`) after deployment to verify everything is set up correctly.

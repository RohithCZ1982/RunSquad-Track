#!/usr/bin/env python3
"""
Database Initialization Script for Render
This script creates all database tables and structure.
Run this once after deploying to Render to initialize the database.
"""

import os
import sys
from app import create_app
from app.database import db
from app.models import User, Club, Run, ScheduledRun, Activity, club_members, scheduled_run_participants

def init_database():
    """Initialize the database by creating all tables."""
    print("=" * 60)
    print("RunSquad Database Initialization")
    print("=" * 60)
    
    # Create the Flask app
    app = create_app()
    
    with app.app_context():
        try:
            # Check database connection
            print("\n[1/3] Checking database connection...")
            db.engine.connect()
            print("✓ Database connection successful!")
            
            # Create all tables
            print("\n[2/3] Creating database tables...")
            db.create_all()
            print("✓ All tables created successfully!")
            
            # List created tables
            print("\n[3/3] Verifying tables...")
            inspector = db.inspect(db.engine)
            tables = inspector.get_table_names()
            
            print(f"\n✓ Database initialized successfully!")
            print(f"\nCreated {len(tables)} tables:")
            for table in sorted(tables):
                print(f"  - {table}")
            
            print("\n" + "=" * 60)
            print("Database initialization complete!")
            print("=" * 60)
            return True
            
        except Exception as e:
            print(f"\n✗ Error initializing database: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    success = init_database()
    sys.exit(0 if success else 1)

#!/usr/bin/env python3
"""
Migration script to add address column to user table
Run this script to add the missing address column to the database.
"""

import os
import sys
from app import create_app
from app.database import db
from sqlalchemy import text

def add_address_column():
    """Add address column to user table if it doesn't exist."""
    print("=" * 60)
    print("Adding address column to user table")
    print("=" * 60)
    
    app = create_app()
    
    with app.app_context():
        try:
            # Check if column already exists
            print("\n[1/2] Checking if address column exists...")
            
            # Get database URL to determine database type
            db_url = app.config['SQLALCHEMY_DATABASE_URI']
            
            if 'postgresql' in db_url or 'postgres' in db_url:
                # PostgreSQL
                result = db.session.execute(text("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name='user' AND column_name='address'
                """))
                column_exists = result.fetchone() is not None
            else:
                # SQLite
                result = db.session.execute(text("""
                    PRAGMA table_info(user)
                """))
                columns = [row[1] for row in result.fetchall()]
                column_exists = 'address' in columns
            
            if column_exists:
                print("✓ Address column already exists. No migration needed.")
                return True
            
            print("  Column not found. Adding address column...")
            
            # Add the column
            print("\n[2/2] Adding address column...")
            if 'postgresql' in db_url or 'postgres' in db_url:
                # PostgreSQL
                db.session.execute(text("""
                    ALTER TABLE "user" 
                    ADD COLUMN IF NOT EXISTS address VARCHAR(200)
                """))
            else:
                # SQLite
                db.session.execute(text("""
                    ALTER TABLE user 
                    ADD COLUMN address VARCHAR(200)
                """))
            
            db.session.commit()
            print("✓ Address column added successfully!")
            
            print("\n" + "=" * 60)
            print("Migration complete!")
            print("=" * 60)
            return True
            
        except Exception as e:
            print(f"\n✗ Error adding address column: {str(e)}")
            db.session.rollback()
            import traceback
            traceback.print_exc()
            return False

if __name__ == '__main__':
    success = add_address_column()
    sys.exit(0 if success else 1)

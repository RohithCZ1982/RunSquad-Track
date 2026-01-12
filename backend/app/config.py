import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Handle PostgreSQL URL for both local and Render deployments
    # Use SQLite for local development if DATABASE_URL is not set
    database_url = os.environ.get('DATABASE_URL')
    
    if not database_url:
        # Use SQLite for local development
        SQLALCHEMY_DATABASE_URI = 'sqlite:///runsquad.db'
    else:
        # Convert postgres:// to postgresql:// if needed (for Render compatibility)
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        SQLALCHEMY_DATABASE_URI = database_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or os.environ.get('SECRET_KEY') or 'jwt-secret-key-change-in-production'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_ALGORITHM = 'HS256'

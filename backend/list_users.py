from app import create_app
from app.models import User
from app.database import db

app = create_app()

with app.app_context():
    users = User.query.all()
    
    if not users:
        print("No users found in the database.")
        print("\nPlease register a new user first.")
    else:
        print(f"\nFound {len(users)} user(s) in the database:\n")
        print("-" * 60)
        for user in users:
            print(f"ID: {user.id}")
            print(f"Name: {user.name}")
            print(f"Email: {user.email}")
            print(f"Created: {user.created_at}")
            print("-" * 60)

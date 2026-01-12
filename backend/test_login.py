from app import create_app
from app.models import User
from app.database import db
from flask_jwt_extended import create_access_token

app = create_app()

with app.app_context():
    users = User.query.all()
    
    print("\n" + "=" * 60)
    print("USER LOGIN TEST")
    print("=" * 60)
    
    if not users:
        print("No users found in the database.")
    else:
        print(f"\nFound {len(users)} user(s):\n")
        for user in users:
            print(f"Email: {user.email}")
            print(f"Name: {user.name}")
            print(f"ID: {user.id}")
            
            # Test creating a token for this user
            try:
                token = create_access_token(identity=user.id)
                print(f"[OK] Token can be created for this user")
                print(f"  Token preview: {token[:50]}...")
            except Exception as e:
                print(f"[ERROR] Error creating token: {e}")
            print("-" * 60)
    
    print("\nNote: Passwords are hashed and cannot be retrieved.")
    print("You need to use the password you set when registering.")
    print("=" * 60)

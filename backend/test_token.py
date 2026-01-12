from app import create_app
from app.models import User
from app.database import db
from flask_jwt_extended import create_access_token, decode_token

app = create_app()

with app.app_context():
    print("=" * 60)
    print("JWT TOKEN TEST")
    print("=" * 60)
    
    # Get a user
    user = User.query.first()
    if not user:
        print("No users found. Please register a user first.")
    else:
        print(f"\nTesting with user: {user.email} (ID: {user.id})")
        print(f"JWT_SECRET_KEY: {app.config.get('JWT_SECRET_KEY')[:30]}...")
        
        # Create a token
        token = create_access_token(identity=user.id)
        print(f"\nCreated token: {token[:50]}...")
        
        # Try to decode it
        try:
            decoded = decode_token(token)
            print(f"✓ Token decoded successfully!")
            print(f"  User ID: {decoded.get('sub')}")
            print(f"  Expires: {decoded.get('exp')}")
        except Exception as e:
            print(f"✗ Error decoding token: {e}")
        
        print("\n" + "=" * 60)
        print("If token creation/decoding works, the issue might be:")
        print("1. Token format in localStorage (extra characters)")
        print("2. Token expired")
        print("3. Server restarted with different JWT_SECRET_KEY")
        print("=" * 60)

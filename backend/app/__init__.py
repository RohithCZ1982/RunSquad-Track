from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from app.database import db
from app.config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Initialize extensions first
    db.init_app(app)
    jwt = JWTManager(app)
    
    # CORS configuration - Flask-CORS handles all CORS headers automatically
    # Configure it to allow all origins and handle preflight requests
    CORS(app, 
         resources={r"/api/*": {
             "origins": "*",  # Allow all origins
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "expose_headers": ["Content-Type"],
             "supports_credentials": False,  # Set to False when using wildcard origin
             "max_age": 3600
         }},
         supports_credentials=False,  # Must be False with wildcard origin
         automatic_options=True)  # Automatically handle OPTIONS requests
    
    # Allow OPTIONS requests to bypass JWT authentication (for CORS preflight)
    # This must be before JWT checks to allow preflight requests
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            # Return empty 200 response with CORS headers
            # This bypasses JWT validation for preflight requests
            response = jsonify({})
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH")
            response.headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
            response.headers.add("Access-Control-Max-Age", "3600")
            return response, 200
    
    # JWT error handlers - Flask-CORS will add headers automatically
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        response = jsonify({'error': 'Token has expired', 'code': 'TOKEN_EXPIRED'})
        # Flask-CORS will add headers automatically
        return response, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        import traceback
        from flask import request
        error_details = str(error)
        
        # Get the token from the request
        auth_header = request.headers.get('Authorization', '')
        token_preview = auth_header[:50] if auth_header else 'No Authorization header'
        
        print(f"\n{'='*60}")
        print(f"JWT Invalid Token Error: {error_details}")
        print(f"JWT_SECRET_KEY: {app.config.get('JWT_SECRET_KEY')[:30] if app.config.get('JWT_SECRET_KEY') else 'Not set'}...")
        print(f"Authorization header: {token_preview}...")
        print(f"{'='*60}\n")
        
        response = jsonify({
            'error': 'Invalid or expired token', 
            'details': error_details,
            'code': 'INVALID_TOKEN',
            'hint': 'Please log in again to get a new token'
        })
        # Flask-CORS will add headers automatically
        return response, 422
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        response = jsonify({'error': 'Authorization token is missing', 'code': 'MISSING_TOKEN'})
        # Flask-CORS will add headers automatically
        return response, 401
    
    # Error handler for 500 errors - Flask-CORS will add headers automatically
    @app.errorhandler(500)
    def handle_500_error(e):
        response = jsonify({'error': 'Internal server error', 'details': str(e)})
        # Flask-CORS will add headers automatically
        return response, 500
    
    # Health check endpoint
    @app.route('/')
    @app.route('/health')
    @app.route('/api')
    @app.route('/api/health')
    def health_check():
        response = jsonify({
            'status': 'ok', 
            'message': 'RunSquad API is running',
            'endpoints': {
                'auth': '/api/auth',
                'clubs': '/api/clubs',
                'runs': '/api/runs',
                'users': '/api/users'
            }
        })
        # Flask-CORS will add headers automatically
        return response, 200
    
    # Register blueprints
    try:
        from app.routes.auth import auth_bp
        from app.routes.clubs import clubs_bp
        from app.routes.runs import runs_bp
        from app.routes.users import users_bp
        from app.routes.challenges import challenges_bp
        
        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(clubs_bp, url_prefix='/api/clubs')
        app.register_blueprint(runs_bp, url_prefix='/api/runs')
        app.register_blueprint(users_bp, url_prefix='/api/users')
        app.register_blueprint(challenges_bp, url_prefix='/api/challenges')
        
        print("✅ All blueprints registered successfully")
        print("Registered routes:")
        for rule in app.url_map.iter_rules():
            print(f"  {rule.rule} -> {rule.endpoint}")
    except Exception as e:
        print(f"❌ Error registering blueprints: {e}")
        import traceback
        traceback.print_exc()
        raise
    
    with app.app_context():
        db.create_all()
    
    return app

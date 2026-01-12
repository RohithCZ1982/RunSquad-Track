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
    
    # CORS configuration - MUST handle preflight requests properly
    from flask_cors import cross_origin
    
    # Handle OPTIONS requests globally for all /api/* routes
    @app.before_request
    def handle_preflight():
        if request.method == "OPTIONS":
            response = jsonify({})
            response.headers.add("Access-Control-Allow-Origin", "*")
            response.headers.add('Access-Control-Allow-Headers', "Content-Type,Authorization,X-Requested-With")
            response.headers.add('Access-Control-Allow-Methods', "GET,PUT,POST,DELETE,OPTIONS,PATCH")
            response.headers.add('Access-Control-Max-Age', "3600")
            return response, 200
    
    # CORS configuration - allow all origins for now
    CORS(app, 
         resources={r"/api/*": {
             "origins": "*",  # Allow all origins
             "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
             "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
             "expose_headers": ["Content-Type"],
             "supports_credentials": True,
             "max_age": 3600
         }},
         supports_credentials=True,
         automatic_options=True)
    
    # Also add CORS headers to all routes as a fallback
    @app.after_request
    def after_request(response):
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS,PATCH')
        return response
    
    # JWT error handlers - must return CORS-compatible responses
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        response = jsonify({'error': 'Token has expired', 'code': 'TOKEN_EXPIRED'})
        response.headers.add('Access-Control-Allow-Origin', '*')
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
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 422
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        response = jsonify({'error': 'Authorization token is missing', 'code': 'MISSING_TOKEN'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    # Error handler for 500 errors to include CORS headers
    @app.errorhandler(500)
    def handle_500_error(e):
        response = jsonify({'error': 'Internal server error', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.clubs import clubs_bp
    from app.routes.runs import runs_bp
    from app.routes.users import users_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(clubs_bp, url_prefix='/api/clubs')
    app.register_blueprint(runs_bp, url_prefix='/api/runs')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    
    with app.app_context():
        db.create_all()
    
    return app

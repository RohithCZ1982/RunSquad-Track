from flask import Blueprint, request, jsonify
from app.database import db
from app.models import Activity
from flask_jwt_extended import jwt_required, get_jwt_identity

users_bp = Blueprint('users', __name__)

@users_bp.route('/activity-feed/<int:club_id>', methods=['GET'])
@jwt_required()
def get_activity_feed(club_id):
    # Just verify token is valid, we don't need user_id for this endpoint
    get_jwt_identity()  # This will raise if token is invalid
    
    # Only return run activities (tracked manually or via GPS)
    activities = Activity.query.filter_by(
        club_id=club_id,
        activity_type='run'
    ).order_by(Activity.created_at.desc()).limit(50).all()
    
    activities_data = []
    for activity in activities:
        activities_data.append({
            'id': activity.id,
            'type': activity.activity_type,
            'description': activity.description,
            'user_name': activity.user.name,
            'created_at': activity.created_at.isoformat()
        })
    
    response = jsonify(activities_data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

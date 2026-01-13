from flask import Blueprint, request, jsonify
from app.database import db
from app.models import Challenge, ChallengeParticipant, User, Club, Run, Activity, club_members, club_admins
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

def is_club_admin(club_id, user_id):
    """Check if a user is an admin of a club (creator or in club_admins table)"""
    club = Club.query.get(club_id)
    if not club:
        return False
    # Creator is always an admin
    if club.created_by == user_id:
        return True
    # Check if user is in club_admins table
    is_admin = db.session.query(club_admins).filter_by(
        user_id=user_id, club_id=club_id
    ).first() is not None
    return is_admin

challenges_bp = Blueprint('challenges', __name__)

@challenges_bp.route('/club/<int:club_id>', methods=['GET'])
@jwt_required()
def get_club_challenges(club_id):
    """Get all challenges for a club"""
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    # Verify club exists
    club = Club.query.get(club_id)
    if not club:
        response = jsonify({'error': 'Club not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if user is a member
    is_member = db.session.query(club_members).filter_by(
        user_id=user_id, club_id=club_id
    ).first() is not None
    
    if not is_member:
        response = jsonify({'error': 'You must be a member of the club to view challenges'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    # Get all challenges for the club
    challenges = Challenge.query.filter_by(club_id=club_id).order_by(Challenge.created_at.desc()).all()
    
    challenges_data = []
    for challenge in challenges:
        # Get participant count
        participant_count = ChallengeParticipant.query.filter_by(challenge_id=challenge.id).count()
        
        # Check if current user is participating
        user_participation = ChallengeParticipant.query.filter_by(
            challenge_id=challenge.id, user_id=user_id
        ).first()
        
        # Get creator info
        creator = User.query.get(challenge.created_by)
        
        challenges_data.append({
            'id': challenge.id,
            'title': challenge.title,
            'description': challenge.description,
            'challenge_type': challenge.challenge_type,
            'goal_value': challenge.goal_value,
            'start_date': challenge.start_date.isoformat(),
            'end_date': challenge.end_date.isoformat(),
            'created_at': challenge.created_at.isoformat(),
            'participant_count': participant_count,
            'is_participating': user_participation is not None,
            'user_progress': user_participation.progress_value if user_participation else 0,
            'created_by': {
                'id': creator.id if creator else None,
                'name': creator.name if creator else 'Unknown'
            }
        })
    
    response = jsonify(challenges_data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

@challenges_bp.route('/club/<int:club_id>', methods=['POST'])
@jwt_required()
def create_challenge(club_id):
    """Create a new challenge (admin only)"""
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    data = request.get_json()
    
    if not data or not data.get('title') or not data.get('challenge_type') or not data.get('goal_value'):
        response = jsonify({'error': 'Missing required fields: title, challenge_type, goal_value'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Verify club exists
    club = Club.query.get(club_id)
    if not club:
        response = jsonify({'error': 'Club not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if user is an admin (creator or in club_admins)
    if not is_club_admin(club_id, user_id):
        response = jsonify({'error': 'Only club admins can create challenges'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    # Parse dates
    try:
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
    except Exception as e:
        response = jsonify({'error': f'Invalid date format: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    if end_date <= start_date:
        response = jsonify({'error': 'End date must be after start date'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Validate challenge type
    valid_types = ['weekly_mileage', 'fastest_5k', 'total_distance', 'total_time']
    if data['challenge_type'] not in valid_types:
        response = jsonify({'error': f'Invalid challenge type. Must be one of: {", ".join(valid_types)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Create challenge
    challenge = Challenge(
        club_id=club_id,
        created_by=user_id,
        title=data['title'],
        description=data.get('description'),
        challenge_type=data['challenge_type'],
        goal_value=float(data['goal_value']),
        start_date=start_date,
        end_date=end_date
    )
    
    db.session.add(challenge)
    db.session.commit()
    
    # Create activity
    user = User.query.get(user_id)
    activity = Activity(
        club_id=club_id,
        user_id=user_id,
        activity_type='challenge',
        description=f'{user.name} created a challenge: {challenge.title}'
    )
    db.session.add(activity)
    db.session.commit()
    
    creator = User.query.get(user_id)
    response = jsonify({
        'id': challenge.id,
        'title': challenge.title,
        'description': challenge.description,
        'challenge_type': challenge.challenge_type,
        'goal_value': challenge.goal_value,
        'start_date': challenge.start_date.isoformat(),
        'end_date': challenge.end_date.isoformat(),
        'created_at': challenge.created_at.isoformat(),
        'participant_count': 0,
        'is_participating': False,
        'user_progress': 0,
        'created_by': {
            'id': creator.id if creator else None,
            'name': creator.name if creator else 'Unknown'
        }
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 201

@challenges_bp.route('/<int:challenge_id>/join', methods=['POST'])
@jwt_required()
def join_challenge(challenge_id):
    """Join a challenge"""
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    challenge = Challenge.query.get(challenge_id)
    if not challenge:
        response = jsonify({'error': 'Challenge not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if user is a member of the club
    is_member = db.session.query(club_members).filter_by(
        user_id=user_id, club_id=challenge.club_id
    ).first() is not None
    
    if not is_member:
        response = jsonify({'error': 'You must be a member of the club to join challenges'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    # Check if already participating
    existing = ChallengeParticipant.query.filter_by(
        challenge_id=challenge_id, user_id=user_id
    ).first()
    
    if existing:
        response = jsonify({'error': 'You are already participating in this challenge'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Check if challenge is still active
    now = datetime.utcnow()
    if now > challenge.end_date:
        response = jsonify({'error': 'This challenge has ended'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Create participation
    participant = ChallengeParticipant(
        challenge_id=challenge_id,
        user_id=user_id,
        progress_value=0.0
    )
    
    db.session.add(participant)
    db.session.commit()
    
    # Update progress based on existing runs
    update_challenge_progress(challenge_id, user_id)
    
    response = jsonify({'message': 'Successfully joined challenge'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

@challenges_bp.route('/<int:challenge_id>/leaderboard', methods=['GET'])
@jwt_required()
def get_leaderboard(challenge_id):
    """Get leaderboard for a challenge"""
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    challenge = Challenge.query.get(challenge_id)
    if not challenge:
        response = jsonify({'error': 'Challenge not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Get all participants
    participants = ChallengeParticipant.query.filter_by(challenge_id=challenge_id).all()
    
    # Sort by progress (descending for distance/time, ascending for fastest_5k)
    if challenge.challenge_type == 'fastest_5k':
        participants.sort(key=lambda p: p.progress_value if p.progress_value > 0 else float('inf'))
    else:
        participants.sort(key=lambda p: p.progress_value, reverse=True)
    
    leaderboard = []
    for rank, participant in enumerate(participants, 1):
        user = User.query.get(participant.user_id)
        if not user:
            continue
        
        progress_percentage = (participant.progress_value / challenge.goal_value * 100) if challenge.goal_value > 0 else 0
        
        leaderboard.append({
            'rank': rank,
            'user_id': user.id,
            'user_name': user.name,
            'progress_value': participant.progress_value,
            'progress_percentage': round(progress_percentage, 1),
            'is_current_user': user.id == user_id
        })
    
    response = jsonify({
        'challenge_id': challenge_id,
        'challenge_title': challenge.title,
        'challenge_type': challenge.challenge_type,
        'goal_value': challenge.goal_value,
        'leaderboard': leaderboard
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

def update_challenge_progress(challenge_id, user_id):
    """Update a user's progress in a challenge based on their runs"""
    challenge = Challenge.query.get(challenge_id)
    if not challenge:
        return
    
    participant = ChallengeParticipant.query.filter_by(
        challenge_id=challenge_id, user_id=user_id
    ).first()
    
    if not participant:
        return
    
    # Get runs within challenge date range
    runs = Run.query.filter(
        Run.user_id == user_id,
        Run.date >= challenge.start_date,
        Run.date <= challenge.end_date
    ).all()
    
    progress = 0.0
    
    if challenge.challenge_type == 'weekly_mileage':
        # Calculate total distance for the week
        # For simplicity, we'll use total distance in the challenge period
        progress = sum(run.distance_km for run in runs)
    
    elif challenge.challenge_type == 'fastest_5k':
        # Find fastest 5K (or closest to 5K)
        fastest_time = None
        for run in runs:
            if 4.5 <= run.distance_km <= 5.5:  # Allow 5K ± 500m
                time_minutes = run.duration_minutes
                if fastest_time is None or time_minutes < fastest_time:
                    fastest_time = time_minutes
        progress = fastest_time if fastest_time else 0
    
    elif challenge.challenge_type == 'total_distance':
        progress = sum(run.distance_km for run in runs)
    
    elif challenge.challenge_type == 'total_time':
        progress = sum(run.duration_minutes for run in runs)
    
    participant.progress_value = progress
    db.session.commit()

@challenges_bp.route('/update-progress', methods=['POST'])
@jwt_required()
def update_all_challenge_progress():
    """Update progress for all challenges a user is participating in (called after tracking a run)"""
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    # Get all active challenges the user is participating in
    now = datetime.utcnow()
    participants = db.session.query(ChallengeParticipant).join(Challenge).filter(
        ChallengeParticipant.user_id == user_id,
        Challenge.start_date <= now,
        Challenge.end_date >= now
    ).all()
    
    for participant in participants:
        update_challenge_progress(participant.challenge_id, user_id)
    
    response = jsonify({'message': 'Progress updated'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

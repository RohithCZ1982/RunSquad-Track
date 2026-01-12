from flask import Blueprint, request, jsonify
from app.database import db
from app.models import Run, User, Club, Activity, ScheduledRun, club_members
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

runs_bp = Blueprint('runs', __name__)

@runs_bp.route('/track', methods=['POST'])
@jwt_required()
def track_run():
    try:
        user_id_str = get_jwt_identity()
        # Convert to int since JWT returns string
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    data = request.get_json()
    
    if not data or not data.get('distance_km') or not data.get('duration_minutes'):
        response = jsonify({'error': 'Missing distance or duration'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    distance = float(data['distance_km'])
    duration = float(data['duration_minutes'])
    speed_kmh = (distance / duration) * 60 if duration > 0 else 0
    
    run_date = datetime.utcnow()
    if data.get('date'):
        try:
            run_date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
        except:
            run_date = datetime.utcnow()
    
    run = Run(
        user_id=user_id,
        distance_km=distance,
        duration_minutes=duration,
        speed_kmh=speed_kmh,
        notes=data.get('notes'),
        date=run_date
    )
    
    db.session.add(run)
    db.session.commit()
    
    # Create activities in user's clubs
    user = User.query.get(user_id)
    for club in user.clubs:
        activity = Activity(
            club_id=club.id,
            user_id=user_id,
            activity_type='run',
            description=f'{user.name} ran {distance:.2f} km at {speed_kmh:.2f} km/h'
        )
        db.session.add(activity)
    
    db.session.commit()
    
    response = jsonify({
        'id': run.id,
        'distance_km': run.distance_km,
        'duration_minutes': run.duration_minutes,
        'speed_kmh': run.speed_kmh,
        'date': run.date.isoformat()
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 201

@runs_bp.route('/my-progress', methods=['GET'])
@jwt_required()
def get_my_progress():
    try:
        user_id_str = get_jwt_identity()
        # Convert to int since JWT returns string
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    runs = Run.query.filter_by(user_id=user_id).order_by(Run.date.desc()).all()
    
    runs_data = []
    total_distance = 0
    total_duration = 0
    
    for run in runs:
        runs_data.append({
            'id': run.id,
            'distance_km': run.distance_km,
            'duration_minutes': run.duration_minutes,
            'speed_kmh': run.speed_kmh,
            'date': run.date.isoformat(),
            'notes': run.notes
        })
        total_distance += run.distance_km
        total_duration += run.duration_minutes
    
    avg_speed = (total_distance / total_duration * 60) if total_duration > 0 else 0
    
    response = jsonify({
        'runs': runs_data,
        'statistics': {
            'total_runs': len(runs),
            'total_distance_km': round(total_distance, 2),
            'total_duration_minutes': round(total_duration, 2),
            'average_speed_kmh': round(avg_speed, 2)
        }
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

@runs_bp.route('/schedule', methods=['POST'])
@jwt_required()
def schedule_run():
    print("\n" + "="*60)
    print("POST /api/runs/schedule - Request received")
    print("="*60)
    
    try:
        user_id_str = get_jwt_identity()
        # Convert to int since JWT returns string
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
        print(f"User ID from token: {user_id}")
    except Exception as e:
        print(f"JWT Error in schedule_run: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    try:
        data = request.get_json()
        print(f"Request data: {data}")
        
        if not data or not data.get('club_id') or not data.get('title') or not data.get('scheduled_date'):
            response = jsonify({'error': 'Missing required fields'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400
        
        club = Club.query.get(data['club_id'])
        if not club:
            response = jsonify({'error': 'Club not found'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 404
        
        # Check if user is a member by querying the association table
        is_member = db.session.query(club_members).filter_by(
            user_id=user_id, club_id=club.id
        ).first() is not None
        
        print(f"User {user_id} is member of club {club.id}: {is_member}")
        
        if not is_member:
            response = jsonify({'error': 'You must be a member of the club to schedule runs'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 403
        
        # Parse the scheduled date
        # Handle datetime-local format (YYYY-MM-DDTHH:mm) or ISO format
        scheduled_date_str = data['scheduled_date']
        print(f"Parsing date: {scheduled_date_str}")
        
        try:
            # Try ISO format first
            if 'T' in scheduled_date_str:
                # datetime-local format: "2024-01-15T14:30" -> convert to UTC
                if scheduled_date_str.endswith('Z') or '+' in scheduled_date_str:
                    scheduled_date = datetime.fromisoformat(scheduled_date_str.replace('Z', '+00:00'))
                else:
                    # datetime-local format without timezone - treat as local time
                    scheduled_date = datetime.fromisoformat(scheduled_date_str)
            else:
                # Just date format
                scheduled_date = datetime.fromisoformat(scheduled_date_str)
        except Exception as e:
            print(f"Date parsing error: {e}")
            import traceback
            traceback.print_exc()
            response = jsonify({'error': f'Invalid date format: {str(e)}'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400
        
        print(f"Parsed scheduled_date: {scheduled_date}")
        
        scheduled_run = ScheduledRun(
            club_id=data['club_id'],
            created_by=user_id,
            title=data['title'],
            description=data.get('description'),
            scheduled_date=scheduled_date,
            location=data.get('location')
        )
        
        db.session.add(scheduled_run)
        db.session.flush()  # Flush to get the ID
        
        # Add creator as participant
        user = User.query.get(user_id)
        if not user:
            db.session.rollback()
            response = jsonify({'error': 'User not found'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 404
        
        scheduled_run.participants.append(user)
        
        # Create activity
        activity = Activity(
            club_id=club.id,
            user_id=user_id,
            activity_type='schedule_run',
            description=f'{user.name} scheduled a run: {scheduled_run.title}'
        )
        db.session.add(activity)
        
        db.session.commit()
        
        print(f"Successfully scheduled run: {scheduled_run.id}")
        print("="*60 + "\n")
        
        response = jsonify({
            'id': scheduled_run.id,
            'title': scheduled_run.title,
            'description': scheduled_run.description,
            'scheduled_date': scheduled_run.scheduled_date.isoformat(),
            'location': scheduled_run.location
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error in schedule_run: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to schedule run: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

@runs_bp.route('/schedule/<int:club_id>', methods=['GET'])
@jwt_required()
def get_scheduled_runs(club_id):
    try:
        user_id_str = get_jwt_identity()
        # Convert to int since JWT returns string
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    club = Club.query.get(club_id)
    if not club:
        response = jsonify({'error': 'Club not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    scheduled_runs = ScheduledRun.query.filter_by(club_id=club_id).order_by(ScheduledRun.scheduled_date).all()
    
    runs_data = []
    for run in scheduled_runs:
        creator = User.query.get(run.created_by)
        # Get participant count from the association table
        participant_count = len(list(run.participants)) if run.participants else 0
        
        runs_data.append({
            'id': run.id,
            'title': run.title,
            'description': run.description,
            'scheduled_date': run.scheduled_date.isoformat(),
            'location': run.location,
            'created_by': {
                'id': creator.id if creator else None,
                'name': creator.name if creator else 'Unknown'
            },
            'participant_count': participant_count
        })
    
    response = jsonify(runs_data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

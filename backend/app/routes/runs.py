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
    
    try:
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
        
        # Create activity only in specified club (if club_id is provided)
        club_id = data.get('club_id')
        if club_id:
            try:
                # Verify club exists and user is a member
                club = Club.query.get(club_id)
                if club:
                    is_member = db.session.query(club_members).filter_by(
                        user_id=user_id, club_id=club_id
                    ).first() is not None
                    
                    if is_member:
                        user = User.query.get(user_id)
                        if user:
                            activity = Activity(
                                club_id=club_id,
                                user_id=user_id,
                                activity_type='run',
                                description=f'{user.name} ran {distance:.2f} km at {speed_kmh:.2f} km/h'
                            )
                            db.session.add(activity)
                            db.session.commit()
            except Exception as e:
                print(f"Error creating club activity: {e}")
                # Don't fail the run tracking if activity creation fails
        
        # Update challenge progress for all active challenges
        try:
            from app.models import Challenge, ChallengeParticipant
            
            now = datetime.utcnow()
            participants = db.session.query(ChallengeParticipant).join(Challenge).filter(
                ChallengeParticipant.user_id == user_id,
                Challenge.start_date <= now,
                Challenge.end_date >= now
            ).all()
            
            # Update progress for each challenge
            for participant in participants:
                challenge = Challenge.query.get(participant.challenge_id)
                if not challenge:
                    continue
                
                # Get runs within challenge date range
                challenge_runs = Run.query.filter(
                    Run.user_id == user_id,
                    Run.date >= challenge.start_date,
                    Run.date <= challenge.end_date
                ).all()
                
                progress = 0.0
                
                if challenge.challenge_type == 'weekly_mileage':
                    progress = sum(run.distance_km for run in challenge_runs)
                elif challenge.challenge_type == 'fastest_5k':
                    fastest_time = None
                    for run in challenge_runs:
                        if 4.5 <= run.distance_km <= 5.5:
                            time_minutes = run.duration_minutes
                            if fastest_time is None or time_minutes < fastest_time:
                                fastest_time = time_minutes
                    progress = fastest_time if fastest_time else 0
                elif challenge.challenge_type == 'total_distance':
                    progress = sum(run.distance_km for run in challenge_runs)
                elif challenge.challenge_type == 'total_time':
                    progress = sum(run.duration_minutes for run in challenge_runs)
                
                participant.progress_value = progress
            
            db.session.commit()
        except Exception as e:
            print(f"Error updating challenge progress: {e}")
            import traceback
            traceback.print_exc()
            # Don't fail the run tracking if challenge update fails
        
        response = jsonify({
            'id': run.id,
            'distance_km': run.distance_km,
            'duration_minutes': run.duration_minutes,
            'speed_kmh': run.speed_kmh,
            'date': run.date.isoformat()
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 201
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error tracking run: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to track run: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

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
        
        # Check if current user is a participant
        is_participating = user_id in [p.id for p in run.participants] if run.participants else False
        
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
            'participant_count': participant_count,
            'is_participating': is_participating
        })
    
    response = jsonify(runs_data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

@runs_bp.route('/schedule/<int:scheduled_run_id>', methods=['PUT'])
@jwt_required()
def update_scheduled_run(scheduled_run_id):
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    scheduled_run = ScheduledRun.query.get(scheduled_run_id)
    if not scheduled_run:
        response = jsonify({'error': 'Scheduled run not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if user is the creator
    if scheduled_run.created_by != user_id:
        response = jsonify({'error': 'You can only edit scheduled runs you created'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    data = request.get_json()
    
    if not data:
        response = jsonify({'error': 'No data provided'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    try:
        # Update scheduled run fields
        if 'title' in data:
            scheduled_run.title = data['title']
        if 'description' in data:
            scheduled_run.description = data.get('description')
        if 'location' in data:
            scheduled_run.location = data.get('location')
        if 'scheduled_date' in data:
            scheduled_date_str = data['scheduled_date']
            try:
                if 'T' in scheduled_date_str:
                    if scheduled_date_str.endswith('Z') or '+' in scheduled_date_str:
                        scheduled_run.scheduled_date = datetime.fromisoformat(scheduled_date_str.replace('Z', '+00:00'))
                    else:
                        scheduled_run.scheduled_date = datetime.fromisoformat(scheduled_date_str)
                else:
                    scheduled_run.scheduled_date = datetime.fromisoformat(scheduled_date_str)
            except Exception as e:
                response = jsonify({'error': f'Invalid date format: {str(e)}'})
                response.headers.add('Access-Control-Allow-Origin', '*')
                return response, 400
        
        db.session.commit()
        
        # Update activity description
        user = User.query.get(user_id)
        activity = Activity.query.filter_by(
            club_id=scheduled_run.club_id,
            user_id=user_id,
            activity_type='schedule_run',
            description=f'{user.name} scheduled a run: {scheduled_run.title}'
        ).first()
        
        if activity:
            activity.description = f'{user.name} scheduled a run: {scheduled_run.title}'
            db.session.commit()
        
        creator = User.query.get(scheduled_run.created_by)
        participant_count = len(list(scheduled_run.participants)) if scheduled_run.participants else 0
        
        response = jsonify({
            'id': scheduled_run.id,
            'title': scheduled_run.title,
            'description': scheduled_run.description,
            'scheduled_date': scheduled_run.scheduled_date.isoformat(),
            'location': scheduled_run.location,
            'created_by': {
                'id': creator.id if creator else None,
                'name': creator.name if creator else 'Unknown'
            },
            'participant_count': participant_count
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error updating scheduled run: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to update scheduled run: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

@runs_bp.route('/schedule/<int:scheduled_run_id>', methods=['DELETE'])
@jwt_required()
def delete_scheduled_run(scheduled_run_id):
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    scheduled_run = ScheduledRun.query.get(scheduled_run_id)
    if not scheduled_run:
        response = jsonify({'error': 'Scheduled run not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if user is the creator
    if scheduled_run.created_by != user_id:
        response = jsonify({'error': 'You can only delete scheduled runs you created'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    try:
        # Delete related activities
        activities = Activity.query.filter_by(
            club_id=scheduled_run.club_id,
            activity_type='schedule_run'
        ).all()
        
        for activity in activities:
            if scheduled_run.title in activity.description:
                db.session.delete(activity)
        
        # Delete the scheduled run
        db.session.delete(scheduled_run)
        db.session.commit()
        
        response = jsonify({'message': 'Scheduled run deleted successfully'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error deleting scheduled run: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to delete scheduled run: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

@runs_bp.route('/<int:run_id>', methods=['PUT'])
@jwt_required()
def update_run(run_id):
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    run = Run.query.get(run_id)
    if not run:
        response = jsonify({'error': 'Run not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if user owns this run
    if run.user_id != user_id:
        response = jsonify({'error': 'You can only edit your own runs'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    data = request.get_json()
    
    if not data:
        response = jsonify({'error': 'No data provided'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    try:
        # Update run fields
        if 'distance_km' in data:
            run.distance_km = float(data['distance_km'])
        if 'duration_minutes' in data:
            run.duration_minutes = float(data['duration_minutes'])
        if 'notes' in data:
            run.notes = data['notes']
        if 'date' in data:
            try:
                run.date = datetime.fromisoformat(data['date'].replace('Z', '+00:00'))
            except:
                pass
        
        # Recalculate speed
        if 'distance_km' in data or 'duration_minutes' in data:
            run.speed_kmh = (run.distance_km / run.duration_minutes) * 60 if run.duration_minutes > 0 else 0
        
        db.session.commit()
        
        response = jsonify({
            'id': run.id,
            'distance_km': run.distance_km,
            'duration_minutes': run.duration_minutes,
            'speed_kmh': run.speed_kmh,
            'date': run.date.isoformat(),
            'notes': run.notes
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error updating run: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to update run: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

@runs_bp.route('/<int:run_id>', methods=['DELETE'])
@jwt_required()
def delete_run(run_id):
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    run = Run.query.get(run_id)
    if not run:
        response = jsonify({'error': 'Run not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if user owns this run
    if run.user_id != user_id:
        response = jsonify({'error': 'You can only delete your own runs'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    try:
        # Delete the run (activities will remain for history)
        # If you want to delete activities too, uncomment the code below
        db.session.delete(run)
        db.session.commit()
        
        response = jsonify({'message': 'Run deleted successfully'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error deleting run: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to delete run: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

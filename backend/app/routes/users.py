from flask import Blueprint, request, jsonify
from app.database import db
from app.models import Activity, Run, User, Challenge, ChallengeParticipant
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import re
import pandas as pd
import io

users_bp = Blueprint('users', __name__)

@users_bp.route('/badges', methods=['GET'])
@jwt_required()
def get_user_badges():
    """Get badge counts (gold, silver, bronze) for the current user"""
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    # Get all challenges the user has participated in
    participants = ChallengeParticipant.query.filter_by(user_id=user_id).all()
    
    gold_count = 0
    silver_count = 0
    bronze_count = 0
    
    # For each challenge, calculate the user's rank
    for participant in participants:
        challenge = Challenge.query.get(participant.challenge_id)
        if not challenge:
            continue
        
        # Skip challenges that haven't ended yet (only count final results)
        now = datetime.utcnow()
        if challenge.end_date > now:
            continue
        
        # Get all participants for this challenge
        all_participants = ChallengeParticipant.query.filter_by(challenge_id=challenge.id).all()
        
        # Sort by progress (descending for distance/time, ascending for fastest_5k)
        if challenge.challenge_type == 'fastest_5k':
            # For fastest 5K, lowest time wins
            all_participants.sort(key=lambda p: p.progress_value if p.progress_value > 0 else float('inf'))
        else:
            # For distance/time challenges, highest progress wins
            all_participants.sort(key=lambda p: p.progress_value, reverse=True)
        
        # Find user's rank
        user_rank = None
        for rank, p in enumerate(all_participants, 1):
            if p.user_id == user_id:
                user_rank = rank
                break
        
        # Count badges (only for top 3)
        if user_rank == 1:
            gold_count += 1
        elif user_rank == 2:
            silver_count += 1
        elif user_rank == 3:
            bronze_count += 1
    
    response = jsonify({
        'gold': gold_count,
        'silver': silver_count,
        'bronze': bronze_count
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

@users_bp.route('/activity-feed/<int:club_id>', methods=['GET'])
@jwt_required()
def get_activity_feed(club_id):
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    # Only return run activities (tracked manually or via GPS)
    activities = Activity.query.filter_by(
        club_id=club_id,
        activity_type='run'
    ).order_by(Activity.created_at.desc()).limit(50).all()
    
    activities_data = []
    for activity in activities:
        # Try to find the related run by parsing description
        run_id = None
        run_data = None
        if activity.activity_type == 'run':
            # Parse description like "John ran 5.00 km at 10.00 km/h"
            match = re.search(r'ran ([\d.]+) km at ([\d.]+) km/h', activity.description)
            if match:
                distance = float(match.group(1))
                speed = float(match.group(2))
                # Find the run that matches this distance and speed (within tolerance)
                # Also match by date - find runs created around the same time as the activity
                runs = Run.query.filter_by(user_id=activity.user_id).order_by(Run.date.desc()).all()
                
                # First try exact match with time proximity
                for run in runs:
                    if abs(run.distance_km - distance) < 0.01 and abs(run.speed_kmh - speed) < 0.01:
                        # Check if the run date is close to activity creation time (within 24 hours)
                        time_diff = abs((run.date - activity.created_at).total_seconds())
                        if time_diff < 86400:  # Within 24 hours
                            run_id = run.id
                            run_data = {
                                'distance_km': run.distance_km,
                                'duration_minutes': run.duration_minutes,
                                'speed_kmh': run.speed_kmh,
                                'notes': run.notes,
                                'date': run.date.isoformat()
                            }
                            break
                
                # If no exact match found, try matching by distance and speed with relaxed tolerance
                if not run_data:
                    for run in runs:
                        if abs(run.distance_km - distance) < 0.1 and abs(run.speed_kmh - speed) < 0.5:
                            # Check time proximity (within 24 hours)
                            time_diff = abs((run.date - activity.created_at).total_seconds())
                            if time_diff < 86400:  # Within 24 hours
                                run_id = run.id
                                run_data = {
                                    'distance_km': run.distance_km,
                                    'duration_minutes': run.duration_minutes,
                                    'speed_kmh': run.speed_kmh,
                                    'notes': run.notes,
                                    'date': run.date.isoformat()
                                }
                                break
                
                # Last resort: match by distance only if created within 24 hours
                if not run_data:
                    for run in runs:
                        if abs(run.distance_km - distance) < 0.5:
                            time_diff = abs((run.date - activity.created_at).total_seconds())
                            if time_diff < 86400:  # Within 24 hours
                                run_id = run.id
                                run_data = {
                                    'distance_km': run.distance_km,
                                    'duration_minutes': run.duration_minutes,
                                    'speed_kmh': run.speed_kmh,
                                    'notes': run.notes,
                                    'date': run.date.isoformat()
                                }
                                break
        
        activities_data.append({
            'id': activity.id,
            'type': activity.activity_type,
            'description': activity.description,
            'user_name': activity.user.name,
            'user_id': activity.user_id,
            'created_at': activity.created_at.isoformat(),
            'run_id': run_id,
            'run_data': run_data
        })
    
    response = jsonify(activities_data)
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

@users_bp.route('/activities/<int:activity_id>', methods=['PUT'])
@jwt_required()
def update_activity(activity_id):
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    activity = Activity.query.get(activity_id)
    if not activity:
        response = jsonify({'error': 'Activity not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if user owns this activity
    if activity.user_id != user_id:
        response = jsonify({'error': 'You can only edit your own activities'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    data = request.get_json()
    
    if not data:
        response = jsonify({'error': 'No data provided'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    try:
        # If it's a run activity, update the underlying run
        if activity.activity_type == 'run' and data.get('run_data'):
            run_data = data['run_data']
            
            # Find the related run
            match = re.search(r'ran ([\d.]+) km at ([\d.]+) km/h', activity.description)
            if match:
                distance = float(match.group(1))
                speed = float(match.group(2))
                runs = Run.query.filter_by(user_id=user_id).all()
                run = None
                for r in runs:
                    if abs(r.distance_km - distance) < 0.01 and abs(r.speed_kmh - speed) < 0.01:
                        run = r
                        break
                
                if run:
                    # Update run
                    if 'distance_km' in run_data:
                        run.distance_km = float(run_data['distance_km'])
                    if 'duration_minutes' in run_data:
                        run.duration_minutes = float(run_data['duration_minutes'])
                    if 'notes' in run_data:
                        run.notes = run_data['notes']
                    if 'date' in run_data:
                        try:
                            from datetime import datetime
                            run.date = datetime.fromisoformat(run_data['date'].replace('Z', '+00:00'))
                        except:
                            pass
                    
                    # Recalculate speed
                    if 'distance_km' in run_data or 'duration_minutes' in run_data:
                        run.speed_kmh = (run.distance_km / run.duration_minutes) * 60 if run.duration_minutes > 0 else 0
                    
                    # Update activity description
                    user = User.query.get(user_id)
                    activity.description = f'{user.name} ran {run.distance_km:.2f} km at {run.speed_kmh:.2f} km/h'
                    
                    db.session.commit()
                    
                    response = jsonify({
                        'id': activity.id,
                        'description': activity.description,
                        'created_at': activity.created_at.isoformat(),
                        'run_data': {
                            'distance_km': run.distance_km,
                            'duration_minutes': run.duration_minutes,
                            'speed_kmh': run.speed_kmh,
                            'notes': run.notes,
                            'date': run.date.isoformat()
                        }
                    })
                    response.headers.add('Access-Control-Allow-Origin', '*')
                    return response, 200
        
        # If no run update, just update description
        if 'description' in data:
            activity.description = data['description']
            db.session.commit()
        
        response = jsonify({
            'id': activity.id,
            'description': activity.description,
            'created_at': activity.created_at.isoformat()
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error updating activity: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to update activity: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

@users_bp.route('/activities/<int:activity_id>', methods=['DELETE'])
@jwt_required()
def delete_activity(activity_id):
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    activity = Activity.query.get(activity_id)
    if not activity:
        response = jsonify({'error': 'Activity not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if user owns this activity
    if activity.user_id != user_id:
        response = jsonify({'error': 'You can only delete your own activities'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    try:
        # Delete the activity (keep the run if it exists)
        db.session.delete(activity)
        db.session.commit()
        
        response = jsonify({'message': 'Activity deleted successfully'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error deleting activity: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to delete activity: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

@users_bp.route('/bulk-import', methods=['POST'])
@jwt_required()
def bulk_import_users():
    """Import users from an Excel file"""
    try:
        user_id_str = get_jwt_identity()
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    # Check if file is present
    if 'file' not in request.files:
        response = jsonify({'error': 'No file provided'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    file = request.files['file']
    
    if file.filename == '':
        response = jsonify({'error': 'No file selected'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Check file extension
    if not file.filename.endswith(('.xlsx', '.xls')):
        response = jsonify({'error': 'Invalid file type. Please upload an Excel file (.xlsx or .xls)'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    try:
        # Read Excel file
        file_content = file.read()
        df = pd.read_excel(io.BytesIO(file_content))
        
        # Validate required columns
        required_columns = ['name', 'email', 'password']
        missing_columns = [col for col in required_columns if col.lower() not in [c.lower() for c in df.columns]]
        
        if missing_columns:
            response = jsonify({
                'error': f'Missing required columns: {", ".join(missing_columns)}',
                'required_columns': required_columns,
                'found_columns': list(df.columns)
            })
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400
        
        # Normalize column names (case-insensitive)
        column_mapping = {}
        for col in df.columns:
            col_lower = col.lower().strip()
            if col_lower in ['name', 'email', 'password', 'address']:
                column_mapping[col] = col_lower
        
        # Rename columns to lowercase
        df = df.rename(columns=column_mapping)
        
        # Ensure we have the required columns
        if not all(col in df.columns for col in ['name', 'email', 'password']):
            response = jsonify({
                'error': 'Could not find required columns. Please ensure your Excel file has columns: name, email, password (and optionally address)'
            })
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 400
        
        # Process each row
        created_users = []
        skipped_users = []
        errors = []
        
        for index, row in df.iterrows():
            try:
                # Get values (handle NaN/empty values)
                name = str(row['name']).strip() if pd.notna(row.get('name')) else None
                email = str(row['email']).strip() if pd.notna(row.get('email')) else None
                password = str(row['password']).strip() if pd.notna(row.get('password')) else None
                address = str(row['address']).strip() if 'address' in row and pd.notna(row.get('address')) else None
                
                # Validate required fields
                if not name or not email or not password:
                    errors.append({
                        'row': index + 2,  # +2 because Excel is 1-indexed and has header
                        'error': 'Missing required field (name, email, or password)'
                    })
                    continue
                
                # Validate email format
                if '@' not in email:
                    errors.append({
                        'row': index + 2,
                        'error': f'Invalid email format: {email}'
                    })
                    continue
                
                # Check if user already exists
                existing_user = User.query.filter_by(email=email).first()
                if existing_user:
                    skipped_users.append({
                        'row': index + 2,
                        'email': email,
                        'reason': 'User already exists'
                    })
                    continue
                
                # Create new user
                user = User(
                    email=email,
                    name=name,
                    address=address
                )
                user.set_password(password)
                
                db.session.add(user)
                created_users.append({
                    'name': name,
                    'email': email
                })
                
            except Exception as e:
                errors.append({
                    'row': index + 2,
                    'error': f'Error processing row: {str(e)}'
                })
                continue
        
        # Commit all users
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            response = jsonify({
                'error': f'Failed to create users: {str(e)}',
                'created_count': len(created_users),
                'skipped_count': len(skipped_users),
                'error_count': len(errors)
            })
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 500
        
        response = jsonify({
            'message': 'Users imported successfully',
            'created_count': len(created_users),
            'skipped_count': len(skipped_users),
            'error_count': len(errors),
            'created_users': created_users,
            'skipped_users': skipped_users,
            'errors': errors
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except pd.errors.EmptyDataError:
        response = jsonify({'error': 'Excel file is empty'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        response = jsonify({'error': f'Failed to process Excel file: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

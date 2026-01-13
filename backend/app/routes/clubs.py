from flask import Blueprint, request, jsonify
from app.database import db
from app.models import Club, User, club_members, club_admins, Activity
from flask_jwt_extended import jwt_required, get_jwt_identity

clubs_bp = Blueprint('clubs', __name__)

# OPTIONS is handled globally in __init__.py before_request

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

@clubs_bp.route('', methods=['GET'])
@jwt_required()
def get_clubs():
    print("\n" + "="*60)
    print("GET /api/clubs - Request received")
    print("="*60)
    
    try:
        user_id_str = get_jwt_identity()
        # Convert to int since JWT returns string
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
        print(f"User ID from token: {user_id}")
    except Exception as e:
        print(f"JWT Error in get_clubs: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    try:
        clubs = Club.query.all()
        print(f"Found {len(clubs)} clubs in database")
        
        clubs_data = []
        for club in clubs:
            try:
                is_member = db.session.query(club_members).filter_by(
                    user_id=user_id, club_id=club.id
                ).first() is not None
                
                # Get member count by querying the association table
                member_count = db.session.query(club_members).filter_by(club_id=club.id).count()
                
                club_info = {
                    'id': club.id,
                    'name': club.name,
                    'description': club.description,
                    'location': club.location,
                    'member_count': member_count,
                    'is_member': is_member,
                    'created_at': club.created_at.isoformat()
                }
                print(f"  - Club {club.id}: {club.name} ({member_count} members, is_member: {is_member})")
                clubs_data.append(club_info)
            except Exception as e:
                print(f"Error processing club {club.id}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"Returning {len(clubs_data)} clubs")
        print("="*60 + "\n")
        
        response = jsonify(clubs_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
    except Exception as e:
        import traceback
        print(f"Error in get_clubs: {e}")
        traceback.print_exc()
        response = jsonify({'error': 'Failed to fetch clubs', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

# OPTIONS is handled globally in __init__.py before_request

@clubs_bp.route('', methods=['POST'])
@jwt_required()
def create_club():
    try:
        user_id_str = get_jwt_identity()
        # Convert to int since JWT returns string
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
    except Exception as e:
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    data = request.get_json()
    
    if not data or not data.get('name'):
        response = jsonify({'error': 'Club name is required'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    try:
        club = Club(
            name=data['name'],
            description=data.get('description'),
            location=data.get('location'),
            created_by=user_id
        )
        
        db.session.add(club)
        db.session.flush()  # Flush to get the club.id
        
        # Add creator as member
        user = User.query.get(user_id)
        if not user:
            db.session.rollback()
            response = jsonify({'error': 'User not found'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 404
        
        club.members.append(user)
        
        # Create activity
        activity = Activity(
            club_id=club.id,
            user_id=user_id,
            activity_type='join_club',
            description=f'{user.name} created the club "{club.name}"'
        )
        db.session.add(activity)
        
        db.session.commit()
        
        response = jsonify({
            'id': club.id,
            'name': club.name,
            'description': club.description,
            'location': club.location,
            'member_count': 1
        })
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 201
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error creating club: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to create club: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

@clubs_bp.route('/<int:club_id>', methods=['GET'])
@jwt_required()
def get_club(club_id):
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
    
    # Get all admin user IDs (creator + club_admins)
    admin_user_ids = set()
    admin_user_ids.add(club.created_by)
    admin_rows = db.session.query(club_admins).filter_by(club_id=club_id).all()
    for admin_row in admin_rows:
        admin_user_ids.add(admin_row.user_id)
    
    members = []
    for member in club.members:
        is_member_admin = member.id in admin_user_ids
        members.append({
            'id': member.id,
            'name': member.name,
            'email': member.email,
            'is_admin': is_member_admin
        })
    
    current_user_is_admin = is_club_admin(club_id, user_id)
    
    response = jsonify({
        'id': club.id,
        'name': club.name,
        'description': club.description,
        'location': club.location,
        'members': members,
        'member_count': len(members),
        'created_at': club.created_at.isoformat(),
        'created_by': club.created_by,
        'is_creator': club.created_by == user_id,
        'is_admin': current_user_is_admin
    })
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

@clubs_bp.route('/<int:club_id>/join', methods=['POST'])
@jwt_required()
def join_club(club_id):
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
    
    user = User.query.get(user_id)
    if not user:
        response = jsonify({'error': 'User not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    # Check if already a member
    is_member = db.session.query(club_members).filter_by(
        user_id=user_id, club_id=club.id
    ).first() is not None
    
    if is_member:
        response = jsonify({'error': 'Already a member of this club'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    club.members.append(user)
    
    # Create activity
    activity = Activity(
        club_id=club.id,
        user_id=user_id,
        activity_type='join_club',
        description=f'{user.name} joined the club'
    )
    db.session.add(activity)
    
    db.session.commit()
    
    response = jsonify({'message': 'Successfully joined club'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

@clubs_bp.route('/<int:club_id>', methods=['DELETE'])
@jwt_required()
def delete_club(club_id):
    print("\n" + "="*60)
    print(f"DELETE /api/clubs/{club_id} - Request received")
    print("="*60)
    
    try:
        user_id_str = get_jwt_identity()
        # Convert to int since JWT returns string
        user_id = int(user_id_str) if isinstance(user_id_str, str) else user_id_str
        print(f"User ID from token: {user_id}")
    except Exception as e:
        print(f"JWT Error in delete_club: {e}")
        import traceback
        traceback.print_exc()
        response = jsonify({'error': 'Invalid or expired token', 'details': str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 401
    
    try:
        club = Club.query.get(club_id)
        if not club:
            response = jsonify({'error': 'Club not found'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 404
        
        # Check if user is the creator
        if club.created_by != user_id:
            print(f"User {user_id} is not the creator (creator: {club.created_by})")
            response = jsonify({'error': 'Only the club creator can delete the club'})
            response.headers.add('Access-Control-Allow-Origin', '*')
            return response, 403
        
        print(f"Deleting club {club_id} (created by {user_id})")
        
        # Delete the club (cascade will handle related records)
        db.session.delete(club)
        db.session.commit()
        
        print(f"Successfully deleted club {club_id}")
        print("="*60 + "\n")
        
        response = jsonify({'message': 'Club deleted successfully'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200
        
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error deleting club: {e}")
        traceback.print_exc()
        response = jsonify({'error': f'Failed to delete club: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        return response, 500

@clubs_bp.route('/<int:club_id>/members/<int:member_id>/promote', methods=['POST'])
@jwt_required()
def promote_member_to_admin(club_id, member_id):
    """Promote a member to admin (admin only)"""
    try:
        user_id_str = get_jwt_identity()
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
    
    # Check if current user is an admin
    if not is_club_admin(club_id, user_id):
        response = jsonify({'error': 'Only club admins can promote members'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 403
    
    # Check if member exists and is a member of the club
    member = User.query.get(member_id)
    if not member:
        response = jsonify({'error': 'Member not found'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 404
    
    is_member = db.session.query(club_members).filter_by(
        user_id=member_id, club_id=club_id
    ).first() is not None
    
    if not is_member:
        response = jsonify({'error': 'User is not a member of this club'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Check if already an admin (creator is always admin, so skip if creator)
    if club.created_by == member_id:
        response = jsonify({'error': 'Club creator is already an admin'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Check if already in club_admins table
    already_admin = db.session.query(club_admins).filter_by(
        user_id=member_id, club_id=club_id
    ).first() is not None
    
    if already_admin:
        response = jsonify({'error': 'Member is already an admin'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Add to club_admins table
    insert_stmt = club_admins.insert().values(user_id=member_id, club_id=club_id)
    db.session.execute(insert_stmt)
    
    # Create activity
    promoter = User.query.get(user_id)
    activity = Activity(
        club_id=club_id,
        user_id=user_id,
        activity_type='admin',
        description=f'{promoter.name} promoted {member.name} to admin'
    )
    db.session.add(activity)
    
    db.session.commit()
    
    response = jsonify({'message': 'Member promoted to admin successfully'})
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response, 200

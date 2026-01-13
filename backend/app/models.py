from app.database import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime

# Association table for club members
club_members = db.Table('club_members',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('club_id', db.Integer, db.ForeignKey('club.id'), primary_key=True),
    db.Column('joined_at', db.DateTime, default=datetime.utcnow)
)

# Association table for club admins (additional admins beyond the creator)
club_admins = db.Table('club_admins',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('club_id', db.Integer, db.ForeignKey('club.id'), primary_key=True),
    db.Column('promoted_at', db.DateTime, default=datetime.utcnow)
)

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    # address = db.Column(db.String(200))  # Commented out - column doesn't exist in database
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    clubs = db.relationship('Club', secondary=club_members, backref='members', lazy='dynamic')
    runs = db.relationship('Run', backref='user', lazy=True)
    scheduled_runs = db.relationship('ScheduledRun', backref='creator', lazy=True)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Club(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    location = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Relationships
    scheduled_runs = db.relationship('ScheduledRun', backref='club', lazy=True, cascade='all, delete-orphan')
    activities = db.relationship('Activity', backref='club', lazy=True, cascade='all, delete-orphan')

class Run(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    distance_km = db.Column(db.Float, nullable=False)
    duration_minutes = db.Column(db.Float, nullable=False)
    speed_kmh = db.Column(db.Float, nullable=False)  # Calculated: distance/duration * 60
    date = db.Column(db.DateTime, default=datetime.utcnow)
    notes = db.Column(db.Text)
    
class ScheduledRun(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    club_id = db.Column(db.Integer, db.ForeignKey('club.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    scheduled_date = db.Column(db.DateTime, nullable=False)
    location = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Many-to-many for participants
    participants = db.relationship('User', 
        secondary='scheduled_run_participants',
        lazy='dynamic')

# Association table for scheduled run participants
scheduled_run_participants = db.Table('scheduled_run_participants',
    db.Column('user_id', db.Integer, db.ForeignKey('user.id'), primary_key=True),
    db.Column('scheduled_run_id', db.Integer, db.ForeignKey('scheduled_run.id'), primary_key=True)
)

class Activity(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    club_id = db.Column(db.Integer, db.ForeignKey('club.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    activity_type = db.Column(db.String(50), nullable=False)  # 'run', 'join_club', 'schedule_run'
    description = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    user = db.relationship('User', backref='activities')

class Challenge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    club_id = db.Column(db.Integer, db.ForeignKey('club.id'), nullable=False)
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    challenge_type = db.Column(db.String(50), nullable=False)  # 'weekly_mileage', 'fastest_5k', 'total_distance', 'total_time'
    goal_value = db.Column(db.Float, nullable=False)  # Goal in km, minutes, etc.
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    participants = db.relationship('ChallengeParticipant', backref='challenge', lazy=True, cascade='all, delete-orphan')
    
    club = db.relationship('Club', backref='challenges')

class ChallengeParticipant(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    challenge_id = db.Column(db.Integer, db.ForeignKey('challenge.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    progress_value = db.Column(db.Float, default=0.0)  # Current progress (km, minutes, etc.)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref='challenge_participations')
    progress_entries = db.relationship('ChallengeProgressEntry', backref='participant', lazy=True, cascade='all, delete-orphan')
    
    __table_args__ = (db.UniqueConstraint('challenge_id', 'user_id', name='_challenge_user_uc'),)

class ChallengeProgressEntry(db.Model):
    """Manual progress entries for challenges with optional images"""
    id = db.Column(db.Integer, primary_key=True)
    participant_id = db.Column(db.Integer, db.ForeignKey('challenge_participant.id'), nullable=False)
    challenge_id = db.Column(db.Integer, db.ForeignKey('challenge.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    progress_value = db.Column(db.Float, nullable=False)  # Progress added in this entry
    notes = db.Column(db.Text)
    image_url = db.Column(db.Text)  # Base64 encoded image or URL
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    challenge = db.relationship('Challenge', backref='progress_entries')
    user = db.relationship('User', backref='challenge_progress_entries')

class LiveRunSession(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    club_id = db.Column(db.Integer, db.ForeignKey('club.id'), nullable=True)  # Optional - for club sharing
    started_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    last_location_update = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='active')  # 'active', 'paused', 'stopped'
    
    # Relationships
    user = db.relationship('User', backref='live_sessions')
    club = db.relationship('Club', backref='active_live_sessions')
    locations = db.relationship('LiveRunLocation', backref='session', lazy=True, cascade='all, delete-orphan', order_by='LiveRunLocation.timestamp')

class LiveRunLocation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey('live_run_session.id'), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float)
    speed = db.Column(db.Float)  # km/h
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

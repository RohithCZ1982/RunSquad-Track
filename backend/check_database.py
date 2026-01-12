from app import create_app
from app.models import Club, User, Run, Activity, ScheduledRun
from app.database import db

app = create_app()

with app.app_context():
    print("=" * 60)
    print("DATABASE CHECK")
    print("=" * 60)
    
    # Check users
    users = User.query.all()
    print(f"\nUsers: {len(users)}")
    for user in users:
        print(f"  - ID: {user.id}, Name: {user.name}, Email: {user.email}")
    
    # Check clubs
    clubs = Club.query.all()
    print(f"\nClubs: {len(clubs)}")
    for club in clubs:
        print(f"  - ID: {club.id}, Name: {club.name}")
        print(f"    Description: {club.description}")
        print(f"    Location: {club.location}")
        print(f"    Created by: {club.created_by}")
        print(f"    Members: {len(list(club.members))}")
        for member in club.members:
            print(f"      - {member.name} ({member.email})")
    
    # Check runs
    runs = Run.query.all()
    print(f"\nRuns: {len(runs)}")
    for run in runs[:5]:  # Show first 5
        print(f"  - ID: {run.id}, User: {run.user_id}, Distance: {run.distance_km}km, Speed: {run.speed_kmh}km/h")
    
    # Check activities
    activities = Activity.query.all()
    print(f"\nActivities: {len(activities)}")
    for activity in activities[:5]:  # Show first 5
        print(f"  - ID: {activity.id}, Club: {activity.club_id}, Type: {activity.activity_type}")
        print(f"    Description: {activity.description}")
    
    # Check scheduled runs
    scheduled_runs = ScheduledRun.query.all()
    print(f"\nScheduled Runs: {len(scheduled_runs)}")
    for run in scheduled_runs:
        print(f"  - ID: {run.id}, Club: {run.club_id}, Title: {run.title}")
    
    print("\n" + "=" * 60)

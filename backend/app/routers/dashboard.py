import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.user import User
from app.models.activity import Activity, ActivityType
from pydantic import BaseModel
from datetime import datetime

logger = logging.getLogger(__name__)
router = APIRouter()


#  Schemas 

class ActivityOut(BaseModel):
    id: str
    type: str
    title: str
    created_at: datetime

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_searches: int
    gaps_identified: int
    proposals_generated: int


class DashboardResponse(BaseModel):
    stats: DashboardStats
    recent_activity: list[ActivityOut]


# Endpoint 

@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns dashboard stats and recent activity for the logged-in user.
    """
    user_id = current_user.id

    # Count each activity type
    def count_type(activity_type: ActivityType) -> int:
        return (
            db.query(func.count(Activity.id))
            .filter(Activity.user_id == user_id, Activity.type == activity_type)
            .scalar() or 0
        )

    stats = DashboardStats(
        total_searches=count_type(ActivityType.SEARCH),
        gaps_identified=count_type(ActivityType.GAP),
        proposals_generated=count_type(ActivityType.PROPOSAL),
    )

    # Last 5 activities sorted by newest first
    recent = (
        db.query(Activity)
        .filter(Activity.user_id == user_id)
        .order_by(Activity.created_at.desc())
        .limit(5)
        .all()
    )

    recent_out = [
        ActivityOut(
            id=str(a.id),
            type=a.type,
            title=a.title,
            created_at=a.created_at,
        )
        for a in recent
    ]

    return DashboardResponse(stats=stats, recent_activity=recent_out)

from datetime import datetime, timedelta
from sqlalchemy import text

@router.post("/dashboard/activity", status_code=201)
def log_activity(
    type: ActivityType,
    title: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Log activity with a distributed lock to prevent race condition duplicates.
    Uses PostgreSQL advisory lock so even simultaneous requests are deduplicated.
    """
    # Create a consistent lock key from user_id + type + title
    import hashlib
    lock_key = int(
        hashlib.md5(
            f"{current_user.id}:{type}:{title}".encode()
        ).hexdigest()[:8], 16
    )

    # Acquire PostgreSQL advisory lock (blocks other identical concurrent requests)
    db.execute(text(f"SELECT pg_advisory_xact_lock({lock_key})"))

    # Now safely check for recent duplicate
    one_minute_ago = datetime.utcnow() - timedelta(minutes=1)

    existing = (
        db.query(Activity)
        .filter(
            Activity.user_id == current_user.id,
            Activity.type == type,
            Activity.title == title,
            Activity.created_at >= one_minute_ago,
        )
        .first()
    )

    if existing:
        return {"message": "Skipped duplicate"}

    activity = Activity(
        user_id=current_user.id,
        type=type,
        title=title,
    )
    db.add(activity)
    db.commit()
    return {"message": "Activity logged"}
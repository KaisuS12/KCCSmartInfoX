from models.database import ActivityLog, StaffAccount


def resolve_actor(admin: dict, db) -> tuple:
    """Return (display_name, role) for the current authenticated user."""
    role = admin.get("role", "admin")
    if role == "staff":
        s = db.query(StaffAccount).filter(StaffAccount.username == admin.get("sub")).first()
        name = (s.full_name or admin.get("sub")) if s else admin.get("sub")
    else:
        name = "Admin"
    return name, role


def log_activity(db, actor: str, actor_role: str, action: str,
                 target_type=None, target_id=None, detail=None):
    """Append an activity entry. Caller must db.commit() after."""
    db.add(ActivityLog(
        actor=actor,
        actor_role=actor_role,
        action=action,
        target_type=target_type,
        target_id=str(target_id) if target_id is not None else None,
        detail=detail,
    ))

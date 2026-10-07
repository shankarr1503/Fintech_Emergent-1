from datetime import datetime

from bson import ObjectId


def serialize_doc(doc):
    """Convert MongoDB document(s) to JSON-serializable dicts."""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if key == "_id":
                continue
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(v) if isinstance(v, dict) else v for v in value]
            else:
                result[key] = value
        return result
    return doc


def months_ago_label(n: int, now: datetime | None = None) -> str:
    """'Sep 2026'-style label for the month n months before now."""
    now = now or datetime.utcnow()
    year, month = now.year, now.month - n
    while month <= 0:
        month += 12
        year -= 1
    return datetime(year, month, 1).strftime("%b %Y")

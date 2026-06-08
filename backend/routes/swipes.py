# backend/routes/swipes.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from db.database import get_connection
from middleware.auth import authenticate

router = APIRouter()

class SwipeRequest(BaseModel):
    listing_id: str
    direction: str

@router.post("/", status_code=201)
def record_swipe(body: SwipeRequest, user=Depends(authenticate)):
    if body.direction not in ("left", "right"):
        raise HTTPException(400, "Direction must be left or right")

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM listings WHERE id = %s AND is_active = TRUE", (body.listing_id,))
        if not cur.fetchone():
            raise HTTPException(404, "Listing not found")

        cur.execute(
            """INSERT INTO swipes (user_id, listing_id, direction)
               VALUES (%s, %s, %s)
               ON CONFLICT (user_id, listing_id) DO NOTHING
               RETURNING *""",
            (user["id"], body.listing_id, body.direction)
        )
        row = cur.fetchone()
        conn.commit()
        return {"swipe": dict(row) if row else None, "matched": body.direction == "right"}
    finally:
        cur.close()
        conn.close()

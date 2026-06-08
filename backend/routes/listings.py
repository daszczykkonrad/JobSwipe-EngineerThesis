# backend/routes/listings.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from db.database import get_connection
from middleware.auth import authenticate

router = APIRouter()

class ListingRequest(BaseModel):
    title: str
    description: str
    category: str
    type: str
    pay_amount: Optional[float] = None
    pay_type: Optional[str] = None
    location: Optional[str] = None
    is_remote: bool = False

@router.get("/feed")
def get_feed(category: str = None, type: str = None, user=Depends(authenticate)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        query = """
            SELECT l.*, u.full_name AS employer_name, u.avatar_url AS employer_avatar
            FROM listings l
            JOIN users u ON u.id = l.employer_id
            WHERE l.is_active = TRUE
              AND l.employer_id != %s
              AND l.id NOT IN (SELECT listing_id FROM swipes WHERE user_id = %s)
        """
        params = [user["id"], user["id"]]
        if category:
            query += " AND l.category = %s"
            params.append(category)
        if type:
            query += " AND l.type = %s"
            params.append(type)
        query += " ORDER BY l.created_at DESC LIMIT 20"
        cur.execute(query, params)
        return [dict(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@router.get("/{listing_id}")
def get_listing(listing_id: str, user=Depends(authenticate)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT l.*, u.full_name AS employer_name
               FROM listings l JOIN users u ON u.id = l.employer_id
               WHERE l.id = %s""",
            (listing_id,)
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Listing not found")
        return dict(row)
    finally:
        cur.close()
        conn.close()

@router.post("/", status_code=201)
def create_listing(body: ListingRequest, user=Depends(authenticate)):
    if user["role"] != "employer":
        raise HTTPException(403, "Only employers can create listings")
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """INSERT INTO listings
               (employer_id, title, description, category, type, pay_amount, pay_type, location, is_remote)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
            (user["id"], body.title, body.description, body.category, body.type,
             body.pay_amount, body.pay_type, body.location, body.is_remote)
        )
        row = dict(cur.fetchone())
        conn.commit()
        return row
    finally:
        cur.close()
        conn.close()

@router.delete("/{listing_id}")
def delete_listing(listing_id: str, user=Depends(authenticate)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "DELETE FROM listings WHERE id = %s AND employer_id = %s RETURNING id",
            (listing_id, user["id"])
        )
        if not cur.fetchone():
            raise HTTPException(404, "Listing not found or not authorized")
        conn.commit()
        return {"message": "Listing deleted"}
    finally:
        cur.close()
        conn.close()

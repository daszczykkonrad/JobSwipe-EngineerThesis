# backend/routes/applications.py
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from db.database import get_connection
from middleware.auth import authenticate

router = APIRouter()

class ApplicationRequest(BaseModel):
    listing_id: str
    message: str
    ai_generated: Optional[bool] = False

class StatusRequest(BaseModel):
    status: str

@router.post("/", status_code=201)
def submit_application(body: ApplicationRequest, user=Depends(authenticate)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT id FROM swipes WHERE user_id = %s AND listing_id = %s AND direction = 'right'",
            (user["id"], body.listing_id)
        )
        swipe = cur.fetchone()
        if not swipe:
            raise HTTPException(400, "You must swipe right before applying")

        cur.execute(
            "SELECT id FROM applications WHERE worker_id = %s AND listing_id = %s",
            (user["id"], body.listing_id)
        )
        if cur.fetchone():
            raise HTTPException(409, "Already applied to this listing")

        cur.execute(
            """INSERT INTO applications (swipe_id, worker_id, listing_id, message, ai_generated)
               VALUES (%s, %s, %s, %s, %s) RETURNING *""",
            (swipe["id"], user["id"], body.listing_id, body.message, body.ai_generated)
        )
        row = dict(cur.fetchone())
        conn.commit()
        return row
    finally:
        cur.close()
        conn.close()

@router.get("/mine")
def get_my_applications(user=Depends(authenticate)):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT a.*, l.title, l.category, l.type, l.pay_amount, l.pay_type,
                      u.full_name AS employer_name
               FROM applications a
               JOIN listings l ON l.id = a.listing_id
               JOIN users u ON u.id = l.employer_id
               WHERE a.worker_id = %s
               ORDER BY a.created_at DESC""",
            (user["id"],)
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@router.get("/listing/{listing_id}")
def get_listing_applications(listing_id: str, user=Depends(authenticate)):
    if user["role"] != "employer":
        raise HTTPException(403, "Only employers can view listing applications")
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """SELECT a.*, u.full_name AS worker_name, u.avatar_url, u.bio, u.location
               FROM applications a
               JOIN users u ON u.id = a.worker_id
               JOIN listings l ON l.id = a.listing_id
               WHERE a.listing_id = %s AND l.employer_id = %s
               ORDER BY a.created_at DESC""",
            (listing_id, user["id"])
        )
        return [dict(r) for r in cur.fetchall()]
    finally:
        cur.close()
        conn.close()

@router.patch("/{application_id}/status")
def update_status(application_id: str, body: StatusRequest, user=Depends(authenticate)):
    if user["role"] != "employer":
        raise HTTPException(403, "Only employers can update application status")
    if body.status not in ("accepted", "rejected"):
        raise HTTPException(400, "Status must be accepted or rejected")
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            """UPDATE applications a
               SET status = %s, updated_at = NOW()
               FROM listings l
               WHERE a.id = %s AND a.listing_id = l.id AND l.employer_id = %s
               RETURNING a.*""",
            (body.status, application_id, user["id"])
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(404, "Application not found or not authorized")
        conn.commit()
        return dict(row)
    finally:
        cur.close()
        conn.close()

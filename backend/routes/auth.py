# backend/routes/auth.py
import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from db.database import get_connection
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str
    location: str = None
    bio: str = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, os.getenv("JWT_SECRET"), algorithm="HS256")

@router.post("/register", status_code=201)
def register(body: RegisterRequest):
    if body.role not in ("worker", "employer"):
        raise HTTPException(400, "Role must be worker or employer")
    if len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        if cur.fetchone():
            raise HTTPException(409, "Email already registered")

        password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
        cur.execute(
            """INSERT INTO users (email, password_hash, full_name, role, location, bio)
               VALUES (%s, %s, %s, %s, %s, %s)
               RETURNING id, email, full_name, role, location, bio, created_at""",
            (body.email, password_hash, body.full_name, body.role, body.location, body.bio)
        )
        user = dict(cur.fetchone())
        conn.commit()
        token = create_token(str(user["id"]), user["email"], user["role"])
        return {"token": token, "user": user}
    finally:
        cur.close()
        conn.close()

@router.post("/login")
def login(body: LoginRequest):
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute("SELECT * FROM users WHERE email = %s", (body.email,))
        user = cur.fetchone()
        if not user:
            raise HTTPException(401, "Invalid credentials")

        user = dict(user)
        if not bcrypt.checkpw(body.password.encode(), user["password_hash"].encode()):
            raise HTTPException(401, "Invalid credentials")

        token = create_token(str(user["id"]), user["email"], user["role"])
        user.pop("password_hash")
        return {"token": token, "user": user}
    finally:
        cur.close()
        conn.close()

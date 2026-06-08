# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, listings, swipes, applications, ai

app = FastAPI(title="JobSwipe API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(listings.router, prefix="/api/listings", tags=["listings"])
app.include_router(swipes.router, prefix="/api/swipes", tags=["swipes"])
app.include_router(applications.router, prefix="/api/applications", tags=["applications"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])

@app.get("/api/health")
def health():
    return {"status": "ok"}

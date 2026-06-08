# backend/routes/ai.py
import os
import httpx
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from middleware.auth import authenticate
from dotenv import load_dotenv

load_dotenv()
router = APIRouter()

class AIRequest(BaseModel):
    listing: dict

@router.post("/generate-message")
async def generate_message(body: AIRequest, user=Depends(authenticate)):
    listing = body.listing

    prompt = f"""Jesteś asystentem pomagającym osobom szukającym pracy napisać krótką, profesjonalną wiadomość aplikacyjną po polsku na poniższe ogłoszenie:

Stanowisko: {listing.get('title')}
Kategoria: {listing.get('category')}
Typ: {listing.get('type')}
Opis: {listing.get('description')}
{f"Wynagrodzenie: {listing.get('pay_amount')} PLN ({listing.get('pay_type')})" if listing.get('pay_amount') else ""}
{f"Lokalizacja: {listing.get('location')}" if listing.get('location') else ""}

Napisz krótką, naturalną i profesjonalną wiadomość aplikacyjną (3-5 zdań) po polsku.
Wiadomość powinna:
- Wyrażać szczere zainteresowanie ofertą
- Krótko wspomnieć o dostępności i motywacji kandydata
- Brzmieć jak napisana przez prawdziwą osobę, a nie robota
- NIE zawierać tematu, powitania ani formalnego zakończenia
- Być gotowa do wysłania

Odpowiedz tylko treścią wiadomości, niczym więcej."""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": os.getenv("ANTHROPIC_API_KEY"),
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "claude-haiku-4-5-20251001",
                    "max_tokens": 300,
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=15.0,
            )

        data = response.json()
        if response.status_code != 200:
            raise HTTPException(502, "AI service unavailable")

        message = data["content"][0]["text"].strip()
        return {"message": message}

    except httpx.TimeoutException:
        raise HTTPException(504, "AI request timed out")
    except Exception as e:
        raise HTTPException(500, f"Internal server error: {str(e)}")

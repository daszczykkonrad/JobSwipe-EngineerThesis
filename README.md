# JobSwipe

## Stack
- **Backend:** Python + FastAPI
- **Baza danych:** PostgreSQL
- **Frontend:** React Native (Expo)
- **AI:** Anthropic Claude API

---


## Struktura projektu

```
jobswipe/
├── backend/
│   ├── main.py                   
│   ├── requirements.txt          
│   ├── .env.example              
│   ├── db/
│   │   ├── schema.sql            
│   │   └── database.py           
│   ├── middleware/
│   │   └── auth.py               
│   └── routes/
│       ├── auth.py               
│       ├── listings.py           
│       ├── swipes.py             
│       ├── applications.py       
│       └── ai.py                 
└── frontend/
    ├── App.js
    └── src/
        ├── screens/
        │   └── SwipeScreen.js    
        ├── components/
        │   └── ApplyModal.js    
        └── services/
            └── api.js            
```

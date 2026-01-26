import os
from groq import Groq
from pymongo import MongoClient
import json
import time

GROQ_API_KEY = "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"
uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0"

client = MongoClient(uri)
db = client['elimfilters']
col = db['MASTER_CLEAN_V1']
groq_client = Groq(api_key=GROQ_API_KEY)

print("🚀 INICIANDO MODO PRODUCCIÓN (Bucle Infinito)...")

while True:
    cursor = col.find({"brand": {"$exists": False}}).limit(100)
    items = list(cursor)
    
    if not items:
        print("✅ ¡Felicidades! Todo el inventario ha sido clasificado.")
        break
        
    codigos = [item['Input_Code'] for item in items]
    
    prompt = f"""
    Analiza estos códigos: {codigos}.
    Identifica Marca, Aplicación (HD/LD) y Tipo (Aire, Aceite, etc.).
    Responde SOLO en JSON plano: {{"CODIGO": {{"marca": "Marca", "aplicacion": "HD/LD", "tipo": "Tipo"}}}}
    """

    try:
        completion = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            response_format={ "type": "json_object" }
        )
        
        res = json.loads(completion.choices[0].message.content)

        for c, info in res.items():
            col.update_one(
                {"Input_Code": c},
                {"$set": {
                    "brand": info.get("marca"),
                    "application": info.get("aplicacion"),
                    "category": info.get("tipo"),
                    "status": "CLASSIFIED_AUTO"
                }}
            )
        print(f"📦 Lote de {len(res)} procesado. Total en DB: {col.count_documents({'brand': {'$exists': True}})}")
        time.sleep(2) # Pausa para no saturar la API

    except Exception as e:
        print(f"🛑 Pausa o Error: {e}")
        time.sleep(10) # Espera más si hay error

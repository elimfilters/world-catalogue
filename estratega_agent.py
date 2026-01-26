import os
import time
import json
from pymongo import MongoClient
from groq import Groq

# Conexión Segura
try:
    client_mongo = MongoClient("mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0")
    db = client_mongo['elimfilters']
    col_raw = db['MASTER_UNIFIED_V5']
    col_clean = db['MASTER_CLEAN_V1']
    
    # Tu llave actual de Groq
    client_groq = Groq(api_key="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") 
    print("🚀 Agente Estratega Online. Buscando trabajo...")
except Exception as e:
    print(f"❌ Error de conexión: {e}")

def ejecutar_estratega():
    while True:
        # Busca códigos RAW (Crudos) que el Minero ya subió
        pendientes = list(col_raw.find({"status": "RAW"}).limit(5))
        
        if not pendientes:
            print("😴 Esperando que el Minero suba más códigos...")
            time.sleep(15)
            continue

        for item in pendientes:
            sku = item['Input_Code']
            print(f"🧠 Analizando SKU: {sku}")
            
            try:
                prompt = f"Identify brand and filter type for: {sku}. Return ONLY JSON: {{'brand': '...', 'type': '...'}}"
                
                completion = client_groq.chat.completions.create(
                    messages=[{"role": "user", "content": prompt}],
                    model="llama3-8b-8192",
                    response_format={"type": "json_object"}
                )
                
                res = json.loads(completion.choices[0].message.content)
                
                # Guardar el 'Oro' ya clasificado
                col_clean.update_one(
                    {"Input_Code": sku},
                    {"$set": {
                        "brand": res.get('brand'),
                        "type": res.get('type'),
                        "source_file": item.get('sources', ['manual'])[0],
                        "processed_at": time.ctime()
                    }},
                    upsert=True
                )
                
                # Marcar como clasificado en la base principal
                col_raw.update_one({"_id": item["_id"]}, {"$set": {"status": "CLASSIFIED"}})
                print(f"✅ Clasificado: {sku} -> {res.get('brand')} ({res.get('type')})")
                
            except Exception as e:
                if "429" in str(e):
                    print("⏳ Límite de Groq alcanzado. Durmiendo 60 segundos...")
                    time.sleep(60)
                else:
                    print(f"⚠️ Error: {e}")
                break
        
        time.sleep(1) # Evita sobrecalentar la API

if __name__ == "__main__":
    ejecutar_estratega()

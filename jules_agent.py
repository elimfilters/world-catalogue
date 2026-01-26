import os
import json
import time
from pymongo import MongoClient, UpdateOne
import google.generativeai as genai

# CONFIGURACIÓN MAESTRA
MONGO_URI = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0"
genai.configure(api_key="AIzaSyAgskmQQLReu-XdzBH-ngLeNF9CTWScOwk")

client = MongoClient(MONGO_URI)
db = client['elimfilters']
col_raw = db['MASTER_UNIFIED_V5']
col_clean = db['MASTER_CLEAN_V1']

# Usamos la versión estable más reciente
model = genai.GenerativeModel('gemini-1.5-flash-latest')

def jules_process():
    print("🧠 JULES (GEMINI) RE-CALIBRADO. Iniciando clasificación...")
    
    while True:
        try:
            # Tomamos un lote pequeño para probar la conexión
            cursor = col_raw.find({"status": "RAW"}).limit(15)
            pendientes = list(cursor)
            
            if not pendientes:
                print("😴 Esperando nuevos códigos del Minero...")
                time.sleep(15)
                continue
                
            skus = [p['Input_Code'] for p in pendientes]
            
            prompt = f"""Expert analysis of industrial filter codes. 
            Identify BRAND and TYPE (Air, Oil, Fuel, Hydraulic, etc).
            Codes: {', '.join(skus)}
            Return ONLY JSON format:
            {{"resultados": [{{"sku": "CODE", "brand": "BRAND", "type": "TYPE"}}]}}"""

            response = model.generate_content(prompt)
            
            # Limpieza profunda del texto de respuesta
            text_clean = response.text.replace('```json', '').replace('```', '').strip()
            data = json.loads(text_clean)

            updates = []
            for res in data['resultados']:
                updates.append(UpdateOne(
                    {"Input_Code": res['sku']},
                    {"$set": {
                        "brand": res['brand'], 
                        "type": res['type'], 
                        "status": "CLASSIFIED",
                        "agent": "Jules-Flash-Latest"
                    }},
                    upsert=True
                ))
            
            if updates:
                col_clean.bulk_write(updates)
                col_raw.update_many(
                    {"Input_Code": {"$in": skus}}, 
                    {"$set": {"status": "PROCESSED"}}
                )
                print(f"✅ Jules procesó {len(updates)} códigos de forma exitosa.")

        except Exception as e:
            if "404" in str(e):
                print("⚠️ Error de modelo. Probando alternativa...")
                # Intento de emergencia con otro nombre si el principal falla
                time.sleep(5)
            else:
                print(f"⚠️ Pausa técnica: {e}")
                time.sleep(10)

if __name__ == "__main__":
    jules_process()

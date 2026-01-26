import os
import json
import time
from pymongo import MongoClient, UpdateOne
import google.generativeai as genai

# CONFIGURACIÓN
genai.configure(api_key="AIzaSyAgskmQQLReu-XdzBH-ngLeNF9CTWScOwk")
client = MongoClient("mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/")
db = client['elimfilters']
col_raw = db['MASTER_UNIFIED_V5']
col_clean = db['MASTER_CLEAN_V1']
model = genai.GenerativeModel('gemini-1.5-flash-latest')

def start_orchestrator():
    print("🚀 JULES INTEGRADO: Iniciando clasificación...")
    while True:
        try:
            docs = list(col_raw.find({"status": "RAW"}).limit(20))
            if not docs:
                print("😴 Esperando más códigos del Minero...")
                time.sleep(10)
                continue

            skus = [d['Input_Code'] for d in docs]
            prompt = f"Identify BRAND and TYPE for these industrial filters: {', '.join(skus)}. Return ONLY JSON: {{\"data\": [{{'sku': '...', 'brand': '...', 'type': '...'}}]}}"
            
            response = model.generate_content(prompt)
            clean_json = response.text.replace('```json', '').replace('```', '').strip()
            items = json.loads(clean_json)['data']

            for item in items:
                col_clean.update_one({"Input_Code": item['sku']}, {"$set": {"brand": item['brand'], "type": item['type']}}, upsert=True)
                col_raw.update_one({"Input_Code": item['sku']}, {"$set": {"status": "CLASSIFIED"}})
            
            print(f"✅ Procesados {len(items)} códigos.")
        except Exception as e:
            print(f"⚠️ Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    start_orchestrator()

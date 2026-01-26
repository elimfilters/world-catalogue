import os
import time
from pymongo import MongoClient, UpdateOne
import google.generativeai as genai

# Llave y Conexión
genai.configure(api_key="AIzaSyAgskmQQLReu-XdzBH-ngLeNF9CTWScOwk")
client = MongoClient("mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/")
col = client['elimfilters']['MASTER_UNIFIED_V5']

def jules_pdf_worker():
    # Usamos el nombre de modelo estable para evitar el error 404
    model = genai.GenerativeModel('gemini-1.5-flash-latest')
    path = r"C:\Users\VICTOR ABREU\Elimfilters-Orchestrator\catalogos_pdf"
    
    print("🚀 JULES INICIANDO: Procesando archivos PDF...")

    for archivo in os.listdir(path):
        if archivo.lower().endswith(".pdf"):
            print(f"📄 Procesando con Jules: {archivo}")
            try:
                # Subir archivo temporalmente a Google para que Jules lo lea
                uploaded_file = genai.upload_file(path=os.path.join(path, archivo))
                
                # Pedirle a la IA que extraiga la data
                prompt = "Extrae todos los números de parte o SKUs de este documento. Devuélvelos como una lista simple separada por comas, sin texto adicional."
                response = model.generate_content([uploaded_file, prompt])
                
                codigos = [c.strip() for c in response.text.split(",") if len(c.strip()) > 4]
                
                if codigos:
                    ops = [UpdateOne({"Input_Code": c}, {"$addToSet": {"sources": archivo}, "$set": {"status": "RAW"}}, upsert=True) for c in codigos]
                    col.bulk_write(ops, ordered=False)
                    print(f"✅ {archivo}: {len(codigos)} códigos enviados a la base de datos.")
                
            except Exception as e:
                print(f"⚠️ Error en {archivo}: {e}")

if __name__ == "__main__":
    jules_pdf_worker()

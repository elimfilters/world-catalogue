import re
import os
from pymongo import MongoClient, UpdateOne

def detective_miner():
    uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0"
    client = MongoClient(uri)
    col = client['elimfilters']['MASTER_UNIFIED_V5']
    sku_pattern = re.compile(r'\b[A-Z0-9\-\.]{5,17}\b')
    
    target_dir = r"C:\Users\VICTOR ABREU\Elimfilters-Orchestrator\catalogos_pdf"
    
    print(f"🔎 Buscando en: {target_dir}")
    if not os.path.exists(target_dir):
        print("❌ La carpeta ni siquiera existe.")
        return

    # Listar todo lo que hay
    archivos = os.listdir(target_dir)
    print(f"📁 Contenido de la carpeta: {archivos}")

    # Buscar cualquier archivo que sea .txt
    txt_files = [f for f in archivos if f.lower().endswith('.txt')]
    
    if not txt_files:
        print("❌ No hay NINGÚN archivo .txt en esa carpeta.")
        return

    txt_path = os.path.join(target_dir, txt_files[0])
    print(f"🚀 ¡Encontrado! Minando: {txt_path}")

    with open(txt_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
        matches = sku_pattern.findall(content)
        
        if matches:
            clean = list(set([m.strip('.') for m in matches if any(c.isdigit() for c in m)]))
            print(f"💎 Encontrados {len(clean)} códigos. Subiendo...")
            
            batch_size = 500
            for i in range(0, len(clean), batch_size):
                chunk = clean[i:i + batch_size]
                ops = [UpdateOne({"Input_Code": c}, {"$addToSet": {"sources": txt_files[0]}}, upsert=True) for c in chunk]
                col.bulk_write(ops, ordered=False)
            print("✅ ¡Misión cumplida!")

if __name__ == "__main__":
    detective_miner()

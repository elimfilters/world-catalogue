import fitz
import re
import os
from pymongo import MongoClient, UpdateOne

class FlashMiner:
    def __init__(self, uri):
        self.col = MongoClient(uri)['elimfilters']['MASTER_UNIFIED_V5']
        self.sku_pattern = re.compile(r'\b[A-Z0-9\-\.]{5,17}\b')

    def fast_mine(self, path):
        fn = os.path.basename(path)
        if "Interchange" in fn: return # Saltamos el gigante por ahora
        
        print(f"⚡ Extrayendo texto de: {fn}")
        try:
            doc = fitz.open(path)
            # Extraemos TODO el texto de un solo golpe (Modo Stream)
            full_text = "".join([page.get_text("text") for page in doc])
            matches = set(self.sku_pattern.findall(full_text))
            doc.close()

            clean = [m.strip('.') for m in matches if any(c.isdigit() for c in m) and len(m) >= 5]
            if clean:
                # Subida masiva en un solo viaje a la red
                ops = [UpdateOne({"Input_Code": c}, {"$addToSet": {"sources": fn}, "$set": {"status": "RAW"}}, upsert=True) for c in clean]
                self.col.bulk_write(ops, ordered=False)
                print(f"✅ {fn}: {len(clean)} códigos inyectados.")
        except Exception as e:
            print(f"❌ Error en {fn}: {e}")

if __name__ == "__main__":
    uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0"
    target = r"C:\Users\VICTOR ABREU\Elimfilters-Orchestrator\catalogos_pdf"
    miner = FlashMiner(uri)
    for f in os.listdir(target):
        if f.endswith(".pdf"): miner.fast_mine(os.path.join(target, f))

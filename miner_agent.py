import fitz
import re
import os
from pymongo import MongoClient, UpdateOne

class ResilientMiner:
    def __init__(self, db_uri):
        self.client = MongoClient(db_uri)
        self.db = self.client['elimfilters']
        self.col = self.db['MASTER_UNIFIED_V5']
        self.sku_pattern = re.compile(r'\b[A-Z0-9\-\.]{5,17}\b')

    def mine_pdf(self, file_path):
        fn = os.path.basename(file_path)
        print(f"⛏️  Atacando archivo pesado: {fn}...")
        try:
            doc = fitz.open(file_path)
            all_codes = set()
            for page in doc:
                text = page.get_text()
                matches = self.sku_pattern.findall(text)
                for m in matches:
                    if any(c.isdigit() for c in m) and len(m) >= 5:
                        all_codes.add(m.strip('.'))
            doc.close()

            if all_codes:
                codes_list = list(all_codes)
                batch_size = 200 # Bloques pequeños para no saturar Atlas
                total = 0
                for i in range(0, len(codes_list), batch_size):
                    chunk = codes_list[i:i + batch_size]
                    ops = [UpdateOne({"Input_Code": c}, {"$addToSet": {"sources": fn}, "$set": {"status": "RAW"}}, upsert=True) for c in chunk]
                    self.col.bulk_write(ops, ordered=False)
                    total += len(ops)
                return total
            return 0
        except Exception as e:
            print(f"❌ Error en {fn}: {e}")
            return 0

if __name__ == "__main__":
    uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0"
    target_folder = r"C:\Users\VICTOR ABREU\Elimfilters-Orchestrator\catalogos_pdf"
    miner = ResilientMiner(uri)
    if os.path.exists(target_folder):
        files = [f for f in os.listdir(target_folder) if f.endswith(".pdf")]
        for f in files:
            res = miner.mine_pdf(os.path.join(target_folder, f))
            print(f"✅ {f}: {res} códigos procesados.")
    else:
        print("❌ Ruta no encontrada.")

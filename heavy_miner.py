import fitz
import re
import os
from pymongo import MongoClient, UpdateOne

class HeavyDutyMiner:
    def __init__(self, db_uri):
        self.client = MongoClient(db_uri)
        self.db = self.client['elimfilters']
        self.col = self.db['MASTER_UNIFIED_V5']
        self.sku_pattern = re.compile(r'\b[A-Z0-9\-\.]{5,17}\b')

    def mine_heavy_pdf(self, file_path):
        fn = os.path.basename(file_path)
        print(f"🚜 Atacando el gigante: {fn}")
        try:
            doc = fitz.open(file_path)
            total_pages = len(doc)
            print(f"📖 El manual tiene {total_pages} páginas. Procesando por goteo...")
            
            for i in range(total_pages):
                page = doc.load_page(i)
                text = page.get_text()
                matches = self.sku_pattern.findall(text)
                
                if matches:
                    clean_matches = list(set([m.strip('.') for m in matches if any(c.isdigit() for c in m) and len(m) >= 5]))
                    if clean_matches:
                        ops = [UpdateOne({"Input_Code": c}, {"$addToSet": {"sources": fn}, "$set": {"status": "RAW"}}, upsert=True) for c in clean_matches]
                        # Subida inmediata por página para no acumular peso
                        self.col.bulk_write(ops, ordered=False)
                
                if (i + 1) % 50 == 0:
                    print(f"⏳ Progresando... {i + 1}/{total_pages} páginas completadas.")
            
            doc.close()
            return "COMPLETADO"
        except Exception as e:
            print(f"❌ Error en el gigante: {e}")
            return "FALLIDO"

if __name__ == "__main__":
    uri = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0"
    target_file = r"C:\Users\VICTOR ABREU\Elimfilters-Orchestrator\catalogos_pdf\04_Master_Interchange.pdf"
    
    miner = HeavyDutyMiner(uri)
    if os.path.exists(target_file):
        status = miner.mine_heavy_pdf(target_file)
        print(f"🏁 Resultado de la operación: {status}")
    else:
        print(f"❌ No encontré el archivo en: {target_file}")

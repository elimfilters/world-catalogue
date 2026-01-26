import fitz
import re
from pymongo import MongoClient, UpdateOne

# Configuración
URI = "mongodb+srv://vabreu_db_user:Kleo2026@cluster0.vairwow.mongodb.net/?appName=Cluster0"
FILE_PATH = r"C:\Users\VICTOR ABREU\Elimfilters-Orchestrator\catalogos_pdf\04_Master_Interchange.pdf"

def fast_stream_mine():
    client = MongoClient(URI)
    col = client['elimfilters']['MASTER_UNIFIED_V5']
    sku_pattern = re.compile(r'\b[A-Z0-9\-\.]{5,17}\b')
    
    print("🚀 Iniciando Extracción Ultra-Rápida...")
    try:
        # Abrimos el PDF en modo 'secuencial'
        with fitz.open(FILE_PATH) as doc:
            print(f"📖 Total páginas: {len(doc)}")
            
            for page_num in range(len(doc)):
                # Extraemos solo texto crudo (sin objetos, sin imágenes)
                text = doc[page_num].get_text("text")
                matches = sku_pattern.findall(text)
                
                if matches:
                    clean = list(set([m.strip('.') for m in matches if any(c.isdigit() for c in m)]))
                    if clean:
                        ops = [UpdateOne({"Input_Code": c}, {"$addToSet": {"sources": "04_Master_Interchange.pdf"}}, upsert=True) for c in clean]
                        col.bulk_write(ops, ordered=False)
                
                if (page_num + 1) % 20 == 0:
                    print(f"⚡ Página {page_num + 1} procesada...")
                    
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    fast_stream_mine()

# 🔧 DONALDSON SCRAPER SYSTEM

## 📋 DESCRIPCIÓN
Sistema completo de scraping y clasificación de filtros Donaldson con auto-detección de productos alternativos.

## 🎯 FLUJO COMPLETO

### 1️⃣ SCRAPING (scrape-donaldson-batch.js)
```powershell
node scripts/scrape-donaldson-batch.js
```

**Input:** Códigos competidores o códigos Donaldson
- Ejemplo: 57MD42M, DBA5047, P150695

**Output:** 
- `donaldson-P150695.json` (datos completos del producto)
- `donaldson-DBA5047.json` (alternativos auto-scrapeados)
- `donaldson-batch-summary.json` (resumen del batch)

**Funcionalidades:**
- ✅ Scraping completo de 5 tabs (Atributos, Referencias, Equipos, Alternativos)
- ✅ Auto-detección y scraping recursivo de productos alternativos
- ✅ Prevención de duplicados
- ✅ Logs detallados en tiempo real

### 2️⃣ CLASIFICACIÓN (classify-donaldson-references.js)
```powershell
node scripts/classify-donaldson-references.js
```

**Input:** Archivos JSON generados por el scraper

**Output:** 
- `donaldson-classified.csv` (formato MASTER_UNIFIED_V5)

**Clasificación automática:**
- ✅ OEM Codes: Caterpillar, Cummins, Mack, Volvo, Paccar, etc.
- ✅ Cross Reference Codes: AC Delco, Fleetguard, WIX, Baldwin, etc.
- ✅ Usa clasificación local (rápida) + GROQ (casos desconocidos)

## 📊 ESTRUCTURA DEL CSV FINAL
```csv
Donaldson_Code,Description,OEM_Codes,Cross_Reference_Codes,Alternative_Donaldson_Codes,...
P150695,"FILTRO DE AIRE, PRIMARIO KONEPAC","3I0405 | 01402464","A1140C | 94882",DBA5047,...
DBA5047,"FILTRO DE AIRE, PRIMARIO KONEPAC BLUE","25042054 | PAC5047",,P150695,...
```

## 🔧 CONFIGURACIÓN

### Variables de entorno
```powershell
$env:GROQ_API_KEY = "tu-api-key"
```

### Dependencias
```bash
npm install puppeteer groq-sdk
```

## 📝 CÓDIGOS DE EJEMPLO

### Lista de códigos para batch scraping:
```javascript
const initialCodes = [
    '57MD42M',    // Código competidor (Sierra/Mercury)
    'DBA5047',    // Código Donaldson directo
    'P150695',    // Código Donaldson directo
    // Agrega más códigos aquí...
];
```

## 🎯 PRÓXIMOS PASOS

1. **Integración con GROQ Classifier** para generar SKUs ELIMFILTERS
2. **Subida automática a Google Sheets** (MASTER_UNIFIED_V5)
3. **Merge con datos FRAM/Racor/Sierra** en catálogo unificado
4. **MongoDB Atlas** para almacenamiento permanente

## ✅ VALIDACIÓN

**P150695 (de 57MD42M):**
- OEM: CATERPILLAR 3I0405, CUMMINS 01402464
- Cross Ref: AC DELCO A1140C, AMERICAN PARTS 94882
- Alternativo: DBA5047

**DBA5047 (alternativo de P150695):**
- OEM: MACK 25042054, PACCAR PAC5047
- Cross Ref: (ninguno)
- Alternativo: P150695

---

**Fecha creación:** 2026-01-10
**Versión:** 1.0
**Status:** ✅ Producción

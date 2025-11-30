# MIGRATION GUIDE: v4.2 → v5.0.0

## 🎯 Overview

This document explains the migration from the old proxy API structure to the new v5.0.0 modular architecture.

---

## 📊 Major Changes

### 1. **File Structure**

#### Before (v4.2):
```
elimfilters-proxy-api/
├── server.js
├── businessLogic.js
├── detectionService.js
├── scraperBridge.js
├── donaldsonScraper.js
├── framScraper.js
├── skuGenerator.js
├── utils.js
└── (many more files in root...)
```

#### After (v5.0.0):
```
elimfilters-api/
├── server.js
└── src/
    ├── api/          # API routes
    ├── services/     # Business logic
    ├── scrapers/     # Scraping modules
    ├── sku/          # SKU generation
    ├── utils/        # Utilities
    └── config/       # Configuration
```

**Impact**: Much cleaner, easier to navigate and maintain

---

### 2. **API Endpoints**

#### Before (v4.2):
```
GET /filter/:id
GET /search?q=
```

#### After (v5.0.0):
```
GET /api/detect/:code
GET /api/detect/search?q=
GET /api/vin/:code
```

**Migration Required**: Update WordPress plugin and any API consumers

---

### 3. **Module Exports**

#### Before (v4.2):
```javascript
// detectionServiceFinal.js
module.exports = { detectionServiceFinal };

// server.js - WRONG IMPORT
const { detectFilter } = require('./src/services/detectionServiceFinal');
```
**Problem**: Import name didn't match export name

#### After (v5.0.0):
```javascript
// detectionServiceFinal.js
module.exports = { detectFilter };

// detect.js - CORRECT IMPORT
const { detectFilter } = require('../services/detectionServiceFinal');
```
**Fixed**: Consistent naming

---

### 4. **SKU Generator**

#### Before (v4.2):
```javascript
const { applyPrefixRules } = require("../sku/generator");
const sku = applyPrefixRules(family, duty, scraper.last4);
```
**Problem**: Function name inconsistency

#### After (v5.0.0):
```javascript
const { generateSKU } = require('../sku/generator');
const sku = generateSKU(family, duty, scraperResult.last4);
```
**Fixed**: Clear, consistent naming

---

### 5. **Error Handling**

#### Before (v4.2):
```javascript
app.get('/filter/:id', async (req, res) => {
    try {
        const result = await detectFilter(part);
        return res.json({ status: "success", result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

#### After (v5.0.0):
```javascript
router.get('/:code', async (req, res) => {
    try {
        // Input validation
        if (!code || code.length < 3) {
            return res.status(400).json({
                error: 'Invalid part number',
                details: 'Part number must be at least 3 characters'
            });
        }
        
        const result = await detectFilter(code);
        return res.json({ success: true, query: code, ...result });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({
            error: 'Internal server error',
            details: error.message
        });
    }
});
```
**Improvements**: Validation, better logging, consistent responses

---

### 6. **Configuration**

#### Before (v4.2):
- SKU rules scattered in multiple files
- Some hardcoded values

#### After (v5.0.0):
- Centralized in `src/config/skuRules.json`
- Environment variables in `.env`
- Clean separation of config and code

---

### 7. **Media Mapping**

#### Before (v4.2):
```javascript
function mediaSelector(family, duty) {
    if (family === "AIRE") return "MACROCORE™";
    if (family === "CABIN") return "MICROKAPPA™";
    return "ELIMTEK™ EXTENDED 99%";
}
```
**Location**: Mixed in detection service

#### After (v5.0.0):
```javascript
// src/utils/mediaMapper.js
const MEDIA_BY_FAMILY = {
    'AIRE': 'MACROCORE™',
    'CABIN': 'MICROKAPPA™',
    'OIL': 'ELIMTEK™ EXTENDED 99%',
    // ... complete mapping
};

function getMedia(family, duty) { ... }
```
**Improvements**: Dedicated module, comprehensive mapping, testable

---

## 🔄 Breaking Changes

### 1. **Import Paths**
All imports now use relative paths from `src/`:
```javascript
// Before
const { scraperBridge } = require("./scraperBridge");

// After
const { scraperBridge } = require('../scrapers/scraperBridge');
```

### 2. **API Response Format**
```javascript
// Before
{
    "status": "success",
    "queryType": "id",
    "part": "P552100",
    "result": { ... }
}

// After
{
    "success": true,
    "query": "P552100",
    "status": "OK",
    "duty": "HD",
    "family": "OIL",
    "sku": "EL82100",
    ...
}
```

### 3. **Environment Variables**
Some variable names changed for clarity:
```bash
# Before
PORT=3000

# After
PORT=8080  # Changed to match Railway/Docker standard
```

---

## ✅ Improvements

### 1. **Modularity**
- Each component has a single responsibility
- Easy to test individual modules
- Clear dependencies

### 2. **Maintainability**
- Organized file structure
- Consistent naming conventions
- Better documentation

### 3. **Scalability**
- Easy to add new scrapers
- Simple to extend SKU rules
- Ready for database integration

### 4. **Production Ready**
- Health checks
- Proper error handling
- Docker containerization
- Railway optimized

### 5. **Developer Experience**
- Clear module boundaries
- Comprehensive README
- Deployment documentation
- Example environment file

---

## 📚 Operativo: Expansión de `oem_xref.json` (Datos OEM/Competidor)

Esta sección define las pautas para añadir las próximas 50–100 entradas al diccionario `oem_xref.json`, asegurando calidad y consistencia.

### Formato de Archivo
- Ubicación: `src/data/oem_xref.json`.
- Formato: JSON válido sin comentarios, llaves plano `{ "CODE": { "brand": "BRAND", "family": "FAMILY" }, ... }`.
- Campos obligatorios por entrada:
  - `brand`: Marca canónica en MAYÚSCULAS.
  - `family`: Una de `OIL`, `FUEL`, `AIRE`, `HYDRAULIC`, `COOLANT` (o similar según catálogo). Si hay duda, permitir temporalmente sólo `brand` y agendar la familia para próxima iteración.

### Normalización de Códigos (keys)
- Aplicar la misma normalización usada por el servicio:
  - Quitar espacios, guiones, barras y separadores: `WK 950/20 → WK95020`, `1R-1808 → 1R1808`, `A000 180 2609 → A0001802609`.
  - Mantener únicamente letras y dígitos ASCII: sin acentos ni símbolos.
  - Convertir a mayúsculas: `90915-yzzf2 → 90915YZZF2`.
- Ejemplos válidos de keys:
  - `23518480`, `1R1808`, `WK95020`, `90915YZZF2`, `A0001802609`.

### Normalización de Marcas (brand)
- Usar nombres canónicos en MAYÚSCULAS. Ejemplos:
  - `DETROIT DIESEL`, `CUMMINS`, `CATERPILLAR`, `TOYOTA`, `NISSAN`, `HONDA`, `FORD`, `ACDELCO`, `VOLKSWAGEN`, `BMW`, `MERCEDES`, `HYUNDAI`, `SUZUKI`.
  - Competidores/Aftermarket: `PARKER` (Racor), `BALDWIN`, `LUBERFINER`, `MANN`, `FLEETGUARD`, `DONALDSON`, `FRAM`.
- Ejemplo de normalización: "Caterpillar Inc." → `CATERPILLAR`.

### Criterios de Aceptación por Entrada
- Preferir fuentes confiables (OEM, catálogo oficial, fichas técnicas) para definir `family`.
- Aceptar entradas con `brand` si la familia es dudosa, pero documentar el pendiente para la siguiente iteración.
- Validar colisiones: si el código puede chocar con heurísticas de prefijos, la entrada en `oem_xref.json` prevalece sobre `prefixMap`.
- Competidores (p. ej., Baldwin, Luberfiner, Parker/Racor, MANN):
  - Incluir cuando exista alta confianza de mapeo (código-modelo estable) y familia conocida.
  - Evitar entradas especulativas; usar `prefixMap` cuando convenga y reforzar con reglas de colisión si hay ambigüedad.

### Reglas de Colisión (coordinación con `prefixMap`)
- Parker/Racor R-series: mantener regla estricta para `R90T` y patrones `R(12|15|20|25|45|60|120)(T|S)` → `PARKER/FUEL`.
- Luberfiner/Baldwin: afinar prefijos (`LFP`, `BF`, `BT`) y añadir colisiones específicas sólo si se detectan ambigüedades en producción.
- OEM_XREF es determinista: si existe entrada en el diccionario, se usa sobre cualquier heurística por prefijo.

### Flujo de Validación / No-Regresión
- Ejecutar `npm run test:internal` antes de solicitar PR:
  - Debe mantener 10/10 `FINAL/Homologada` del lote base.
  - Verificación de colisión: `R90T → PARKER/FUEL`.
  - Verificación OEM puro: `23518480 → DETROIT DIESEL/OIL`.
- Para lotes grandes, opcionalmente adjuntar un pequeño set adicional de prueba con 10–20 códigos representativos del nuevo bloque.

### Checklist para PR de Expansión
- [ ] Entradas nuevas en `src/data/oem_xref.json` con JSON válido y keys normalizadas.
- [ ] Marcas canónicas en MAYÚSCULAS; familias definidas cuando haya evidencia.
- [ ] Reglas de colisión actualizadas en `src/config/prefixMap.js` si corresponde.
- [ ] `npm run test:internal` pasa sin regresiones.
 - [ ] `npm run validate:oem:candidate` ejecutado y sin errores (previo al PR).
- [ ] Changelog breve en PR describiendo fuentes y alcance del lote (50–100 entradas).

### Ejemplos
```json
{
  "23518480": { "brand": "DETROIT DIESEL", "family": "OIL" },
  "1R1808":   { "brand": "CATERPILLAR",     "family": "FUEL" },
  "WK95020":  { "brand": "MANN",            "family": "FUEL" },
  "R90T":     { "brand": "PARKER",          "family": "FUEL" },
  "LFP9000":  { "brand": "LUBERFINER",      "family": "OIL" }
}
```

### Plantilla de Bloque Candidato
- Ubicación: `src/data/oem_xref.candidate.json`.
- Contenido inicial: `{}` (mapa vacío listo para completar).
- Flujo recomendado:
  1) Completar con 50–100 entradas priorizadas (Toyota, Cummins, Caterpillar, Parker/Racor).
  2) Normalizar claves y marcas según pautas anteriores.
  3) Validar antes del PR (OBLIGATORIO):
     - `npm run validate:oem:candidate`
  4) Abrir PR de expansión si la validación pasa.


---

## 📋 Migration Checklist

### Code Migration
- [x] Restructure files into modular architecture
- [x] Fix import/export naming inconsistencies
- [x] Centralize configuration
- [x] Add input validation
- [x] Improve error handling
- [x] Add comprehensive logging

### Deployment
- [ ] Update Railway environment variables
- [ ] Test all endpoints
- [ ] Update WordPress plugin API URL
- [ ] Verify health check works
- [ ] Monitor logs for errors

### Documentation
- [x] README.md
- [x] DEPLOYMENT.md
- [x] MIGRATION.md (this file)
- [x] Code comments

---

## 🎓 What You Learned

1. **Proper Node.js Architecture**: Separation of concerns, modular design
2. **Express Best Practices**: Route handlers, middleware, error handling
3. **API Design**: RESTful endpoints, consistent responses
4. **Deployment**: Docker, Railway, environment configuration
5. **Code Organization**: Clear file structure, logical grouping

---

## 🚀 Next Steps

1. Deploy v5.0.0 to Railway
2. Update WordPress integration
3. Test all endpoints thoroughly
4. Monitor production logs
5. Consider adding:
   - Rate limiting
   - Redis caching
   - MongoDB database
   - API authentication
   - Request logging service

---

## 📞 Need Help?

If you encounter issues during migration:
1. Check the error logs
2. Review this migration guide
3. Consult DEPLOYMENT.md for deployment issues
4. Contact ELIMFILTERS technical support

---

**Migration prepared by Claude**  
**Date**: November 27, 2024  
**Version**: 5.0.0

# 🔧 ELIMFILTERS Backend API

Sistema inteligente de generación automática de SKUs para filtros industriales, automotrices y marinos.

## 🎯 Características Principales

### ✅ Búsqueda Inteligente
1. Google Sheets (MASTER_UNIFIED_V5 + MASTER_KITS_V1)
2. MongoDB
3. Cross-Reference automático (Donaldson HD / FRAM LD)

### 🧠 Detección Automática de DUTY
- Heavy Duty (Caterpillar, John Deere, Mack, etc.)
- Light Duty (Ford, Toyota, BMW, etc.)
- Marine (Sierra, Mercury, Yamaha, etc.)

### 🎭 Sistema TRILOGY
Cada filtro físico = 3 variantes de medio filtrante:
- **STANDARD** - Celulosa estándar
- **PERFORMANCE** - Celulosa mejorada
- **ELITE** - Sintético premium

### 🔢 Generación SKU
```
Formato: [PREFIJO][4_DÍGITOS]
Ejemplo: EL81808 (sin guión)

Prefijos:
EL8=Oil, EA1=Air, EF9=Fuel, EH6=Hydraulic, EC1=Cabin
EM9=Marine, ET9=Turbine, ES9=Separator, EW7=Coolant
ED4=Dryer, EK5=Kits HD, EK3=Kits LD
```

## 🚀 Instalación
```bash
npm install
npm start
```

## 📡 API Usage

### Buscar código individual
```bash
GET /api/scrape/1R1808?manufacturer=Caterpillar
```

### Procesar múltiples códigos
```bash
POST /api/scrape/multiple
{
  "codes": ["1R1808", "AT365870"],
  "manufacturer": "Caterpillar"
}
```

## 🧪 Testing
```bash
# Test sistema completo
node test-sku-system.js

# Test GROQ
node test-groq.js
```

## 📁 Estructura
```
elimfilters-backend/
├── services/
│   ├── cross-reference/
│   │   ├── donaldson.cross.js
│   │   └── fram.cross.js
│   ├── sku.generator.js
│   ├── duty.detector.js
│   ├── filter.orchestrator.js (CEREBRO)
│   ├── googlesheets.service.js
│   └── mongodb.service.js
├── config/
│   ├── elimfilters.prefixes.json
│   └── manufacturers.duty.json
└── docs/
    └── SKU_SYSTEM.md
```

## 🔒 Status

- ✅ Sistema SKU completo
- ✅ Cross-reference (Donaldson/FRAM)
- ✅ TRILOGY generation
- ✅ DUTY detection
- ✅ GROQ AI integration
- 🚧 Google Sheets integration (pendiente)
- 🚧 MongoDB integration (pendiente)

---
**Versión:** 11.0.6  
**Fecha:** 2026-01-06  
**ELIMFILTERS Engineering Team**

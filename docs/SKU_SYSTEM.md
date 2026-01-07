# Sistema de Generación de SKU ELIMFILTERS

## 🎯 Flujo Completo

### Entrada
```
Código OEM: 1R1808 (Caterpillar)
Fabricante: Caterpillar (opcional)
Aplicación: Heavy Duty Equipment (opcional)
```

### Proceso

#### PASO 1: Búsqueda en fuentes existentes
1. Google Sheets `MASTER_UNIFIED_V5`
2. Google Sheets `MASTER_KITS_V1`
3. MongoDB
4. **Si existe → Devolver datos**

#### PASO 2: Detección de DUTY
- Analiza fabricante y aplicación
- Clasifica como: `HEAVY_DUTY`, `LIGHT_DUTY`, o `MARINE`

**Heavy Duty:**
Caterpillar, John Deere, Bobcat, Komatsu, Mack, Freightliner, Volvo, Kenworth, Peterbilt, Cummins, etc.

**Light Duty:**
Ford, Toyota, BMW, Mercedes-Benz, Honda, Nissan, Chevrolet, Volkswagen, Mazda, etc.

**Marine:**
Sierra, Mercury, Yamaha, Volvo Penta, Cummins Marine, MTU, etc.

#### PASO 3: Cross-Reference
- **Heavy Duty** → Donaldson EXCLUSIVAMENTE
- **Light Duty** → FRAM EXCLUSIVAMENTE

#### PASO 4: Generación TRILOGY
Cada filtro físico tiene 3 variantes de medio filtrante:

| Variante | Descripción | Ejemplo Donaldson | SKU ELIMFILTERS |
|----------|-------------|-------------------|-----------------|
| **STANDARD** | Celulosa estándar (30-40μ) | P554005 | EL84005 |
| **PERFORMANCE** | Celulosa mejorada (15-25μ) | P551808 | EL81808 |
| **ELITE** | Sintético premium (10-15μ) | DBL7405 | EL87405 |

### Salida
```json
{
  "success": true,
  "input_code": "1R1808",
  "duty": "HEAVY_DUTY",
  "filter_type": "OIL",
  "trilogy": [
    {
      "sku": "EL84005",
      "variant": "STANDARD",
      "cross_reference_code": "P554005"
    },
    {
      "sku": "EL81808",
      "variant": "PERFORMANCE",
      "cross_reference_code": "P551808"
    },
    {
      "sku": "EL87405",
      "variant": "ELITE",
      "cross_reference_code": "DBL7405"
    }
  ]
}
```

## 📋 Prefijos ELIMFILTERS

| Prefijo | Tipo | Duty | Ejemplo |
|---------|------|------|---------|
| EL8 | Lube (Oil) | HD/LD | EL81808 |
| EA1 | Air | HD/LD | EA14588 |
| EF9 | Fuel | HD/LD | EF95567 |
| EH6 | Hydraulic | HD | EH61234 |
| EC1 | Cabin | HD/LD | EC17890 |
| EM9 | Marine | Marine | EM97944 |
| ET9 | Turbine | HD | ET91000 |
| ES9 | Fuel Separator | HD | ES94567 |
| EW7 | Coolant | HD/LD | EW76789 |
| ED4 | Air Dryer | HD | ED43456 |
| EK5 | Kits HD | HD | EK51234 |
| EK3 | Kits LD | LD | EK35678 |

## 🔧 Formato SKU
```
[PREFIJO][4_ÚLTIMOS_DÍGITOS_CROSS_REFERENCE]

✅ CORRECTO:   EL81808
❌ INCORRECTO: EL8-1808 (sin guión)
```

## 📊 API Endpoints

### GET /api/scrape/:code
```bash
GET /api/scrape/1R1808?manufacturer=Caterpillar
```

### POST /api/scrape/multiple
```bash
POST /api/scrape/multiple
{
  "codes": ["1R1808", "AT365870", "FG-800A"],
  "manufacturer": "Caterpillar"
}
```

---
**Versión:** 1.0.0  
**Fecha:** 2026-01-06  
**Status:** ✅ Production Ready

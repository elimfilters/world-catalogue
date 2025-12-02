# ELIMFILTERS API v5.0.0 - ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUESTS                          │
│  (WordPress Plugin, Web Apps, Mobile Apps, External Systems)   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTP/HTTPS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EXPRESS SERVER (server.js)                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Middleware Stack:                                        │ │
│  │  • CORS                                                   │ │
│  │  • Body Parser (JSON/URLencoded)                         │ │
│  │  • Morgan Logger                                         │ │
│  │  • Request Logging                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
           ┌─────────────┼─────────────┐
           │             │             │
           ▼             ▼             ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │  /health │  │   /api   │  │    /     │
    │          │  │ /detect  │  │  (root)  │
    └──────────┘  └────┬─────┘  └──────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
   ┌──────────┐              ┌──────────┐
   │  detect  │              │   vin    │
   │  router  │              │  router  │
   └────┬─────┘              └────┬─────┘
        │                         │
        │                         │
        ▼                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVICE LAYER                              │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  detectionServiceFinal.js                                 │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │  1. Input Normalization                             │ │ │
│  │  │  2. Duty Detection (HD/LD)                          │ │ │
│  │  │  3. Scraper Bridge Execution                        │ │ │
│  │  │  4. Family Detection                                │ │ │
│  │  │  5. SKU Generation                                  │ │ │
│  │  │  6. Media Assignment                                │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  vinService.js                                            │ │
│  │  └─ VIN Decoding & Vehicle Information                   │ │
│  └───────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  Scraper    │  │     SKU     │  │   Utils     │
│   Bridge    │  │  Generator  │  │  Modules    │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │                │                │
       │                │                │
┌──────┴──────┐         │         ┌──────┴──────────┐
│             │         │         │                  │
▼             ▼         ▼         ▼                  ▼
┌───────┐ ┌──────┐ ┌────────┐ ┌──────────┐  ┌──────────────┐
│  HD   │ │  LD  │ │ Rules  │ │Normalize │  │ Family/Duty  │
│(DON)  │ │(FRAM)│ │ Config │ │ Digits   │  │  Detectors   │
└───┬───┘ └───┬──┘ └────────┘ └──────────┘  └──────────────┘
    │         │
    │         │
    ▼         ▼
┌─────────────────────────────────┐
│   EXTERNAL DATA SOURCES         │
│  ┌────────────┐  ┌────────────┐ │
│  │ Donaldson  │  │    FRAM    │ │
│  │   Website  │  │  Website   │ │
│  └────────────┘  └────────────┘ │
│                                  │
│  ┌────────────────────────────┐ │
│  │  Google Sheets (Optional)  │ │
│  │  • Master Catalog Cache    │ │
│  │  • Cross References        │ │
│  └────────────────────────────┘ │
└─────────────────────────────────┘


DATA FLOW EXAMPLE - FILTER DETECTION:
═══════════════════════════════════════════════════════════════

1. REQUEST
   GET /api/detect/P552100
   
2. NORMALIZATION
   "P552100" → "P552100" (already clean)
   
3. DUTY DETECTION
   Check OEM prefix → Detected: "HD" (Heavy Duty)
   
4. SCRAPER SELECTION
   HD → Route to Donaldson Scraper
   
5. SCRAPING
   Donaldson.com → Extract:
   • Code: P552100
   • Family hint: "Oil Filter"
   • Cross references
   • Applications
   • Attributes
   
6. FAMILY DETECTION
   "Oil Filter" + HD → Family: "OIL"
   
7. DIGIT EXTRACTION
   P552100 → Extract last 4 digits → "2100"
   
8. SKU GENERATION
   Lookup: OIL|HD → Prefix: "EL8"
   SKU = "EL8" + "2100" = "EL82100"
   
9. MEDIA ASSIGNMENT
   Family "OIL" → Media: "ELIMTEK™ EXTENDED 99%"
   
10. RESPONSE
    {
      "success": true,
      "status": "OK",
      "duty": "HD",
      "family": "OIL",
      "sku": "EL82100",
      "media": "ELIMTEK™ EXTENDED 99%",
      "source": "DONALDSON",
      "oem_equivalent": "P552100",
      "last4": "2100",
      ...
    }


FOLDER STRUCTURE:
═══════════════════════════════════════════════════════════════

elimfilters-api/
│
├── 📄 Entry Point
│   └── server.js                 # Express app initialization
│
├── 📁 src/
│   │
│   ├── 📁 api/                   # REST API Layer
│   │   ├── detect.js            # Filter detection routes
│   │   └── vin.js               # VIN decoding routes
│   │
│   ├── 📁 services/              # Business Logic Layer
│   │   ├── detectionServiceFinal.js   # Main detection orchestrator
│   │   └── vinService.js              # VIN processing
│   │
│   ├── 📁 scrapers/              # Data Acquisition Layer
│   │   ├── scraperBridge.js     # Scraper router (HD/LD)
│   │   ├── donaldson.js         # Donaldson website scraper
│   │   └── fram.js              # FRAM website scraper
│   │
│   ├── 📁 sku/                   # SKU Generation
│   │   └── generator.js         # SKU rules & generation
│   │
│   ├── 📁 utils/                 # Utility Functions
│   │   ├── normalize.js         # Text normalization
│   │   ├── digitExtractor.js    # Digit extraction
│   │   ├── mediaMapper.js       # Filter media mapping
│   │   ├── dutyDetector.js      # HD/LD detection
│   │   ├── familyDetector.js    # Family classification
│   │   └── messages.js          # Response messages
│   │
│   └── 📁 config/                # Configuration
│       └── skuRules.json        # SKU prefix rules
│
├── 📄 Deployment
│   ├── Dockerfile               # Container definition
│   ├── railway.json             # Railway config
│   ├── .env.example             # Environment template
│   └── .gitignore               # Git ignore rules
│
├── 📄 Dependencies
│   └── package.json             # NPM dependencies
│
└── 📄 Documentation
    ├── README.md                # Project overview
    ├── DEPLOYMENT.md            # Deployment guide
    ├── MIGRATION.md             # Migration guide
    └── QUICK-START.md           # Quick start guide


TECHNOLOGY STACK:
═══════════════════════════════════════════════════════════════

Backend Framework:  Express.js 4.18.2
Runtime:            Node.js 20+
HTTP Client:        Axios 1.6.8
HTML Parser:        Cheerio 1.0.0-rc.12
Logger:             Morgan 1.10.0
Cache:              Node-Cache 5.1.2

Optional Integrations:
- Google Sheets:    googleapis 128.0.0
- MongoDB:          mongoose 8.3.1 (for future use)

Deployment:
- Containerization: Docker (Alpine Linux)
- PaaS:            Railway
- CI/CD:           GitHub (via Railway auto-deploy)


DEPLOYMENT TARGETS:
═══════════════════════════════════════════════════════════════

✅ Railway (Recommended)
   • Auto-deploy on git push


CHANGELOG (v5.2.x) — Estrategia de Confianza Descendente
═══════════════════════════════════════════════════════════════

Resumen
- Se incorpora una arquitectura de homologación basada en “Confianza Descendente”, que prioriza fuentes deterministas antes de heurísticas o scraping.
- Dos pilares nuevos y permanentes definen la calidad de datos: `prefixMap` (lógica determinista por prefijos y colisiones) y `oem_xref.json` (diccionario OEM consolidado).

Pilares Arquitectónicos
- `src/config/prefixMap.js` (Determinista):
  - Mapeo por prefijo de marca y familia (ej.: `BF → BALDWIN/FUEL`, `LFP → LUBERFINER/OIL`, `AF → FLEETGUARD/AIRE`).
  - Reglas de colisión estrictas para casos ambiguos (ej.: Parker/Racor `R90T` y patrones `R(12|15|20|25|45|60|120)(T|S)` → `PARKER/FUEL`).
  - Duty por marca donde aplique (ej.: `PARKER → HD`).
- `src/data/oem_xref.json` (Determinista OEM):
  - Diccionario JSON válido (50+ entradas) con resolución directa de OEM/competidor a marca/familia (ej.: `23518480 → DETROIT DIESEL/OIL`).
  - Enfoque incremental: añadir 50–100 entradas por lote, priorizando familias con mayor incertidumbre.

Flujo de Confianza Descendente
1) OEM determinista: Si el código normalizado existe en `oem_xref.json`, se usa esa marca/familia y se genera SKU.

Nota de Flujo LD (FRAM)
- El cruce inicial traduce el código del cliente a un código FRAM y con ello se genera el `SKU_INTERNO` (p. ej. `EL8XXXX`).
- El servicio `framEnrichmentService.js` recibe ese `SKU_INTERNO` y el `código FRAM` como llave; solo agrega datos técnicos desde el sitio FRAM.
- No crea ni modifica el formato del SKU; la clave del documento final siempre es el `SKU_INTERNO` ya existente.
2) Prefijos deterministas: Si no hay OEM directo, se usa `prefixMap` (marca/familia/duty y colisiones).
3) Scraper/Heurística: Para casos residuales o de validación cruzada (ej.: Donaldson P-series), se usa scraping y señales heurísticas.
4) Generación de SKU: Con familia y duty determinados, se calcula `last4` y se arma la SKU según `skuRules.json`.

Componentes actualizados
- `src/services/internalValidationService.js`: Carga `oem_xref.json`, aplica normalización, prioriza resolución determinista y genera SKU.
- `src/config/prefixMap.js`: Amplía prefijos y agrega colisiones Parker/Racor para R-series; incluye `AF → FLEETGUARD/AIRE`.
- `src/data/oem_xref.json`: Nuevo diccionario consolidado (sin comentarios), listo para expansión.
- `scripts/test_internal_validation.js`: Suite mínima de prueba para evitar regresiones en homologación.

Pruebas y No-Regresión
- Suite mínima ejecutable con `npm run test:internal`:
  - Verifica 10 códigos del último lote como `FINAL/Homologada`.
  - Confirma colisión corregida: `R90T → PARKER/FUEL`.
  - Confirma OEM puro: `23518480 → DETROIT DIESEL/OIL`.

Estrategia Post-PR (Expansión)
- Priorizar familias con incertidumbre (ej.: `HYDRAULIC` si presenta P3 alto).
- Usar reportes de producción para afinar prefijos y colisiones de Luberfiner/Baldwin.
- Añadir 50–100 entradas más en `oem_xref.json` por lote, iniciando con Toyota/Lexus, Cummins, Caterpillar, Detroit Diesel, Parker/Racor, Baldwin, Luberfiner, MANN.
   • Built-in health checks
   • Environment management
   • Logs & metrics
   • Custom domains
   
✅ Docker / Docker Compose
   • Portable containers
   • Local development
   • Self-hosted options
   
✅ Cloud Providers
   • AWS (ECS, Elastic Beanstalk)
   • Google Cloud (Cloud Run)
   • Azure (Container Apps)
   • DigitalOcean (App Platform)


SCALABILITY NOTES:
═══════════════════════════════════════════════════════════════

Current Architecture:
- Stateless API (scales horizontally)
- In-memory caching (single instance)
- External scraping (I/O bound)

Future Improvements:
1. Redis for distributed caching
2. MongoDB for persistent storage
3. Queue system for heavy scraping (Bull/RabbitMQ)
4. Load balancing (multiple instances)
5. CDN for static content
6. Rate limiting per client
```
### Regla de SKU (HD)

- Familia: `FUEL SEPARATOR` (Heavy Duty)
- Prefijo de SKU: `ES9`
- Sufijo: últimos 4 dígitos del código Donaldson homologado.
- Condición: solo se genera SKU si existe homologación válida hacia Donaldson; de lo contrario el resultado es `NOT_FOUND`.

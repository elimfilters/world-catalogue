# ELIMFILTERS API v5.0.0

Professional-grade API for filter detection, cross-referencing, and SKU generation.

## 🚀 Features

- **Intelligent Filter Detection**: Automatic detection of Heavy Duty (HD) vs Light Duty (LD) filters
- **Multi-Source Scraping**: Integration with Donaldson and FRAM databases
- **SKU Generation**: Automatic ELIMFILTERS SKU generation based on business rules
- **VIN Decoding**: Vehicle identification number processing for filter applications
- **Cross-Reference System**: Comprehensive cross-reference database
- **RESTful API**: Clean, documented endpoints
- **Production Ready**: Docker containerization, health checks, and Railway deployment

## 📋 Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Railway account (for deployment)

## 🛠️ Installation

### Local Development

```bash
# Clone the repository
git clone https://github.com/yourusername/elimfilters-api.git
cd elimfilters-api

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

### Production Deployment (Railway)

```bash
# Connect to Railway
railway link

# Deploy
railway up
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Filter Detection
```
GET /api/detect/:code
GET /api/detect/search?q=P552100
```

**Example Response:**
```json
{
  "success": true,
  "query": "P552100",
  "status": "OK",
  "duty": "HD",
  "family": "OIL",
  "sku": "EL82100",
  "media": "ELIMTEK™ EXTENDED 99%",
  "source": "DONALDSON",
  "oem_equivalent": "P552100",
  "last4": "2100"
}
```

### VIN Decoding
```
GET /api/vin/:code
```

## 🏗️ Architecture

```
elimfilters-api/
├── server.js                 # Express server entry point
├── src/
│   ├── api/                  # API route handlers
│   │   ├── detect.js        # Filter detection endpoints
│   │   └── vin.js           # VIN decoding endpoints
│   ├── services/            # Business logic layer
│   │   ├── detectionServiceFinal.js
│   │   └── vinService.js
│   ├── scrapers/            # Web scraping modules
│   │   ├── scraperBridge.js
│   │   ├── donaldson.js
│   │   └── fram.js
│   ├── sku/                 # SKU generation
│   │   └── generator.js
│   ├── utils/               # Utility functions
│   │   ├── normalize.js
│   │   ├── digitExtractor.js
│   │   ├── mediaMapper.js
│   │   ├── dutyDetector.js
│   │   ├── familyDetector.js
│   │   └── messages.js
│   └── config/              # Configuration files
│       └── skuRules.json
├── Dockerfile
├── railway.json
└── package.json
```

## 🔧 Configuration

### Environment Variables

```bash
PORT=8080                      # Server port
NODE_ENV=production           # Environment
GOOGLE_SHEETS_ID=...          # Google Sheets integration (optional)
SCRAPER_TIMEOUT=10000         # Scraper timeout in ms
CACHE_TTL=3600                # Cache time-to-live in seconds
MARKET_REGION=EU              # Optional regional priority (EU, LATAM, NA/US)
SUPPORTED_LANGUAGES=en,es     # Optional: languages supported (default en)
```

#### Regional Ordering Details

- FRAM (LD): orders aftermarket crosses and text detection.
  - EU: prioritizes `MANN`, `HIFI FILTER`, `PURFLUX`, `VALEO`.
  - LATAM: prioritizes `TECFIL`, `WEGA`, `VOX`, `GFC`.
  - NA/US: raises visibility for `NAPA`, `STP`, `CHAMP`, `MICROGARD`.
- Donaldson (HD): orders cross-reference brands by region.
  - NA/US and LATAM: `DONALDSON`, `FLEETGUARD`, `BALDWIN`, `WIX`, `MANN`, `TECFIL`.
  - EU: `DONALDSON`, `FLEETGUARD`, `MANN`, `MAHLE`, `HENGST`.

### SKU Rules

SKU generation rules are defined in `src/config/skuRules.json`:

```json
{
  "decisionTable": {
    "OIL|HD": "EL8",
    "OIL|LD": "EL8",
    "FUEL|HD": "EF9",
    "AIRE|HD": "EA1",
    ...
  }
}
```

## 🎯 Business Logic

### Filter Detection Flow

1. **Input Normalization**: Clean and standardize filter code
2. **Duty Detection**: Determine HD (Heavy Duty) or LD (Light Duty)
3. **Scraper Selection**: Route to Donaldson (HD) or FRAM (LD)
4. **Family Detection**: Identify filter family (OIL, FUEL, AIRE, etc.)
7. **Language Handling**: Messages returned in `en` or `es` based on `lang`.

### Language Support

- Endpoints accept a `lang` query parameter to return messages in English or Spanish.
- Supported values: `en` (default), `es`.
- Examples:
  - English: `GET /api/detect/P552100?lang=en`
  - Español: `GET /api/detect/P552100?lang=es`
  - Search English: `GET /api/detect/search?q=LF3620&lang=en`
  - Búsqueda Español: `GET /api/detect/search?q=LF3620&lang=es`
5. **SKU Generation**: Apply prefix rules + last 4 digits
6. **Media Assignment**: Map to ELIMFILTERS™ media technology

### ELIMFILTERS™ Media Technology

- **MACROCORE™**: Air filters
- **MICROKAPPA™**: Cabin air filters
- **ELIMTEK™ EXTENDED 99%**: Oil, fuel, hydraulic, coolant, marine

## 🔐 Security

- Input validation on all endpoints
- Sanitized error messages
- Rate limiting ready
- CORS enabled for web integration

## 📊 Monitoring

Health check endpoint provides:
- Status
- Version
- Uptime
- Timestamp

```bash
curl https://your-api.railway.app/health
```

## 🚢 Deployment

### Railway (Recommended)

1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Railway auto-deploys on git push

Tip: add `MARKET_REGION` per environment (e.g., `EU` for QA, `LATAM` for production) to control aftermarket brand ordering.

### Docker

```bash
# Build image
docker build -t elimfilters-api .

# Run container
docker run -p 8080:8080 elimfilters-api
```

## 🗺️ Guía de Enriquecimiento de Datos por Tipo de Servicio (Duty)

El sistema soporta dos flujos de enriquecimiento, cada uno con una fuente de datos diferente para garantizar la mayor precisión técnica:

| Tipo de Servicio | Fuente de Datos (Enriquecimiento) | Herramienta | Clave de Enriquecimiento |
| :--- | :--- | :--- | :--- |
| **HD (Heavy Duty)** | API de Fleetguard | HTTP Request (rápida) | Código Donaldson (P55XXXX) |
| **LD (Light Duty)** | **Web Scraping de FRAM** | Playwright/Selenium (robusta) | Código FRAM (PH8A, etc.) |

➡️ Flujo Detallado: Para más detalles sobre la arquitectura y la integridad del SKU, consulte la sección "Flujo LD (FRAM) y Responsabilidades del Enriquecimiento" en `docs/scraper_rules_es.md`:

- `docs/scraper_rules_es.md#flujo-ld-fram-y-responsabilidades-del-enriquecimiento`

## 📝 Version History

### v5.0.0 (Current)
- Complete architecture refactor
- Modular structure implementation
- Enhanced error handling
- Production-ready deployment
- Comprehensive documentation

### v4.2
- Updated server configuration
- SKU rules refinement

### v3.0.0
- Google Sheets integration
- Business logic v2.2.3

## 🤝 Contributing

This is a proprietary ELIMFILTERS project.

## 📄 License

PROPRIETARY - All rights reserved to ELIMFILTERS

## 🆘 Support

For issues or questions, contact ELIMFILTERS technical support.

---

**Built with German quality standards 🇩🇪 | ELIMTEK™ Technology**

## 🛠️ Desarrollo

- Paso previo obligatorio para PRs de expansión de `oem_xref`:
  - Ejecutar `npm run validate:oem:candidate` y asegurar cero errores.
- Referencia:
  - Consultar `MIGRATION.md` para pautas de formato, normalización y reglas de colisión.

## ⚙️ Políticas de Creación y Calidad del SKU

Para asegurar la máxima calidad de datos en el Catálogo Master:

- **Validación de Esenciales:** La escritura se bloquea si faltan datos críticos (ej. altura, diámetro, rosca) para una familia de filtro.
- **Normalización de Fallbacks:** Los campos vacíos se llenan con `N/A` o `0`.
- **Política de Temperaturas:** Los límites de temperatura de operación se asignan por defecto según el perfil de la familia de filtro cuando la API no proporciona el dato.

➡️ **Documentación Detallada:** Consulte la documentación completa de la política de datos, incluyendo los valores de temperatura por familia, en [docs/SKU_CREATION_POLICY_ES.md#fallbacks-de-temperatura-por-familia].

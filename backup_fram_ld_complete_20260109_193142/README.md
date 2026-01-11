# RESPALDO FRAM LD COMPLETO
Fecha: 2026-01-09 19:31:43
Commit: 3f13bd1f7aafb0c368e8b47d66f76f5fe24952e6

## Estado del Sistema
✅ FRAM Light Duty - 4 tipos completos
   - Oil Filters (PH3600): 487 códigos
   - Air Filters (CA10013): 50 códigos  
   - Cabin Air (CF10285): 180 códigos
   - Fuel Filters (G3): 77 códigos
   - TOTAL: 794 códigos (73 OEM + 721 Aftermarket)

## Archivos Respaldados
- services/scrapers/fram.complete.scraper.js
 - services/groq.classifier.js
 - services/manufacturers.classifier.js
 - services/mappers/fram.mapper.js
 - config/elimfilters.prefixes.json
 - routes/filter.search.api.js
 - server.js
 - package.json
 - package-lock.json
 - nixpacks.toml
 - .env


## Para Restaurar
1. Copiar archivos de esta carpeta a la raíz del proyecto
2. npm install
3. Verificar .env con GROQ_API_KEY

## Último Commit
3f13bd1 - fix: agregar groq-sdk a dependencies para Railway (2026-01-09)

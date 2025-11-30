╔══════════════════════════════════════════════════════════════╗
║  ELIMFILTERS API v5.0.0 - DEPLOYMENT INSTRUCTIONS            ║
╚══════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
📋 PRE-DEPLOYMENT CHECKLIST
═══════════════════════════════════════════════════════════════

[ ] Node.js 18+ installed locally
[ ] Railway account created
[ ] GitHub repository created
[ ] Environment variables prepared
[ ] Si el PR modifica datos (`src/data/oem_xref.json`), ejecutar `npm run validate:oem:candidate` y asegurar cero errores (OBLIGATORIO)
[ ] Google Sheets credentials (optional)

═══════════════════════════════════════════════════════════════
🚀 OPTION 1: DEPLOY TO RAILWAY (RECOMMENDED)
═══════════════════════════════════════════════════════════════

STEP 1: Push to GitHub
─────────────────────────

cd elimfilters-api
git init
git add .
git commit -m "Initial commit - v5.0.0"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/elimfilters-api.git
git push -u origin main

STEP 2: Connect Railway
─────────────────────────

1. Go to https://railway.app/
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Choose "elimfilters-api" repository
5. Railway will auto-detect Dockerfile

STEP 3: Configure Environment Variables
─────────────────────────────────────────

In Railway Dashboard → Variables, add:

Required:
PORT=8080
NODE_ENV=production

Optional (if using Google Sheets):
GOOGLE_SHEETS_ID=your_sheet_id
GOOGLE_CREDENTIALS={"type":"service_account",...}

STEP 4: Deploy
──────────────

Railway auto-deploys on git push.
First deployment takes 2-3 minutes.

STEP 5: Verify Deployment
──────────────────────────

curl https://your-app.railway.app/health

Expected response:
{
  "status": "OK",
  "version": "5.0.0",
  "uptime": 123.45,
  "timestamp": "2024-11-27T..."
}

STEP 6: Test API
────────────────

# Test filter detection
curl https://your-app.railway.app/api/detect/P552100

# Test search
curl https://your-app.railway.app/api/detect/search?q=P552100

═══════════════════════════════════════════════════════════════
🐳 OPTION 2: LOCAL DOCKER DEPLOYMENT
═══════════════════════════════════════════════════════════════

STEP 1: Build Docker Image
───────────────────────────

docker build -t elimfilters-api:5.0.0 .

STEP 2: Run Container
─────────────────────

docker run -d \
  -p 8080:8080 \
  -e PORT=8080 \
  -e NODE_ENV=production \
  --name elimfilters-api \
  elimfilters-api:5.0.0

STEP 3: Check Logs
──────────────────

docker logs -f elimfilters-api

STEP 4: Test
────────────

curl http://localhost:8080/health

═══════════════════════════════════════════════════════════════
💻 OPTION 3: LOCAL DEVELOPMENT
═══════════════════════════════════════════════════════════════

STEP 1: Install Dependencies
─────────────────────────────

npm install

STEP 2: Create Environment File
────────────────────────────────

cp .env.example .env
# Edit .env with your configuration

STEP 3: Start Development Server
─────────────────────────────────

npm run dev

Server runs on http://localhost:8080

═══════════════════════════════════════════════════════════════
🔧 POST-DEPLOYMENT CONFIGURATION
═══════════════════════════════════════════════════════════════

WordPress Integration
─────────────────────

1. Update WordPress plugin API URL:
   Settings → ELIMFILTERS Search → API URL
   https://your-app.railway.app

2. Test connection in WordPress admin panel

Google Sheets Integration
─────────────────────────

1. Create service account in Google Cloud Console
2. Share Google Sheet with service account email
3. Add credentials to Railway environment variables

Custom Domain (Optional)
────────────────────────

1. Railway Settings → Domains
2. Add custom domain
3. Update DNS records as instructed
4. SSL certificate auto-provisioned

═══════════════════════════════════════════════════════════════
📊 MONITORING & MAINTENANCE
═══════════════════════════════════════════════════════════════

Health Check
────────────
GET https://your-app.railway.app/health
Status: 200 OK

Logs
────
Railway Dashboard → Deployments → View Logs

Metrics
───────
Railway Dashboard → Metrics
- CPU usage
- Memory usage
- Response times

Updates
───────
git add .
git commit -m "Description of changes"
git push origin main
# Railway auto-deploys

Rollback
────────
Railway Dashboard → Deployments → Redeploy previous version

═══════════════════════════════════════════════════════════════
🆘 TROUBLESHOOTING
═══════════════════════════════════════════════════════════════

Issue: Health check fails
Solution: Check Railway logs for errors
         Verify PORT environment variable is 8080

Issue: Scrapers timeout
Solution: Increase SCRAPER_TIMEOUT env variable
         Check internet connectivity from Railway

Issue: SKU generation fails
Solution: Verify src/config/skuRules.json is present
         Check logs for specific error messages

Issue: Build fails on Railway
Solution: Verify Dockerfile is in root directory
         Check package.json dependencies are correct
         Review Railway build logs

═══════════════════════════════════════════════════════════════
🛡️ BACKUPS EN RAILWAY
═══════════════════════════════════════════════════════════════

1) PostgreSQL (Servicio con Volumen Persistente)
- Railway ofrece pestaña de "Backups" en el servicio de base de datos.
- Configura Frecuencia y Retención:
  - Diaria: guarda 6 días
  - Semanal: guarda 1 mes
  - Mensual: guarda 3 meses
- Restauración: desde la misma pestaña, selecciona por timestamp y pulsa "Restore".
  - Crea un nuevo volumen con el estado anterior (el volumen original queda sin montar).

2) MongoDB (Servicio externo o sin volumen)
- Añade un servicio Cron en Railway que ejecute el script de backup del repo:
  - Comando: `node scripts/backup_mongo_to_s3.js`
  - Variables de entorno necesarias:
    - `MONGODB_URI`
    - `S3_BUCKET`, `S3_REGION`
    - `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
    - Opcional: `S3_PREFIX`, `BACKUP_DB_NAME`
  - Programa el Cron con `RAILWAY_CRON_SCHEDULE`, por ejemplo: `0 3 * * *` (03:00 UTC diario).

Salida del backup
- El script crea `tmp_backup/<db>_<timestamp>/` con JSONL por colección y un archivo `tar.gz` subido a S3.
- Los directorios `tmp_backup/` y `backups/` están ignorados en `.gitignore`.

Verificación
- Revisa S3 para el objeto: `s3://<bucket>/<prefix>/<db>/<db>_<timestamp>.tar.gz`.
- Activa alertas en S3/lifecycle si deseas retención automática.


═══════════════════════════════════════════════════════════════
📞 SUPPORT
═══════════════════════════════════════════════════════════════

Technical Issues:
- Check logs first
- Review error messages
- Contact ELIMFILTERS support

Railway Support:
- Railway Discord: https://discord.gg/railway
- Railway Docs: https://docs.railway.app

═══════════════════════════════════════════════════════════════

Version: 5.0.0
Date: 2024-11-27
Architecture: Modular, Production-Ready
Status: ✅ Ready for Deployment

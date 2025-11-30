// Backup MongoDB to S3 (JSON dump per collection, tar.gz upload)
// Requirements: env vars MONGODB_URI, S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
// Optional: S3_PREFIX, BACKUP_DB_NAME

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { MongoClient } = require('mongodb');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

function log(msg) { console.log(`[backup] ${msg}`); }

async function main() {
  const mongoUri = process.env.MONGODB_URI;
  const s3Bucket = process.env.S3_BUCKET;
  const s3Region = process.env.S3_REGION || 'us-east-1';
  const s3KeyPrefix = (process.env.S3_PREFIX || 'mongo_backups').replace(/\/+$/, '');
  const backupDbName = process.env.BACKUP_DB_NAME || extractDbName(mongoUri);

  if (!mongoUri || !s3Bucket || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
    throw new Error('Missing required env vars: MONGODB_URI, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY');
  }
  if (!backupDbName) {
    throw new Error('Could not determine database name from MONGODB_URI. Set BACKUP_DB_NAME explicitly.');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const workDir = path.join(process.cwd(), 'tmp_backup', `${backupDbName}_${timestamp}`);
  fs.mkdirSync(workDir, { recursive: true });
  log(`Working directory: ${workDir}`);

  // Connect and list collections
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db(backupDbName);
  const collections = await db.listCollections().toArray();
  log(`Found ${collections.length} collections`);

  for (const c of collections) {
    const name = c.name;
    log(`Dumping collection: ${name}`);
    const filePath = path.join(workDir, `${name}.jsonl`);
    const ws = fs.createWriteStream(filePath);
    const cursor = db.collection(name).find({}, { timeout: false });
    let count = 0;
    while (await cursor.hasNext()) {
      const doc = await cursor.next();
      ws.write(JSON.stringify(doc) + '\n');
      count++;
    }
    await cursor.close();
    ws.end();
    log(`Wrote ${count} docs to ${filePath}`);
  }

  await client.close();

  // Create tar.gz using system tar
  const tarName = `${backupDbName}_${timestamp}.tar.gz`;
  const tarPath = path.join(process.cwd(), 'tmp_backup', tarName);
  await createTarGz(workDir, tarPath);
  const stats = fs.statSync(tarPath);
  log(`Archive created: ${tarPath} (${stats.size} bytes)`);

  // Upload to S3
  const s3 = new S3Client({
    region: s3Region,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    }
  });
  const s3Key = `${s3KeyPrefix}/${backupDbName}/${tarName}`;
  const bodyStream = fs.createReadStream(tarPath);
  log(`Uploading to s3://${s3Bucket}/${s3Key}`);
  await s3.send(new PutObjectCommand({
    Bucket: s3Bucket,
    Key: s3Key,
    Body: bodyStream,
    ContentType: 'application/gzip'
  }));
  log('Upload complete');

  // Cleanup: leave local files by default; in Railway ephemeral FS it’s fine
  log('Backup finished successfully');
}

function extractDbName(uri) {
  try {
    const u = new URL(uri);
    const dbFromPath = u.pathname.replace(/^\//, '');
    return dbFromPath || null;
  } catch (_) {
    return null;
  }
}

function createTarGz(sourceDir, outPath) {
  return new Promise((resolve, reject) => {
    const tar = spawn('tar', ['-czf', outPath, '-C', sourceDir, '.'], { stdio: 'inherit' });
    tar.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tar exited with code ${code}`));
    });
  });
}

main().catch(err => {
  console.error('[backup] Error:', err);
  process.exit(1);
});
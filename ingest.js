const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');

const pdfDirectory = path.join(__dirname, 'catalogos_pdf');
const outputDirectory = path.join(__dirname, 'data');

if (!fs.existsSync(outputDirectory)) {
  fs.mkdirSync(outputDirectory, { recursive: true });
}

fs.readdir(pdfDirectory, (err, files) => {
  if (err) {
    return console.error('❌ No se pudo leer el directorio de catálogos:', err);
  }

  const pdfFiles = files.filter(file => path.extname(file).toLowerCase() === '.pdf');

  if (pdfFiles.length === 0) {
    console.log('ℹ️ No se encontraron archivos PDF en el directorio de catálogos.');
    return;
  }

  let firstFileProcessed = false;

  pdfFiles.forEach(file => {
    const pdfPath = path.join(pdfDirectory, file);
    const dataBuffer = fs.readFileSync(pdfPath);

    pdf(dataBuffer).then(data => {
      const skus = data.text.match(/\b[A-Z0-9-]{4,}\b/g) || [];
      const uniqueSkus = [...new Set(skus)];

      if (uniqueSkus.length > 0) {
        const outputFilePath = path.join(outputDirectory, `${path.basename(file, '.pdf')}.json`);
        const jsonData = { skus: uniqueSkus };
        fs.writeFileSync(outputFilePath, JSON.stringify(jsonData, null, 2));
        console.log(`✅ SKUs extraídos de ${file} y guardados en ${outputFilePath}`);

        if (!firstFileProcessed) {
          console.log('🎉 ¡El primer catálogo ha sido procesado exitosamente!');
          firstFileProcessed = true;
        }
      } else {
        console.log(`ℹ️ No se encontraron SKUs en ${file}`);
      }
    }).catch(err => {
      console.error(`❌ Error al procesar el archivo ${file}:`, err);
    });
  });
});

const fs = require('fs');
const pdf = require('pdf-parse');

const PDF_PATH = 'catalogos_pdf/donaldson_cross_ref.pdf';
const CSV_PATH = 'data/donaldson_cross_ref.csv';
const START_PAGE = 10;

let currentPage = 0;
let extractedText = '';

// pdf-parse permite una función de renderizado personalizada para procesar cada página.
// Usaremos esto para contar las páginas y solo extraer texto a partir de START_PAGE.
const render_page = (pageData) => {
    currentPage++;
    if (currentPage < START_PAGE) {
        return ""; // No procesar páginas antes de la página de inicio.
    }

    // El siguiente código está adaptado de la documentación de pdf-parse.
    // Intenta reconstruir el texto de la página preservando los saltos de línea
    // basados en la posición vertical (Y) del texto.
    return pageData.getTextContent().then((textContent) => {
        let lastY, text = '';
        for (let item of textContent.items) {
            if (lastY == item.transform[5] || !lastY) {
                text += item.str;
            } else {
                text += '\n' + item.str;
            }
            lastY = item.transform[5];
        }
        return text;
    }).then((pageText) => {
        // Acumular el texto de la página actual en nuestra variable.
        extractedText += pageText + '\n\n';
    });
}

const options = {
    pagerender: render_page
};

console.log(`Iniciando el procesamiento del archivo PDF: ${PDF_PATH}`);
console.log(`Se extraerá el texto a partir de la página: ${START_PAGE}`);

fs.readFile(PDF_PATH, (err, dataBuffer) => {
    if (err) {
        console.error("Error al leer el archivo PDF:", err);
        return;
    }

    // Procesar el PDF. La promesa se resuelve después de que todas las páginas han sido renderizadas.
    pdf(dataBuffer, options).then(() => {
        console.log('PDF procesado exitosamente.');

        // Ahora, convertir el texto extraído a formato CSV.
        // Este es un enfoque simple que asume que el texto está en columnas separadas por múltiples espacios.
        const lines = extractedText.split('\n').filter(line => line.trim() !== '');
        const csvLines = lines.map(line => {
            // Reemplazar 2 o más espacios con una sola coma para crear el formato CSV.
            return line.trim().replace(/\s{2,}/g, ',');
        });

        const csvContent = csvLines.join('\n');

        fs.writeFile(CSV_PATH, csvContent, (writeErr) => {
            if (writeErr) {
                console.error("Error al escribir el archivo CSV:", writeErr);
            } else {
                console.log(`Archivo CSV creado exitosamente en: ${CSV_PATH}`);
            }
        });
    }).catch((pdfErr) => {
        console.error("Error al parsear el PDF:", pdfErr);
    });
});

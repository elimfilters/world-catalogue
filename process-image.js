const sharp = require('sharp');
const path = require('path');

const imagePath = path.join(__dirname, 'images', 'LF3620.png');
const outputPath = path.join(__dirname, 'images', 'LF3620-recolored.png');

// --- Parámetros de Configuración ---

// El color objetivo para el filtro (Gris Carbón de Elimfilters)
const TINT_COLOR = { r: 58, g: 60, b: 62 };

// Rango de color para detectar el cuerpo del filtro.
// Se enfoca en blancos y grises claros, excluyendo el fondo blanco puro.
const MIN_BRIGHTNESS = 150; // Umbral inferior de brillo (0-255)
const MAX_BRIGHTNESS = 250; // Umbral superior de brillo (0-255)

async function recolorFilter() {
  try {
    const image = sharp(imagePath);
    const metadata = await image.metadata();
    const { width, height } = metadata;

    // Obtener los datos de píxeles crudos de la imagen
    const rawPixels = await image.raw().toBuffer();

    // Iterar sobre cada píxel
    for (let i = 0; i < rawPixels.length; i += metadata.channels) {
      const r = rawPixels[i];
      const g = rawPixels[i + 1];
      const b = rawPixels[i + 2];

      // Calcular el brillo del píxel (un promedio simple funciona bien para escala de grises)
      const brightness = (r + g + b) / 3;

      // Condición: ¿Es este píxel parte del cuerpo del filtro?
      if (brightness >= MIN_BRIGHTNESS && brightness <= MAX_BRIGHTNESS) {

        // --- Lógica de Recoloración ---
        // Se aplica el color de tinte, pero se modula por el brillo original.
        // Esto preserva las sombras y los brillos.
        const scale = brightness / 255;
        rawPixels[i] = TINT_COLOR.r * scale;
        rawPixels[i + 1] = TINT_COLOR.g * scale;
        rawPixels[i + 2] = TINT_COLOR.b * scale;
      }
    }

    // Crear una nueva imagen a partir de los píxeles modificados
    await sharp(rawPixels, {
      raw: {
        width: width,
        height: height,
        channels: metadata.channels
      }
    }).toFile(outputPath);

    console.log(`✅ ¡Imagen recoloreada con éxito! Resultado guardado en: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error durante el procesamiento de la imagen:', error);
  }
}

recolorFilter();

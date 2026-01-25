const Filter = require('../models/Filter');
const Groq = require("groq-sdk");
const { google } = require('googleapis');

// ============================================
// CONFIGURACIÓN GROQ AI
// ============================================
let groqClient;
let groqConfigured = false;

if (process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    groqConfigured = true;
    console.log('✅ Groq AI Activado (Llama 3.3)');
} else {
    console.log('⚠️ GROQ_API_KEY no encontrada - Modo AI deshabilitado');
}

// ============================================
// CONFIGURACIÓN GOOGLE SHEETS
// ============================================
let sheetsClient;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = 'Master50';

async function connectGoogleSheets() {
    try {
        if (!process.env.GOOGLE_SHEETS_CREDENTIALS) return false;

        const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        sheetsClient = google.sheets({ version: 'v4', auth });
        console.log('✅ Google Sheets Activado');
        return true;
    } catch (e) {
        console.error('❌ Error Sheets:', e.message);
        return false;
    }
}
connectGoogleSheets();

// ============================================
// PROMPT MAESTRO
// ============================================
function construirPromptMaestro(codigo) {
    return `Eres el Engineering Core de ELIMFILTERS, especialista en filtros automotrices.
TAREA: Generar ficha técnica de 50 columnas para: ${codigo}

REGLAS DE FABRICANTES:
* HD (Heavy Duty): Donaldson, Fleetguard, Parker
* HD + LD (Mixto): Baldwin, WIX, Sakura, Mann
* PRIORIDAD: Si es Donaldson -> HD. Si es Mann -> Evaluar LD.

PROTOCOLO DE 50 COLUMNAS (JSON Only):
IDENTIFICACIÓN: codigo, sku, fabricante, tipo, categoria, linea, serie
ESPECIFICACIONES: altura_mm, diametro_externo_mm, diametro_interno_mm, rosca, micronaje, presion_diferencial_psi, flujo_lpm, capacidad_suciedad_g, temperatura_max_c, temperatura_min_c, material_medio, material_junta, valvula_antirretorno, valvula_bypass, eficiencia_filtracion
TECNOLOGÍA ELIMFILTERS: tecnologia_medio (MACROCORE), tecnologia_junta (ELIMTEK), tecnologia_estructura (WATERBLOC), tecnologia_retencion (MICROKAPPA), certificaciones
APLICACIONES: aplicacion_primaria, equipos, industrias, posicion_motor, intervalo_servicio_hrs
CROSS REF: oem_cross, competencia_cross, cross_internacional, supersede_por, supersede_a, variantes_regionales, factor_intercambiabilidad, notas_cross
KITS: kits_disponibles, componentes_kit, kit_completo_sku
COMERCIAL: precio_usd, disponibilidad, lead_time_dias, moq
MULTIMEDIA: imagen_url, ficha_tecnica_pdf, video_instalacion

SKU RULES:
Oil -> EL8 + codigo
Fuel -> EF9 + codigo
Separator -> ES9 + codigo

FORMATO: JSON puro sin markdown.`;
}

// ============================================
// CONTROLADOR
// ============================================
exports.processSearch = async (req, res) => {
    const startTime = Date.now();
    const { query } = req.body; // POST request

    if (!query) return res.status(400).json({ error: 'Query requerido' });

    console.log(`🔍 Buscando: ${query}`);
    const codigoNormalizado = query.trim().toUpperCase();

    try {
        // 1. BUSCAR EN CACHÉ (MONGODB)
        const cached = await Filter.findOne({
            $or: [
                { codigo: codigoNormalizado },
                { sku: codigoNormalizado },
                { oem_cross: codigoNormalizado },
                { competencia_cross: codigoNormalizado },
                { cross_internacional: codigoNormalizado },
                { supersede_a: codigoNormalizado }
            ]
        });

        if (cached) {
            console.log(`✅ Cache Hit: ${cached.sku} (${Date.now() - startTime}ms)`);
            return res.json({
                success: true,
                source: 'cache',
                data: cached,
                time_ms: Date.now() - startTime
            });
        }

        // 2. GENERAR CON AI (GROQ)
        if (!groqConfigured) throw new Error('AI no disponible');

        console.log(`🤖 Generando con Groq (Llama 3.3)...`);
        const completion = await groqClient.chat.completions.create({
            messages: [
                { role: "system", content: "Responde solo JSON válido." },
                { role: "user", content: construirPromptMaestro(codigoNormalizado) }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.1,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) throw new Error('Respuesta vacía de AI');

        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const ficha = JSON.parse(cleanContent);

        // Agregar metadatos
        ficha.procesado_por = 'Groq Llama 3.3';
        ficha.fuente_datos = 'Elimfilters Orchestrator v1';
        ficha.fecha_actualizacion = new Date();

        // 3. GUARDAR RESULTADOS
        // MongoDB
        const newFilter = await Filter.create(ficha);
        console.log(`💾 Guardado en Mongo: ${newFilter.sku}`);

        // Google Sheets (Async)
        if (sheetsClient && SPREADSHEET_ID) {
            saveToSheets(ficha).catch(e => console.error('Error Sheets async:', e));
        }

        return res.json({
            success: true,
            source: 'ai',
            data: ficha,
            time_ms: Date.now() - startTime
        });

    } catch (error) {
        console.error('❌ Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message,
            query: query
        });
    }
};

// Helper Sheets
async function saveToSheets(data) {
    const row = [
        data.codigo, data.sku, data.fabricante, data.tipo, data.categoria, data.linea, data.serie,
        data.altura_mm, data.diametro_externo_mm, data.diametro_interno_mm, data.rosca, data.micronaje,
        data.presion_diferencial_psi, data.flujo_lpm, data.capacidad_suciedad_g,
        data.temperatura_max_c, data.temperatura_min_c, data.material_medio, data.material_junta,
        data.valvula_antirretorno, data.valvula_bypass, data.eficiencia_filtracion,
        data.tecnologia_medio, data.tecnologia_junta, data.tecnologia_estructura, data.tecnologia_retencion, data.certificaciones,
        data.aplicacion_primaria,
        Array.isArray(data.equipos) ? data.equipos.join(',') : data.equipos,
        Array.isArray(data.industrias) ? data.industrias.join(',') : data.industrias,
        data.posicion_motor, data.intervalo_servicio_hrs,
        Array.isArray(data.oem_cross) ? data.oem_cross.join(',') : data.oem_cross,
        Array.isArray(data.competencia_cross) ? data.competencia_cross.join(',') : data.competencia_cross,
        Array.isArray(data.cross_internacional) ? data.cross_internacional.join(',') : data.cross_internacional,
        data.supersede_por,
        Array.isArray(data.supersede_a) ? data.supersede_a.join(',') : data.supersede_a,
        JSON.stringify(data.variantes_regionales), data.factor_intercambiabilidad, data.notas_cross,
        Array.isArray(data.kits_disponibles) ? data.kits_disponibles.join(',') : data.kits_disponibles,
        Array.isArray(data.componentes_kit) ? data.componentes_kit.join(',') : data.componentes_kit,
        data.kit_completo_sku,
        data.precio_usd, data.disponibilidad, data.lead_time_dias, data.moq,
        data.imagen_url, data.ficha_tecnica_pdf, data.video_instalacion,
        data.fecha_actualizacion, data.procesado_por, data.fuente_datos
    ];

    await sheetsClient.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:AX`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] }
    });
    console.log(`📝 Guardado en Sheets: ${data.sku}`);
}

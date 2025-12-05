#!/usr/bin/env node
require('dotenv').config();

const { GoogleSpreadsheet } = require('google-spreadsheet');

async function main() {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEETS_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';

    // Prefer full JSON credentials if provided
    let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    let privateKey = process.env.GOOGLE_PRIVATE_KEY;
    if (process.env.GOOGLE_CREDENTIALS) {
      try {
        const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        clientEmail = creds.client_email || clientEmail;
        privateKey = creds.private_key || privateKey;
      } catch (e) {
        console.warn('Advertencia: GOOGLE_CREDENTIALS no es JSON válido, usando variables separadas.');
      }
    }

    if (!clientEmail || !privateKey) {
      throw new Error('Faltan credenciales de Google: configure GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_PRIVATE_KEY o GOOGLE_CREDENTIALS');
    }

    // Normalizar saltos de línea en la clave privada
    privateKey = privateKey.replace(/\\n/g, '\n');

    const doc = new GoogleSpreadsheet(SHEET_ID);
    await doc.useServiceAccountAuth({ client_email: clientEmail, private_key: privateKey });
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    const NEW_HEADERS = [
      'query',
      'normsku',
      'duty_type',
      'type',
      'subtype',
      'description',
      'oem_codes',
      'cross_reference',
      'media_type',
      'equipment_applications',
      'engine_applications',
      'height_mm',
      'outer_diameter_mm',
      'thread_size',
      'micron_rating',
      'operating_temperature_min_c',
      'operating_temperature_max_c',
      'fluid_compatibility',
      'disposal_method',
      'gasket_od_mm',
      'gasket_id_mm',
      'bypass_valve_psi',
      'beta_200',
      'hydrostatic_burst_psi',
      'dirt_capacity_grams',
      'rated_flow_gpm',
      'rated_flow_cfm',
      'operating_pressure_min_psi',
      'operating_pressure_max_psi',
      'weight_grams',
      'panel_width_mm',
      'panel_depth_mm',
      'water_separation_efficiency_percent',
      'drain_type',
      'inner_diameter_mm',
      'pleat_count',
      'seal_material',
      'housing_material',
      'iso_main_efficiency_percent',
      'iso_test_method',
      'manufacturing_standards',
      'certification_standards',
      'service_life_hours',
      'change_interval_km',
      'tecnologia_aplicada'
    ];

    const currentHeaders = sheet.headerValues;
    console.log('Encabezados actuales:', currentHeaders);
    // Asegurar ancho suficiente de columnas para los nuevos headers
    try {
      // Asegurar un mínimo de filas para evitar errores de borrado total
      const minRows = Math.max(sheet.rowCount || 1000, 1000);
      await sheet.resize({ rowCount: minRows, columnCount: NEW_HEADERS.length });
    } catch (e) {
      console.warn('No se pudo redimensionar columnas, intentando setHeaderRow directamente:', e.message);
    }
    await sheet.setHeaderRow(NEW_HEADERS);
    console.log('Encabezados actualizados:', NEW_HEADERS);
  } catch (err) {
    console.error('Error actualizando headers de la Hoja Maestra:', err.message);
    process.exit(1);
  }
}

main();
/**
 * Google Sheet Writer Service - Integrado con Detection Service v5.0.0
 * Escribe resultados del detection service a MASTER_UNIFIED_V5
 */

const { google } = require('googleapis');
const { detectPartNumber } = require('./detectionServiceFinal');
const technologyMapper = require('../utils/technologyMapper');
const skuGenerator = require('../sku/skuGenerator');

class GoogleSheetWriter {
  constructor() {
    this.sheetId = process.env.GOOGLE_SHEET_ID || '1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U';
    this.sheetName = process.env.GOOGLE_SHEET_NAME || 'MASTER_UNIFIED_V5';
    this.sheets = null;
  }

  async initialize() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
      console.log('✅ Google Sheets client initialized');
    } catch (error) {
      console.error('❌ Error initializing Google Sheets:', error);
      throw error;
    }
  }

  async processAndWrite(inputCode) {
    try {
      console.log(\n);
      console.log(🔍 PROCESSING CODE: );
      console.log('='.repeat(70));

      const detectionResult = await detectPartNumber(inputCode);
      console.log(📊 Detection Result:, JSON.stringify(detectionResult, null, 2));

      if (detectionResult.status !== 'OK') {
        console.log(⚠️  Status:  - Reason: );
        return {
          success: false,
          status: detectionResult.status,
          reason: detectionResult.reason,
          inputCode: inputCode
        };
      }

      let sku = detectionResult.sku;
      
      if (!sku && detectionResult.source && detectionResult.family && detectionResult.duty) {
        const homologatedCode = detectionResult.normalized_query || inputCode;
        sku = skuGenerator.generateSKU(
          detectionResult.family,
          detectionResult.duty,
          homologatedCode
        );
        console.log(✅ Generated SKU: );
      }

      if (!sku) {
        throw new Error('Unable to determine or generate SKU');
      }

      const exists = await this.skuExists(sku);
      if (exists) {
        console.log(⚠️  SKU  already exists in Google Sheet);
        return {
          success: true,
          message: 'SKU already exists',
          sku: sku,
          alreadyExists: true,
          detectionResult: detectionResult
        };
      }

      const technology = technologyMapper.mapTechnology(
        detectionResult.family,
        detectionResult.duty,
        detectionResult.attributes || {}
      );

      const filterData = this.buildCompleteFilterData(
        sku,
        inputCode,
        detectionResult,
        technology
      );

      const writeResult = await this.writeFilterData(filterData);

      console.log(✅ SUCCESS - Written to Google Sheet);
      console.log('='.repeat(70));

      return {
        success: true,
        message: 'Filter processed and written successfully',
        sku: sku,
        inputCode: inputCode,
        sheetWritten: true,
        detectionResult: detectionResult,
        filterData: filterData
      };

    } catch (error) {
      console.error('❌ Error in processAndWrite:', error);
      console.log('='.repeat(70));
      throw error;
    }
  }

  buildCompleteFilterData(sku, inputCode, detectionResult, technology) {
    const attributes = detectionResult.attributes || {};
    const cross = detectionResult.cross || [];
    const applications = detectionResult.applications || [];

    return {
      normsku: sku,
      query: attributes.name || attributes.description || inputCode,
      duty_type: detectionResult.duty || '',
      type: detectionResult.family || '',
      subtype: attributes.subtype || attributes.style || '',
      description: attributes.description || attributes.product_description || '',
      oem_codes: this.extractOEMCodes(cross),
      cross_reference: this.extractCrossReferences(cross),
      media_type: technology.media_type || attributes.media_type || '',
      technology_name: technology.technology_name || '',
      technology_tier: technology.technology_tier || '',
      technology_scope: technology.technology_scope || detectionResult.duty || '',
      technology_equivalents: technology.technology_equivalents || '',
      tecnologia_aplicada: technology.media_type || '',
      equipment_applications: this.extractEquipmentApplications(applications),
      engine_applications: this.extractEngineApplications(applications),
      height_mm: attributes.height_mm || attributes.length_mm || attributes.height || '',
      outer_diameter_mm: attributes.outer_diameter_mm || attributes.od || attributes.outer_diameter || '',
      inner_diameter_mm: attributes.inner_diameter_mm || attributes.id || attributes.inner_diameter || '',
      thread_size: attributes.thread_size || attributes.thread || '',
      micron_rating: attributes.micron_rating || attributes.micron || attributes.efficiency_micron || '',
      beta_200: attributes.beta_200 || attributes.beta || '',
      iso_main_efficiency_percent: attributes.efficiency_percent || attributes.iso_efficiency || '',
      operating_temperature_min_c: attributes.operating_temperature_min_c || attributes.temp_min || '',
      operating_temperature_max_c: attributes.operating_temperature_max_c || attributes.temp_max || '',
      operating_pressure_min_psi: attributes.operating_pressure_min_psi || attributes.pressure_min || '',
      operating_pressure_max_psi: attributes.operating_pressure_max_psi || attributes.pressure_max || '',
      bypass_valve_psi: attributes.bypass_valve_psi || attributes.bypass_pressure || '',
      hydrostatic_burst_psi: attributes.hydrostatic_burst_psi || attributes.burst_pressure || '',
      gasket_od_mm: attributes.gasket_od_mm || attributes.gasket_od || '',
      gasket_id_mm: attributes.gasket_id_mm || attributes.gasket_id || '',
      dirt_capacity_grams: attributes.dirt_capacity_grams || attributes.dirt_capacity || '',
      rated_flow_gpm: attributes.rated_flow_gpm || attributes.flow_gpm || '',
      rated_flow_cfm: attributes.rated_flow_cfm || attributes.flow_cfm || '',
      water_separation_efficiency_percent: attributes.water_separation_efficiency_percent || attributes.water_separation || '',
      weight_grams: attributes.weight_grams || attributes.weight || '',
      panel_width_mm: attributes.panel_width_mm || attributes.width || '',
      panel_depth_mm: attributes.panel_depth_mm || attributes.depth || '',
      seal_material: attributes.seal_material || attributes.seal || '',
      housing_material: attributes.housing_material || attributes.housing || '',
      pleat_count: attributes.pleat_count || attributes.pleats || '',
      drain_type: attributes.drain_type || attributes.drain || '',
      iso_test_method: attributes.iso_test_method || attributes.test_method || '',
      manufacturing_standards: attributes.manufacturing_standards || attributes.standards || '',
      certification_standards: attributes.certification_standards || attributes.certifications || '',
      fluid_compatibility: attributes.fluid_compatibility || attributes.fluid || '',
      disposal_method: attributes.disposal_method || '',
      service_life_hours: attributes.service_life_hours || attributes.service_life || '',
      change_interval_km: attributes.change_interval_km || attributes.change_interval || '',
      technology_oem_detected: detectionResult.source || ''
    };
  }

  extractOEMCodes(crossArray) {
    if (!Array.isArray(crossArray) || crossArray.length === 0) return '';
    const oemCodes = crossArray
      .filter(ref => ref.type === 'OEM' || ref.brand === 'OEM')
      .map(ref => ref.code || ref.partNumber)
      .filter(Boolean);
    return oemCodes.join(', ');
  }

  extractCrossReferences(crossArray) {
    if (!Array.isArray(crossArray) || crossArray.length === 0) return '';
    const crossRefs = crossArray
      .filter(ref => ref.type !== 'OEM' && ref.brand !== 'OEM')
      .map(ref => {
        const brand = ref.brand || ref.manufacturer || '';
        const code = ref.code || ref.partNumber || '';
        return brand && code ? ${brand}  : code;
      })
      .filter(Boolean);
    return crossRefs.join(', ');
  }

  extractEquipmentApplications(applicationsArray) {
    if (!Array.isArray(applicationsArray) || applicationsArray.length === 0) return '';
    const equipment = applicationsArray
      .filter(app => app.type === 'equipment' || app.category === 'equipment')
      .map(app => app.name || app.description)
      .filter(Boolean);
    return equipment.join(', ');
  }

  extractEngineApplications(applicationsArray) {
    if (!Array.isArray(applicationsArray) || applicationsArray.length === 0) return '';
    const engines = applicationsArray
      .filter(app => app.type === 'engine' || app.category === 'engine')
      .map(app => app.name || app.description)
      .filter(Boolean);
    return engines.join(', ');
  }

  mapFilterDataToRow(filterData) {
    return [
      filterData.query || '',
      filterData.normsku || '',
      filterData.duty_type || '',
      filterData.type || '',
      filterData.subtype || '',
      filterData.description || '',
      filterData.oem_codes || '',
      filterData.cross_reference || '',
      filterData.media_type || '',
      filterData.equipment_applications || '',
      filterData.engine_applications || '',
      filterData.height_mm || '',
      filterData.outer_diameter_mm || '',
      filterData.thread_size || '',
      filterData.micron_rating || '',
      filterData.operating_temperature_min_c || '',
      filterData.operating_temperature_max_c || '',
      filterData.fluid_compatibility || '',
      filterData.disposal_method || '',
      filterData.gasket_od_mm || '',
      filterData.gasket_id_mm || '',
      filterData.bypass_valve_psi || '',
      filterData.beta_200 || '',
      filterData.hydrostatic_burst_psi || '',
      filterData.dirt_capacity_grams || '',
      filterData.rated_flow_gpm || '',
      filterData.rated_flow_cfm || '',
      filterData.operating_pressure_min_psi || '',
      filterData.operating_pressure_max_psi || '',
      filterData.weight_grams || '',
      filterData.panel_width_mm || '',
      filterData.panel_depth_mm || '',
      filterData.water_separation_efficiency_percent || '',
      filterData.drain_type || '',
      filterData.inner_diameter_mm || '',
      filterData.pleat_count || '',
      filterData.seal_material || '',
      filterData.housing_material || '',
      filterData.iso_main_efficiency_percent || '',
      filterData.iso_test_method || '',
      filterData.manufacturing_standards || '',
      filterData.certification_standards || '',
      filterData.service_life_hours || '',
      filterData.change_interval_km || '',
      filterData.tecnologia_aplicada || '',
      filterData.technology_name || '',
      filterData.technology_tier || '',
      filterData.technology_scope || '',
      filterData.technology_equivalents || '',
      filterData.technology_oem_detected || ''
    ];
  }

  async writeFilterData(filterData) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const row = this.mapFilterDataToRow(filterData);

      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.sheetId,
        range: ${this.sheetName}!A:AX,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [row],
        },
      });

      console.log(✅ Filter  written to Google Sheet);
      return {
        success: true,
        sku: filterData.normsku,
        rowsUpdated: response.data.updates.updatedRows,
      };
    } catch (error) {
      console.error('❌ Error writing to Google Sheet:', error);
      throw error;
    }
  }

  async skuExists(sku) {
    try {
      if (!this.sheets) {
        await this.initialize();
      }

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.sheetId,
        range: ${this.sheetName}!B:B,
      });

      const values = response.data.values || [];
      return values.some(row => row[0] === sku);
    } catch (error) {
      console.error('❌ Error checking SKU existence:', error);
      return false;
    }
  }
}

module.exports = new GoogleSheetWriter();

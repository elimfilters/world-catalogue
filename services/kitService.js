const googleSheetsService = require('./googleSheets.service');

class KitService {
  async findKitByFilter(filterCode, duty = 'HD') {
    try {
      console.log('[Kit] Searching for kit associated with:', filterCode, 'Duty:', duty);
      
      const result = await googleSheetsService.searchInMasterKits(filterCode, 'FILTER');
      
      if (result && result.data) {
        return this.parseKitData(result.data);
      }
      
      return null;
    } catch (error) {
      console.error('[Kit] Error finding kit:', error.message);
      return null;
    }
  }

  parseKitData(data) {
    try {
      const filtersIncluded = data.filters_included || '';
      const filters = this.parseFiltersIncluded(filtersIncluded);
      
      return {
        available: true,
        kit_sku: data.kit_sku || '',
        kit_type: data.kit_type || '',
        kit_description: data.kit_description_en || '',
        filters_included: filters,
        equipment_applications: data.equipment_applications || '',
        engine_applications: data.engine_applications || '',
        oem_kit_reference: data.oem_kit_reference || '',
        change_interval_km: data.change_interval_km || '',
        change_interval_hours: data.change_interval_hours || ''
      };
    } catch (error) {
      console.error('[Kit] Error parsing kit data:', error.message);
      return null;
    }
  }

  parseFiltersIncluded(filtersString) {
    if (!filtersString) return [];
    
    try {
      const parts = filtersString.split(',');
      return parts.map(part => {
        const match = part.trim().match(/([A-Z0-9]+)×(\d+)/);
        if (match) {
          return {
            sku: match[1],
            qty: parseInt(match[2])
          };
        }
        return null;
      }).filter(Boolean);
    } catch (error) {
      console.error('[Kit] Error parsing filters:', error.message);
      return [];
    }
  }

  async saveKitToSheets(kitData) {
    try {
      const row = [
        kitData.kit_sku,
        kitData.kit_type,
        kitData.kit_series,
        kitData.kit_description_en,
        kitData.filters_included,
        kitData.equipment_applications,
        kitData.engine_applications,
        kitData.industry_segment,
        kitData.warranty_months,
        kitData.change_interval_km,
        kitData.change_interval_hours,
        kitData.normsku_base,
        kitData.oem_kit_reference,
        kitData.product_image_url,
        kitData.url_technical_sheet_pdf,
        kitData.stock_status,
        kitData.audit_status,
        new Date().toISOString(),
        'API'
      ];
      
      await googleSheetsService.appendToMasterKits(row);
      console.log('[Kit] Saved to MASTER_KITS_V1:', kitData.kit_sku);
      return true;
    } catch (error) {
      console.error('[Kit] Error saving to sheets:', error.message);
      return false;
    }
  }
}

module.exports = new KitService();

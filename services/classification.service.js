class ClassificationService {
  async classify(filterCode) {
    // 1. Buscar en Google Sheets (MASTER_UNIFIED_V5 y MASTER_KITS_V1)
    const sheetsData = await this.searchGoogleSheets(filterCode);
    if (sheetsData?.elimfiltersSKU) {
      return { ...sheetsData, source: 'google_sheets_cache' };
    }
    
    // 2. Buscar en MongoDB
    const mongoData = await this.searchMongoDB(filterCode);
    if (mongoData?.elimfiltersSKU) {
      return { ...mongoData, source: 'mongodb_cache' };
    }
    
    // 3. Detectar DUTY por fabricante
    const duty = this.detectDuty(filterCode);
    
    // 4. Cross Reference según DUTY
    const crossRefData = duty === 'HD' 
      ? await this.scrapeDonaldson(filterCode)
      : await this.scrapeFramAutolite(filterCode);
    
    if (!crossRefData?.crossReference) {
      throw new Error('No cross reference found');
    }
    
    // 5. Crear SKU con últimos 4 dígitos del cross reference
    const prefix = this.getElimfiltersPrefix(crossRefData.filterType, duty);
    const lastFour = crossRefData.crossReference.replace(/\D/g, '').slice(-4);
    
    return {
      filterCode,
      manufacturer: this.detectManufacturer(filterCode),
      filterType: crossRefData.filterType,
      duty,
      elimfiltersPrefix: prefix,
      elimfiltersSKU: prefix + lastFour,
      technology: this.getTechnology(prefix),
      crossReferenceCode: crossRefData.crossReference,
      confidence: 0.9,
      source: duty === 'HD' ? 'donaldson' : 'fram'
    };
  }
  
  getElimfiltersPrefix(type, duty) {
    if (type === 'HYDRAULIC') return 'EH6';
    if (type === 'AIR_DRYER') return 'ED4';
    if (type === 'COOLANT') return 'EW7';
    if (type === 'TURBINE') return 'ET9';
    if (type === 'FUEL_SEPARATOR') return 'ES9';
    if (type === 'OIL') return 'EL8';
    if (type === 'FUEL') return 'EF9';
    if (type === 'AIR') return 'EA1';
    if (type === 'CABIN') return 'EC1';
    if (type === 'MARINA') return 'EM9';
    if (type === 'KIT') return duty === 'HD' ? 'EK5' : 'EK3';
    return 'EL8';
  }

  getTechnology(prefix) {
    const tech = {'EA1':'MACROCORE™','EF9':'NANOFORCE™','EC1':'MICROKAPPA™','EH6':'SYNTEPORE™','EL8':'SYNTRAX™','EW7':'COOLTECH™','EM9':'MARINEGUARD™','ET9':'AQUAGUARD™','ED4':'DRYCORE™','ES9':'AQUAGUARD™','EK5':'DURATECH™','EK3':'DURATECH™'};
    return tech[prefix] || 'STANDARD';
  }
}

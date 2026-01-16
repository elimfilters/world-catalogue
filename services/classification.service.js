class ClassificationService {
  async classify(filterCode) {
    const sheetsData = await this.searchGoogleSheets(filterCode);
    const donaldsonData = await this.scrapeDonaldson(sheetsData?.crossReference || filterCode);
    
    const filterType = donaldsonData?.filterType || sheetsData?.filterType || 'UNKNOWN';
    const duty = this.detectDuty(filterCode);
    const prefix = this.getElimfiltersPrefix(filterType, duty);
    
    return {
      filterCode,
      filterType,
      duty,
      elimfiltersPrefix: prefix,
      elimfiltersSKU: prefix + filterCode.replace(/[^0-9]/g, ''),
      technology: this.getTechnology(prefix),
      crossReferenceCode: sheetsData?.crossReference,
      manufacturer: this.detectManufacturer(filterCode),
      confidence: donaldsonData ? 0.9 : 0.7
    };
  }
  
  getElimfiltersPrefix(type, duty) {
    // SOLO HD - estos NO tienen versión LD
    if (type === 'HYDRAULIC') return 'EH6';
    if (type === 'AIR_DRYER') return 'ED4';
    if (type === 'COOLANT') return 'EW7';
    if (type === 'TURBINE') return 'ET9';
    if (type === 'FUEL_SEPARATOR') return 'ES9';
    
    // HD y LD - TODOS USAN EL MISMO PREFIJO
    if (type === 'OIL') return 'EL8';
    if (type === 'FUEL') return 'EF9';
    if (type === 'AIR') return 'EA1';
    if (type === 'CABIN') return 'EC1';
    if (type === 'MARINA') return 'EM9';
    
    // KITS - estos SÍ cambian
    if (type === 'KIT') return duty === 'HD' ? 'EK5' : 'EK3';
    
    return 'EL8';
  }

  getTechnology(prefix) {
    const tech = {
      'EA1': 'MACROCORE™',
      'EF9': 'NANOFORCE™',
      'EC1': 'MICROKAPPA™',
      'EH6': 'SYNTEPORE™',
      'EL8': 'SYNTRAX™',
      'EW7': 'COOLTECH™',
      'EM9': 'MARINEGUARD™',
      'ET9': 'AQUAGUARD™',
      'ED4': 'DRYCORE™',
      'ES9': 'AQUAGUARD™',
      'EK5': 'DURATECH™',
      'EK3': 'DURATECH™'
    };
    return tech[prefix] || 'STANDARD';
  }
}

class ClassificationService {
  async classify(filterCode) {
    // 1. Buscar en Google Sheets
    const sheetsData = await this.searchGoogleSheets(filterCode);
    
    // 2. Buscar en Donaldson
    const donaldsonData = await this.scrapeDonaldson(sheetsData?.crossReference || filterCode);
    
    // 3. PRIORIZAR DONALDSON SOBRE SHEETS
    const filterType = donaldsonData?.filterType || sheetsData?.filterType || 'UNKNOWN';
    const duty = this.detectDuty(filterCode);
    const prefix = this.getElimfiltersPrefix(filterType, duty);
    
    return {
      filterCode,
      filterType,
      duty,
      elimfiltersPrefix: prefix,
      elimfiltersSKU: prefix + filterCode.replace(/[^0-9]/g, ''),
      crossReferenceCode: sheetsData?.crossReference,
      manufacturer: this.detectManufacturer(filterCode),
      confidence: donaldsonData ? 0.9 : 0.7
    };
  }
  
  getElimfiltersPrefix(type, duty) {
    const map = {
      'FUEL': duty === 'HD' ? 'EF9' : 'EF3',
      'OIL': duty === 'HD' ? 'EL8' : 'EL2', 
      'AIR': duty === 'HD' ? 'EA1' : 'EA5'
    };
    return map[type] || 'EL8';
  }
}

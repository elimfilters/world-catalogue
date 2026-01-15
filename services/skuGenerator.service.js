class SKUGeneratorService {
  constructor() {
    this.prefixMap = {
      'AIR': 'EA1',
      'FUEL': 'EF9',
      'CABIN': 'EC1',
      'HYDRAULIC': 'EH6',
      'OIL': 'EL8',
      'COOLANT': 'EW7',
      'MARINE': 'EM9',
      'TURBINE': 'ET9',
      'AIR_DRYER': 'ED4',
      'FUEL_SEPARATOR': 'ES9',
      'KIT_HD': 'EK5',
      'KIT_LD': 'EK3'
    };
  }

  generateSKU(filterData) {
    try {
      const { filterType, duty, crossReferenceCode } = filterData;
      
      if (!filterType || !duty) {
        console.error('[SKU] Missing required data:', { filterType, duty });
        return null;
      }

      const prefix = this.prefixMap[filterType];
      if (!prefix) {
        console.error(\[SKU] Unknown filter type: \\);
        return null;
      }

      // For kits, prefix already includes duty (EK5=HD, EK3=LD)
      if (filterType.startsWith('KIT_')) {
        const baseNumber = this.extractNumber(crossReferenceCode);
        return \\-\\;
      }

      // For individual filters
      const baseNumber = this.extractNumber(crossReferenceCode);
      return \\-\-\\;
    } catch (error) {
      console.error('[SKU] Generation error:', error.message);
      return null;
    }
  }

  extractNumber(code) {
    if (!code) return '00000';
    
    const numbers = code.match(/\\d+/g);
    if (!numbers) return '00000';
    
    const mainNumber = numbers[0].padStart(5, '0');
    return mainNumber;
  }
}

module.exports = new SKUGeneratorService();

const db = require('../config/db');

const ELIMFILTERS_PREFIX_MAP = {
  'OIL': 'EO5',
  'AIR': 'EA2',
  'FUEL': 'EF3',
  'CABIN': 'EC1',
  'HYDRAULIC': 'EH6',
  'COOLANT': 'EW7',
  'TRANSMISSION': 'ET8',
  'AIR_DRYER': 'ED4',
  'FUEL_SEPARATOR': 'ES9',
  'AIR_HOUSING': 'EA2'
};

async function findCrossReference(filterCode, filterType, dutyType) {
  try {
    const cleanCode = filterCode.trim().toUpperCase();
    
    const query = `
      SELECT 
        donaldson_code,
        fleetguard_code,
        wix_code,
        fram_code,
        baldwin_code,
        filter_type,
        duty_type
      FROM cross_reference_master
      WHERE (
        UPPER(TRIM(donaldson_code)) = $1 OR
        UPPER(TRIM(fleetguard_code)) = $1 OR
        UPPER(TRIM(wix_code)) = $1 OR
        UPPER(TRIM(fram_code)) = $1 OR
        UPPER(TRIM(baldwin_code)) = $1
      )
      AND UPPER(filter_type) = $2
      AND UPPER(duty_type) = $3
      LIMIT 1
    `;

    const result = await db.query(query, [cleanCode, filterType.toUpperCase(), dutyType.toUpperCase()]);
    
    if (result.rows.length > 0) {
      const row = result.rows[0];
      return {
        donaldsonCode: row.donaldson_code,
        fleetguardCode: row.fleetguard_code,
        wixCode: row.wix_code,
        framCode: row.fram_code,
        baldwinCode: row.baldwin_code
      };
    }
    
    return null;
  } catch (error) {
    console.error('Cross-reference lookup error:', error);
    return null;
  }
}

function generateElimfiltersSKU(filterType, dutyType, crossReference, originalCode) {
  const prefix = ELIMFILTERS_PREFIX_MAP[filterType];
  
  if (!prefix) {
    console.warn(`Unknown filter type: ${filterType}`);
    return null;
  }

  let donaldsonNumber = null;

  if (crossReference && crossReference.donaldsonCode) {
    donaldsonNumber = crossReference.donaldsonCode.replace(/^P/, '');
  } else {
    const cleanOriginal = originalCode.trim().toUpperCase();
    if (cleanOriginal.startsWith('P') && /^P\d+$/.test(cleanOriginal)) {
      donaldsonNumber = cleanOriginal.replace(/^P/, '');
    } else {
      console.warn(`No Donaldson code available for ${originalCode}`);
      return null;
    }
  }

  const sku = `${prefix}${donaldsonNumber}`;
  
  return sku;
}

module.exports = {
  findCrossReference,
  generateElimfiltersSKU,
  ELIMFILTERS_PREFIX_MAP
};

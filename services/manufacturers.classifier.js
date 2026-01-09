// Lista de fabricantes para clasificación
const MANUFACTURERS = {
  OEM: [
    'TOYOTA', 'LEXUS', 'SCION',
    'HONDA', 'ACURA',
    'NISSAN', 'INFINITI', 'DATSUN',
    'MAZDA', 'SUBARU', 'MITSUBISHI', 'ISUZU', 'SUZUKI',
    'FORD', 'LINCOLN', 'MERCURY',
    'GM', 'GENERAL MOTORS', 'CHEVROLET', 'GMC', 'CADILLAC', 'BUICK', 'PONTIAC', 'OLDSMOBILE', 'SATURN', 'HUMMER',
    'CHRYSLER', 'DODGE', 'JEEP', 'RAM', 'PLYMOUTH', 'MOPAR', 'EAGLE',
    'TESLA', 'AMERICAN MOTORS', 'AMC',
    'BMW', 'MINI',
    'MERCEDES', 'MERCEDES-BENZ', 'SMART',
    'AUDI', 'VW', 'VOLKSWAGEN', 'SEAT', 'SKODA', 'PORSCHE',
    'VOLVO', 'SAAB',
    'LAND ROVER', 'JAGUAR', 'RANGE ROVER',
    'FIAT', 'ALFA ROMEO', 'LANCIA', 'MASERATI', 'FERRARI',
    'PEUGEOT', 'CITROEN', 'RENAULT', 'OPEL', 'VAUXHALL',
    'ROLLS-ROYCE', 'BENTLEY', 'ASTON MARTIN', 'MCLAREN', 'LOTUS',
    'HYUNDAI', 'KIA', 'GENESIS',
    'TATA', 'MAHINDRA',
    'GEELY', 'BYD', 'CHERY', 'GREAT WALL', 'HAVAL',
    'SSANGYONG', 'DAEWOO'
  ],
  AFTERMARKET: [
    'ACDELCO', 'PUROLATOR', 'WIX', 'BALDWIN', 'FLEETGUARD', 'MANN', 'BOSCH',
    'FRAM', 'MAHLE', 'KNECHT', 'DONALDSON', 'CHAMPION', 'MOTORCRAFT',
    'DENSO', 'NGK', 'GATES', 'DAYCO', 'CONTINENTAL', 'MOOG', 'TRW',
    'BREMBO', 'ATE', 'VALEO', 'DELPHI', 'HENGST', 'UFI', 'SOFIMA',
    'COOPERS', 'SAKURA', 'RYCO', 'HASTINGS', 'LUBER-FINER',
    'NAPA', 'CARQUEST', 'AUTO EXTRA', 'ALLIANCE PARTS', 'AMSOIL',
    'ATLAS', 'CARCARE', 'ECOGARD', 'SUPER TECH', 'VALVOLINE'
  ]
};

function classifyManufacturer(brand) {
  const brandUpper = brand.toUpperCase().trim();
  
  if (MANUFACTURERS.OEM.some(oem => brandUpper.includes(oem) || oem.includes(brandUpper))) {
    return 'OEM';
  }
  
  if (MANUFACTURERS.AFTERMARKET.some(after => brandUpper.includes(after) || after.includes(brandUpper))) {
    return 'AFTERMARKET';
  }
  
  return 'AFTERMARKET';
}

module.exports = { MANUFACTURERS, classifyManufacturer };

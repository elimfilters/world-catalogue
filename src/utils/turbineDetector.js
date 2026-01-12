const RACOR_TO_ELIM_MAP = {
  '2010SMOR': 'ET92010S', '2010SM': 'ET92010S',
  '2010TMOR': 'ET92010T', '2010TM': 'ET92010T',
  '2010PMOR': 'ET92010P', '2010PM': 'ET92010P',
  '500FG': 'ET90500', '500MA': 'ET90500', '500FH': 'ET90500',
  '2040SMOR': 'ET92040S', '2040SM': 'ET92040S',
  '2040TMOR': 'ET92040T', '2040TM': 'ET92040T',
  '2040PMOR': 'ET92040P', '2040PM': 'ET92040P',
  '2040N02': 'ET92040S', '2040N10': 'ET92040T', '2040N30': 'ET92040P',
  '900FG': 'ET90900', '900MA': 'ET90900', '900FH': 'ET90900',
  '2020SMOR': 'ET92020S', '2020SM': 'ET92020S',
  '2020TMOR': 'ET92020T', '2020TM': 'ET92020T',
  '2020PMOR': 'ET92020P', '2020PM': 'ET92020P',
  '2020N02': 'ET92020S', '2020N10': 'ET92020T', '2020N30': 'ET92020P',
  '1000FG': 'ET91000', '1000MA': 'ET91000', '1000FH': 'ET91000'
};

const ELIM_TURBINE_SKUS = ['ET90500', 'ET92010S', 'ET92010T', 'ET92010P', 'ET90900', 'ET92040S', 'ET92040T', 'ET92040P', 'ET91000', 'ET92020S', 'ET92020T', 'ET92020P'];

function detectTurbineCode(code) {
  if (!code) return { isTurbine: false, elimSku: null };
  const cleanCode = code.toString().toUpperCase().trim().replace(/[-\s]/g, '');
  if (ELIM_TURBINE_SKUS.includes(cleanCode)) return { isTurbine: true, elimSku: cleanCode, inputCode: code, source: 'elimfilters_direct' };
  if (RACOR_TO_ELIM_MAP[cleanCode]) return { isTurbine: true, elimSku: RACOR_TO_ELIM_MAP[cleanCode], inputCode: code, racorCode: cleanCode, source: 'racor_exact' };
  for (const [racorCode, elimSku] of Object.entries(RACOR_TO_ELIM_MAP)) {
    if (cleanCode.includes(racorCode) || racorCode.includes(cleanCode)) return { isTurbine: true, elimSku: elimSku, inputCode: code, racorCode: racorCode, source: 'racor_partial' };
  }
  return { isTurbine: false, elimSku: null, inputCode: code };
}

function getRacorEquivalents(elimSku) {
  const equivalents = [];
  for (const [racorCode, sku] of Object.entries(RACOR_TO_ELIM_MAP)) {
    if (sku === elimSku) equivalents.push(racorCode);
  }
  return equivalents;
}

module.exports = { detectTurbineCode, getRacorEquivalents };

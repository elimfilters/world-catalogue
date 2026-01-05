const Filter = require('../models/filterModel');
exports.searchFilter = async (req, res) => {
  try {
    const { code } = req.body;
    const searchCode = code.trim().toUpperCase();
    const filter = await Filter.findOne({ $or: [{ sku: searchCode }, { 'oem_codes.code': searchCode }, { 'cross_reference_codes.code': searchCode }] });
    if (!filter) return res.status(404).json({ success: false, message: 'Filtro no encontrado' });
    res.json({ success: true, inputCode: searchCode, data: filter.toClientJSON() });
  } catch (error) { res.status(500).json({ success: false, error: error.message }); }
};
exports.getStats = async (req, res) => {
  const stats = { totalFilters: await Filter.countDocuments(), inStock: await Filter.countDocuments({ stock_status: 'IN_STOCK' }) };
  res.json({ success: true, data: stats });
};

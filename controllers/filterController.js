// ============================================
// CONTROLLERS/filterController.js
// Con tecnologías NANOFORCE™ y SYNTRAX™
// ============================================
const Filter = require('../models/filterModel');

// Función para identificar tecnología
function identifyTechnology(filter) {
  let technology = 'STANDARD';
  let brandTechnology = null;
  
  if (filter.media_type) {
    switch (filter.media_type.toUpperCase()) {
      case 'CELLULOSE':
        technology = 'STANDARD';
        break;
      case 'BLEND':
      case 'SYNTHETIC BLEND':
        technology = 'PERFORMANCE';
        brandTechnology = 'SYNTRAX™';
        break;
      case 'GLASS FIBER':
      case 'MICROGLASS':
        technology = 'PREMIUM';
        brandTechnology = 'NANOFORCE™';
        break;
      case 'SYNTHETIC':
      case 'MICROFIBER':
        technology = 'ULTRA';
        brandTechnology = 'NANOFORCE™ ULTRA';
        break;
    }
  }
  
  if (filter.tier) {
    technology = filter.tier.toUpperCase();
  }
  
  return { technology, brandTechnology };
}

// Búsqueda principal (POST)
exports.searchFilter = async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Código de búsqueda requerido'
      });
    }

    const searchCode = code.trim().toUpperCase();
    console.log(`🔍 Búsqueda: ${searchCode}`);

    const filter = await Filter.findOne({
      $or: [
        { sku: searchCode },
        { 'oem_codes.code': searchCode },
        { 'cross_reference_codes.code': searchCode }
      ]
    });

    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filtro no encontrado',
        searchedCode: searchCode
      });
    }

    let inputType = 'SKU';
    let inputManufacturer = 'ELIMFILTERS';
    
    if (filter.sku === searchCode) {
      inputType = 'SKU';
    } else if (filter.oem_codes.some(oem => oem.code === searchCode)) {
      inputType = 'OEM';
      const oemMatch = filter.oem_codes.find(oem => oem.code === searchCode);
      inputManufacturer = oemMatch.manufacturer;
    } else if (filter.cross_reference_codes.some(cr => cr.code === searchCode)) {
      inputType = 'CROSS_REFERENCE';
      const crMatch = filter.cross_reference_codes.find(cr => cr.code === searchCode);
      inputManufacturer = crMatch.manufacturer;
    }

    const { technology, brandTechnology } = identifyTechnology(filter);

    const response = filter.toObject();
    response.elimfilters_technology = {
      tier: technology,
      brand_name: brandTechnology,
      media_type: filter.media_type
    };

    res.json({
      success: true,
      source: 'database',
      inputCode: searchCode,
      inputType: inputType,
      inputManufacturer: inputManufacturer,
      data: response
    });

  } catch (error) {
    console.error('❌ Error en búsqueda:', error);
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda',
      error: error.message
    });
  }
};

// Búsqueda por código (GET)
exports.searchFilterByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const searchCode = code.trim().toUpperCase();

    const filter = await Filter.findOne({
      $or: [
        { sku: searchCode },
        { 'oem_codes.code': searchCode },
        { 'cross_reference_codes.code': searchCode }
      ]
    });

    if (!filter) {
      return res.status(404).json({
        success: false,
        message: 'Filtro no encontrado'
      });
    }

    const { technology, brandTechnology } = identifyTechnology(filter);

    const response = filter.toObject();
    response.elimfilters_technology = {
      tier: technology,
      brand_name: brandTechnology,
      media_type: filter.media_type
    };

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda',
      error: error.message
    });
  }
};

// Crear filtro
exports.createFilter = async (req, res) => {
  try {
    const existingFilter = await Filter.findOne({ sku: req.body.sku });
    if (existingFilter) {
      return res.status(400).json({
        success: false,
        message: 'El SKU ya existe'
      });
    }

    const newFilter = new Filter(req.body);
    await newFilter.save();

    res.status(201).json({
      success: true,
      message: 'Filtro creado',
      data: newFilter
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener todos
exports.getAllFilters = async (req, res) => {
  try {
    const { page = 1, limit = 50, filterType, tier } = req.query;
    const query = {};
    if (filterType) query.filter_type = filterType;
    if (tier) query.tier = tier;

    const filters = await Filter.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Filter.countDocuments(query);

    res.json({
      success: true,
      data: filters,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalRecords: count
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Obtener por SKU
exports.getFilterBySKU = async (req, res) => {
  try {
    const filter = await Filter.findOne({ sku: req.params.sku.toUpperCase() });
    if (!filter) {
      return res.status(404).json({ success: false, message: 'No encontrado' });
    }
    res.json({ success: true, data: filter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Actualizar
exports.updateFilter = async (req, res) => {
  try {
    const filter = await Filter.findOneAndUpdate(
      { sku: req.params.sku.toUpperCase() },
      req.body,
      { new: true, runValidators: true }
    );
    if (!filter) {
      return res.status(404).json({ success: false, message: 'No encontrado' });
    }
    res.json({ success: true, data: filter });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Eliminar
exports.deleteFilter = async (req, res) => {
  try {
    const filter = await Filter.findOneAndDelete({ sku: req.params.sku.toUpperCase() });
    if (!filter) {
      return res.status(404).json({ success: false, message: 'No encontrado' });
    }
    res.json({ success: true, message: 'Eliminado' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Búsqueda avanzada
exports.advancedSearch = async (req, res) => {
  try {
    const { filterType, tier, manufacturer } = req.body;
    const query = {};
    if (filterType) query.filter_type = filterType;
    if (tier) query.tier = tier;
    if (manufacturer) {
      query.$or = [
        { 'oem_codes.manufacturer': new RegExp(manufacturer, 'i') },
        { 'cross_reference_codes.manufacturer': new RegExp(manufacturer, 'i') }
      ];
    }

    const filters = await Filter.find(query).limit(100);
    res.json({ success: true, count: filters.length, data: filters });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Cross references
exports.getCrossReferences = async (req, res) => {
  try {
    const searchCode = req.params.code.trim().toUpperCase();
    const filter = await Filter.findOne({
      $or: [
        { sku: searchCode },
        { 'oem_codes.code': searchCode },
        { 'cross_reference_codes.code': searchCode }
      ]
    });

    if (!filter) {
      return res.status(404).json({ success: false, message: 'No encontrado' });
    }

    res.json({
      success: true,
      inputCode: searchCode,
      sku: filter.sku,
      oem_codes: filter.oem_codes,
      cross_reference_codes: filter.cross_reference_codes
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Estadísticas
exports.getStats = async (req, res) => {
  try {
    const stats = {
      totalFilters: await Filter.countDocuments(),
      byType: await Filter.aggregate([
        { $group: { _id: '$filter_type', count: { $sum: 1 } } }
      ]),
      byTier: await Filter.aggregate([
        { $group: { _id: '$tier', count: { $sum: 1 } } }
      ]),
      inStock: await Filter.countDocuments({ stock_status: 'IN_STOCK' })
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

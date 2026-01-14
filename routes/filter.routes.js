const express = require('express');
const router = express.Router();
const classifier = require('../services/classifier.service');
const googleSheetsService = require('../services/googleSheets.service');

router.post('/classify', async (req, res) => {
  try {
    const { filterCode } = req.body;
    
    if (!filterCode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Filter code is required' 
      });
    }

    console.log('[Filter] Request received:', filterCode);

    // PASO 1: Buscar en Google Sheets primero
    console.log('[Sheets] Searching for existing filter:', filterCode);
    const existingFilter = await googleSheetsService.searchFilterByCode(filterCode);
    
    if (existingFilter) {
      console.log('[Sheets] Filter found in database');
      return res.json({
        ...existingFilter,
        source: 'google_sheets_cache'
      });
    }

    console.log('[Sheets] Filter not found, classifying...');

    // PASO 2: No existe, clasificar y scrapear
    const result = await classifier.processFilter(filterCode);

    // PASO 3: Guardar en Google Sheets
    console.log('[Sheets] Saving new filter to database');
    await googleSheetsService.saveFilter(filterCode, result);

    res.json({
      ...result,
      source: 'new_classification'
    });

  } catch (error) {
    console.error('[Error] /classify:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

router.get('/classifications', async (req, res) => {
  try {
    const FilterClassification = require('../models/FilterClassification');
    const results = await FilterClassification.find()
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const FilterClassification = require('../models/FilterClassification');
    const stats = {
      total: await FilterClassification.countDocuments(),
      byDuty: await FilterClassification.aggregate([
        { $group: { _id: '$duty', count: { $sum: 1 } } }
      ])
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});





// AGREGAR ESTO AL FINAL DE routes/filter.routes.js
// Justo antes de: module.exports = router;

router.get('/test-sheets', async (req, res) => {
  console.log('\n🧪 TEST GOOGLE SHEETS INICIADO\n');
  
  try {
    const results = {
      step1: { name: 'Importar googleSheetsService', status: 'pending' },
      step2: { name: 'Inicializar API', status: 'pending' },
      step3: { name: 'Buscar código 04152-YZZA6', status: 'pending' },
      step4: { name: 'Guardar código de prueba', status: 'pending' },
      step5: { name: 'Verificar guardado', status: 'pending' }
    };

    // STEP 1: Importar
    console.log('📦 STEP 1: Importando googleSheetsService...');
    const googleSheetsService = require('../services/googleSheets.service');
    results.step1.status = 'success';
    console.log('   ✅ Importado correctamente\n');

    // STEP 2: Inicializar
    console.log('🔌 STEP 2: Inicializando API...');
    try {
      await googleSheetsService.initialize();
      results.step2.status = 'success';
      results.step2.details = 'API inicializada';
      console.log('   ✅ API inicializada\n');
    } catch (initError) {
      results.step2.status = 'error';
      results.step2.error = initError.message;
      console.log('   ❌ Error al inicializar:', initError.message);
      throw initError;
    }

    // STEP 3: Buscar código existente
    console.log('🔍 STEP 3: Buscando código 04152-YZZA6...');
    try {
      const existingFilter = await googleSheetsService.searchFilterByCode('04152-YZZA6');
      results.step3.status = 'success';
      
      if (existingFilter) {
        results.step3.found = true;
        results.step3.data = existingFilter;
        console.log('   ✅ CÓDIGO ENCONTRADO:');
        console.log('      Manufacturer:', existingFilter.manufacturer);
        console.log('      SKU:', existingFilter.elimfiltersSKU);
      } else {
        results.step3.found = false;
        console.log('   ❌ Código NO encontrado (esto es normal si es la primera vez)');
      }
      console.log('');
    } catch (searchError) {
      results.step3.status = 'error';
      results.step3.error = searchError.message;
      console.log('   ❌ Error al buscar:', searchError.message);
      throw searchError;
    }

    // STEP 4: Guardar código de prueba
    console.log('💾 STEP 4: Guardando código de prueba...');
    const testCode = 'TEST-' + Date.now();
    const testData = {
      filterCode: testCode,
      elimfiltersSKU: 'EL80000',
      description: 'Test Filter',
      filterType: 'OIL',
      elimfiltersPrefix: 'EL8',
      duty: 'LD',
      manufacturer: 'Test Manufacturer',
      crossReferenceCode: 'TEST123',
      elimfiltersSeries: 'STANDARD',
      source: 'test',
      timestamp: new Date().toISOString()
    };

    try {
      await googleSheetsService.saveFilter(testCode, testData);
      results.step4.status = 'success';
      results.step4.testCode = testCode;
      console.log('   ✅ Guardado exitosamente');
      console.log('      Código de prueba:', testCode);
      console.log('');
    } catch (saveError) {
      results.step4.status = 'error';
      results.step4.error = saveError.message;
      console.log('   ❌ Error al guardar:', saveError.message);
      throw saveError;
    }

    // STEP 5: Verificar que se guardó
    console.log('✓ STEP 5: Verificando que se guardó...');
    try {
      const verification = await googleSheetsService.searchFilterByCode(testCode);
      
      if (verification) {
        results.step5.status = 'success';
        results.step5.verified = true;
        console.log('   ✅ VERIFICACIÓN EXITOSA');
        console.log('      Código encontrado después de guardar');
        console.log('');
      } else {
        results.step5.status = 'warning';
        results.step5.verified = false;
        console.log('   ⚠️  ADVERTENCIA: No se encontró después de guardar');
        console.log('');
      }
    } catch (verifyError) {
      results.step5.status = 'error';
      results.step5.error = verifyError.message;
      console.log('   ❌ Error al verificar:', verifyError.message);
    }

    console.log('🏁 TEST COMPLETADO\n');

    res.json({
      success: true,
      message: 'Test completado - revisa los logs del servidor',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ERROR GENERAL EN TEST:', error.message);
    console.error('   Stack:', error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
});



module.exports = router;




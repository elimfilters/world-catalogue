// =============================================
//  VIN ENDPOINT - Complete Vehicle Filter Lookup
// =============================================

const express = require('express');
const router = express.Router();
const { processVIN } = require('../services/vinService');

// =============================================
//  GET /api/vin/:vin
//  Decode VIN and get filter recommendations
// =============================================
router.get('/:vin', async (req, res) => {
    try {
        const vin = req.params.vin?.trim();

        // Validation
        if (!vin || vin.length !== 17) {
            return res.status(400).json({
                success: false,
                error: 'Invalid VIN',
                details: 'VIN must be exactly 17 characters',
                example: '/api/vin/1HGBH41JXMN109186'
            });
        }

        console.log(`🚗 Processing VIN: ${vin}`);

        const result = await processVIN(vin);

        if (!result.valid) {
            return res.status(400).json({
                success: false,
                ...result
            });
        }

        return res.json({
            success: true,
            ...result
        });

    } catch (error) {
        console.error('❌ Error in VIN endpoint:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

// =============================================
//  POST /api/vin/lookup
//  Alternative: Lookup by Year/Make/Model
//  Returns OEM codes only - not SKUs
// =============================================
router.post('/lookup', async (req, res) => {
    try {
        const { year, make, model } = req.body;

        if (!year || !make || !model) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields',
                required: ['year', 'make', 'model'],
                example: {
                    year: '2020',
                    make: 'Ford',
                    model: 'F-150'
                }
            });
        }

        console.log(`🚗 Looking up filter codes for: ${year} ${make} ${model}`);

        // Import filter lookup function
        const { getFilterCodes } = require('../services/vinService');
        
        const vehicleInfo = {
            year,
            make,
            model,
            fuel_type: req.body.fuel_type || null,
            engine: {
                displacement_l: req.body.engine_displacement || null
            }
        };

        const filterData = await getFilterCodes(vehicleInfo);

        return res.json({
            success: true,
            vehicle: vehicleInfo,
            duty: filterData?.duty || 'LD',
            filter_codes: filterData?.codes || {},
            message: 'Filter codes retrieved - use /api/detect/:code to generate SKUs'
        });

    } catch (error) {
        console.error('❌ Error in vehicle lookup:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
            details: error.message
        });
    }
});

module.exports = router;

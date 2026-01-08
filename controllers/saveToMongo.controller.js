const donaldsonScraper = require('../services/scrapers/donaldson.scraper');
const mongodbService = require('../services/mongodb.service');

module.exports = async function saveToMongo(req, res) {
    try {
        const { code } = req.params;
        const data = await donaldsonScraper(code);

        if (!data || !data.idReal || !data.descripcion) {
            return res.status(400).json({ success: false, error: 'Scraper no devolvió datos válidos' });
        }

        if (data.filtersIncluded && data.filtersIncluded.length > 0) {
            // Es un KIT
            const kitPayload = {
                kit_sku: data.idReal,
                kit_type: "Liquid Filter Kit",
                kit_series: "HD",
                kit_description_en: data.descripcion,
                filters_included: data.filtersIncluded,
                url_technical_sheet_pdf: data.urlFinal,
                stock_status: "Disponible",
                audit_status: "pending",
                created_at: new Date().toISOString(),
                created_by: "system-auto"
            };
            await mongodbService.insertKitIfValid(kitPayload);
            return res.json({ success: true, tipo: 'kit', data: kitPayload });
        } else {
            // Es un PRODUCTO INDIVIDUAL
            const productPayload = {
                query_norm: code.toUpperCase(),
                SKU: `EL8${data.idReal.slice(-4)}`,
                Description: data.descripcion,
                Media_Type: data.especificaciones['Media Type'] || "",
                Thread_Size: data.especificaciones['Thread Size'] || "",
                Height_mm: data.especificaciones['Length'] || "",
                Outer_Diameter_mm: data.especificaciones['Outer Diameter'] || "",
                Gasket_OD_mm: data.especificaciones['Gasket OD'] || "",
                Gasket_ID_mm: data.especificaciones['Gasket ID'] || "",
                Micron_Rating: data.especificaciones['Efficiency 99%'] || "",
                Bypass_Valve_PSI: data.especificaciones['Bypass Valve Setting'] || "",
                Collapse_Burst: data.especificaciones['Collapse Burst'] || "",
                Beta_Ratio: data.especificaciones['Beta Ratio'] || "",
                ISO_Test_Method: data.especificaciones['Test Method'] || "",
                Dirt_Capacity_g: data.especificaciones['Dirt Holding Capacity'] || "",
                url_technical_sheet_pdf: data.urlFinal,
                stock_status: "Disponible",
                audit_status: "pending",
                created_at: new Date().toISOString(),
                created_by: "system-auto"
            };
            await mongodbService.insertProductIfValid(productPayload);
            return res.json({ success: true, tipo: 'producto', data: productPayload });
        }
    } catch (err) {
        console.error("Error en saveToMongo:", err);
        res.status(500).json({ success: false, error: err.message });
    }
};

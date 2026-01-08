const db = require('../config/mongo.config');

async function insertProductIfValid(product) {
    const collection = db.get().collection('filters');
    const exists = await collection.findOne({ SKU: product.SKU });

    if (!exists && product.SKU && product.Description) {
        await collection.insertOne(product);
        console.log(`✅ Producto guardado: ${product.SKU}`);
    } else {
        console.log(`⚠️ Producto ya existe o inválido: ${product.SKU}`);
    }
}

async function insertKitIfValid(kit) {
    const collection = db.get().collection('kits');
    const exists = await collection.findOne({ kit_sku: kit.kit_sku });

    if (!exists && kit.kit_sku && kit.filters_included.length > 0) {
        await collection.insertOne(kit);
        console.log(`✅ Kit guardado: ${kit.kit_sku}`);
    } else {
        console.log(`⚠️ Kit ya existe o inválido: ${kit.kit_sku}`);
    }
}

module.exports = {
    insertProductIfValid,
    insertKitIfValid
};

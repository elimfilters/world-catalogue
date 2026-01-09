const express = require('express');
const router = express.Router();
const db = require('../config/database');
const aiService = require('../services/aiService');
const { validateProductData } = require('../middleware/validationMiddleware');

// GET - Obtener todos los productos
router.get('/', async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Error al obtener productos:', error);
    res.status(500).json({ success: false, error: 'Error al obtener productos' });
  }
});

// POST - Crear producto con extraccion de atributos
router.post('/', validateProductData, async (req, res) => {
  try {
    const { title, description, price, category_id, user_id } = req.body;
    
    // Extraer atributos con IA
    console.log('Extrayendo atributos con IA...');
    const attributes = await aiService.extractAttributes(title, description, category_id);
    console.log('Atributos extraidos:', attributes);
    
    // Insertar producto
    const [result] = await db.query(
      `INSERT INTO products (title, description, price, category_id, user_id, 
       brand, color, material, size, \`condition\`, model) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        price,
        category_id,
        user_id || 1,
        attributes.brand,
        attributes.color,
        attributes.material,
        attributes.size,
        attributes.condition,
        attributes.model
      ]
    );
    
    // Obtener el producto creado
    const [newProduct] = await db.query(
      'SELECT * FROM products WHERE id = ?',
      [result.insertId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: newProduct[0],
      extractedAttributes: attributes
    });
    
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear producto',
      details: error.message
    });
  }
});

// PUT - Actualizar producto
router.put('/:id', validateProductData, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, category_id } = req.body;
    
    // Extraer nuevos atributos
    const attributes = await aiService.extractAttributes(title, description, category_id);
    
    await db.query(
      `UPDATE products 
       SET title = ?, description = ?, price = ?, category_id = ?,
           brand = ?, color = ?, material = ?, size = ?, \`condition\` = ?, model = ?
       WHERE id = ?`,
      [
        title, description, price, category_id,
        attributes.brand, attributes.color, attributes.material,
        attributes.size, attributes.condition, attributes.model,
        id
      ]
    );
    
    const [updated] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
    
    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: updated[0]
    });
    
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ success: false, error: 'Error al actualizar producto' });
  }
});

// DELETE - Eliminar producto
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM products WHERE id = ?', [id]);
    res.json({ success: true, message: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ success: false, error: 'Error al eliminar producto' });
  }
});

module.exports = router;
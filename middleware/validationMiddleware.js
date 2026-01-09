const validateProductData = (req, res, next) => {
  const { title, description, price, category_id } = req.body;
  
  const errors = [];
  
  if (!title || title.trim().length < 3) {
    errors.push('El titulo debe tener al menos 3 caracteres');
  }
  
  if (!description || description.trim().length < 10) {
    errors.push('La descripcion debe tener al menos 10 caracteres');
  }
  
  if (!price || isNaN(price) || price <= 0) {
    errors.push('El precio debe ser un numero mayor a 0');
  }
  
  if (!category_id || isNaN(category_id)) {
    errors.push('Debe seleccionar una categoria valida');
  }
  
  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      errors
    });
  }
  
  next();
};

module.exports = { validateProductData };
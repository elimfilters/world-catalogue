const Groq = require('groq-sdk');

class AIService {
  constructor() {
    this.client = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  async extractAttributes(title, description, categoryId) {
    try {
      const prompt = this.buildPrompt(title, description, categoryId);
      
      const completion = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{
          role: 'user',
          content: prompt
        }],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      });

      const responseText = completion.choices[0].message.content;
      return this.parseResponse(responseText);
    } catch (error) {
      console.error('Error en extraccion de atributos:', error);
      throw new Error('No se pudieron extraer los atributos');
    }
  }

  buildPrompt(title, description, categoryId) {
    const categoryContext = this.getCategoryContext(categoryId);
    
    return `Eres un asistente que extrae atributos de productos. Analiza este producto y extrae sus atributos clave.

PRODUCTO:
Titulo: ${title}
Descripcion: ${description}
Categoria: ${categoryContext}

INSTRUCCIONES:
1. Extrae SOLO los atributos que esten EXPLICITAMENTE mencionados
2. NO inventes informacion que no este en el titulo o descripcion
3. Devuelve un objeto JSON valido con esta estructura exacta:

{
  "brand": "marca si se menciona, null si no",
  "color": "color principal si se menciona, null si no",
  "material": "material principal si se menciona, null si no",
  "size": "talla/tamano si se menciona, null si no",
  "condition": "nuevo/usado/reacondicionado si se menciona, nuevo por defecto",
  "model": "modelo especifico si se menciona, null si no"
}

IMPORTANTE: Responde SOLO con el JSON, sin texto adicional.`;
  }

  getCategoryContext(categoryId) {
    const categories = {
      1: 'Electronica',
      2: 'Ropa y Accesorios',
      3: 'Hogar y Jardin',
      4: 'Deportes',
      5: 'Juguetes',
      6: 'Libros',
      7: 'Otros'
    };
    return categories[categoryId] || 'General';
  }

  parseResponse(responseText) {
    try {
      const attributes = JSON.parse(responseText);
      
      const validAttributes = {
        brand: attributes.brand || null,
        color: attributes.color || null,
        material: attributes.material || null,
        size: attributes.size || null,
        condition: attributes.condition || 'nuevo',
        model: attributes.model || null
      };
      
      return validAttributes;
    } catch (error) {
      console.error('Error parseando respuesta de IA:', error);
      return this.getDefaultAttributes();
    }
  }

  getDefaultAttributes() {
    return {
      brand: null,
      color: null,
      material: null,
      size: null,
      condition: 'nuevo',
      model: null
    };
  }
}

module.exports = new AIService();
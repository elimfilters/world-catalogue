const fs = require('fs');
const path = require('path');

exports.searchLocal = (query) => {
    try {
        const filePath = path.join(__dirname, '../../noteLLM.json');
        if (!fs.existsSync(filePath)) return null;
        
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const normalizedQuery = query.toUpperCase().trim();
        
        // Buscamos en el contenido de los catálogos
        const match = data.find(item => item.content.toUpperCase().includes(normalizedQuery));
        
        if (match) {
            console.log(`🎯 Coincidencia en PDF: ${match.source}`);
            return { fuente: match.source, data: match.content };
        }
        return null;
    } catch (e) {
        console.error("❌ Error en conocimiento local:", e.message);
        return null;
    }
};
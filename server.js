<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Tester - Elimfilters Catalog</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header {
            background: #1f2937;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 { font-size: 28px; margin-bottom: 10px; }
        .header p { opacity: 0.8; font-size: 14px; }
        .content { padding: 30px; }
        .test-section {
            background: #f9fafb;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .test-section h2 {
            color: #1f2937;
            font-size: 18px;
            margin-bottom: 15px;
        }
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #4b5563;
        }
        input, select {
            width: 100%;
            padding: 12px;
            border: 2px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            margin-bottom: 15px;
        }
        input:focus, select:focus {
            outline: none;
            border-color: #667eea;
        }
        button {
            background: #667eea;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: background 0.3s;
        }
        button:hover { background: #5568d3; }
        button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        .result {
            background: #1f2937;
            color: #10b981;
            padding: 20px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            overflow-x: auto;
            margin-top: 20px;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 400px;
            overflow-y: auto;
        }
        .error { color: #ef4444; }
        .success { color: #10b981; }
        .info { color: #3b82f6; }
        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid rgba(255,255,255,.3);
            border-radius: 50%;
            border-top-color: white;
            animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        .variations {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-top: 20px;
            border-radius: 4px;
        }
        .variations h3 {
            color: #92400e;
            margin-bottom: 10px;
            font-size: 16px;
        }
        .variation-item {
            background: white;
            padding: 10px;
            margin: 8px 0;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔬 API Tester</h1>
            <p>Prueba la API de Railway para encontrar la estructura correcta</p>
        </div>
        
        <div class="content">
            <div class="test-section">
                <h2>🎯 Configuración de la Prueba</h2>
                
                <label>Endpoint Base:</label>
                <input type="text" id="apiBase" value="https://catalogo-production-beaf.up.railway.app" readonly>
                
                <label>Modo (query param):</label>
                <input type="text" id="mode" value="partag" placeholder="partag">
                
                <label>Valor de búsqueda (ejemplo: P552100):</label>
                <input type="text" id="searchValue" value="P552100" placeholder="P552100">
                
                <label>Campo del Body (nombre del campo JSON):</label>
                <select id="bodyField">
                    <option value="partNumber">partNumber</option>
                    <option value="part">part</option>
                    <option value="query">query</option>
                    <option value="value">value</option>
                    <option value="search">search</option>
                </select>
                
                <button onclick="testAPI()" id="testBtn">🚀 Probar API</button>
                <button onclick="testAllVariations()" style="margin-top: 10px; background: #f59e0b;">🔄 Probar Todas las Variaciones</button>
            </div>
            
            <div class="test-section">
                <h2>📡 Request que se enviará:</h2>
                <div class="result" id="requestPreview">
POST /search?mode=partag
Content-Type: application/json

{
  "partNumber": "P552100"
}
                </div>
            </div>
            
            <div id="responseSection" style="display: none;">
                <div class="test-section">
                    <h2>📥 Respuesta de la API:</h2>
                    <div class="result" id="response"></div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Actualizar preview cuando cambian los inputs
        document.getElementById('mode').addEventListener('input', updatePreview);
        document.getElementById('searchValue').addEventListener('input', updatePreview);
        document.getElementById('bodyField').addEventListener('input', updatePreview);
        
        function updatePreview() {
            const mode = document.getElementById('mode').value;
            const value = document.getElementById('searchValue').value;
            const field = document.getElementById('bodyField').value;
            
            document.getElementById('requestPreview').textContent = 
`POST /search?mode=${mode}
Content-Type: application/json

{
  "${field}": "${value}"
}`;
        }
        
        async function testAPI() {
            const btn = document.getElementById('testBtn');
            const responseDiv = document.getElementById('response');
            const responseSection = document.getElementById('responseSection');
            
            const apiBase = document.getElementById('apiBase').value;
            const mode = document.getElementById('mode').value;
            const searchValue = document.getElementById('searchValue').value;
            const bodyField = document.getElementById('bodyField').value;
            
            btn.disabled = true;
            btn.innerHTML = '<span class="loading"></span> Probando...';
            responseSection.style.display = 'block';
            responseDiv.innerHTML = '<span class="info">⏳ Enviando petición...</span>';
            
            const url = `${apiBase}/search?mode=${mode}`;
            const body = {};
            body[bodyField] = searchValue;
            
            try {
                const startTime = performance.now();
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body)
                });
                const endTime = performance.now();
                const duration = (endTime - startTime).toFixed(2);
                
                const data = await response.json();
                
                let result = `<span class="${response.ok ? 'success' : 'error'}">`;
                result += `Status: ${response.status} ${response.statusText}\n`;
                result += `Tiempo: ${duration}ms\n`;
                result += `</span>\n`;
                result += `<span class="info">Request:</span>\n`;
                result += `POST ${url}\n`;
                result += `Body: ${JSON.stringify(body, null, 2)}\n\n`;
                result += `<span class="${response.ok ? 'success' : 'error'}">Response:</span>\n`;
                result += JSON.stringify(data, null, 2);
                
                responseDiv.innerHTML = result;
                
                if (response.ok && data && data.length > 0) {
                    responseDiv.innerHTML += `\n\n<span class="success">✅ ¡ÉXITO! Esta configuración funciona.</span>`;
                    responseDiv.innerHTML += `\n<span class="success">Usar: campo="${bodyField}", mode="${mode}"</span>`;
                }
                
            } catch (error) {
                responseDiv.innerHTML = `<span class="error">❌ Error: ${error.message}</span>\n\n`;
                responseDiv.innerHTML += `Request:\nPOST ${url}\nBody: ${JSON.stringify(body, null, 2)}`;
            } finally {
                btn.disabled = false;
                btn.innerHTML = '🚀 Probar API';
            }
        }
        
        async function testAllVariations() {
            const btn = document.getElementById('testBtn');
            const responseDiv = document.getElementById('response');
            const responseSection = document.getElementById('responseSection');
            
            btn.disabled = true;
            responseSection.style.display = 'block';
            responseDiv.innerHTML = '<span class="info">🔄 Probando todas las variaciones...</span>\n\n';
            
            const apiBase = document.getElementById('apiBase').value;
            const mode = document.getElementById('mode').value;
            const searchValue = document.getElementById('searchValue').value;
            const fields = ['partNumber', 'part', 'query', 'value', 'search', 'partag'];
            
            let successFound = false;
            let successConfig = {};
            
            for (const field of fields) {
                const url = `${apiBase}/search?mode=${mode}`;
                const body = {};
                body[field] = searchValue;
                
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(body)
                    });
                    
                    const data = await response.json();
                    
                    responseDiv.innerHTML += `\n<span class="${response.ok ? 'success' : 'error'}">`;
                    responseDiv.innerHTML += `[${response.status}] Campo: "${field}" - ${response.ok ? '✅ OK' : '❌ ERROR'}`;
                    responseDiv.innerHTML += `</span>`;
                    
                    if (response.ok && data && data.length > 0 && !successFound) {
                        successFound = true;
                        successConfig = { field, mode, data };
                        responseDiv.innerHTML += ` <span class="success">⭐ ¡ENCONTRADO!</span>`;
                    }
                    
                } catch (error) {
                    responseDiv.innerHTML += `\n<span class="error">[ERROR] Campo: "${field}" - ${error.message}</span>`;
                }
            }
            
            if (successFound) {
                responseDiv.innerHTML += `\n\n<span class="success">═══════════════════════════════════</span>`;
                responseDiv.innerHTML += `\n<span class="success">✅ CONFIGURACIÓN CORRECTA ENCONTRADA:</span>`;
                responseDiv.innerHTML += `\n<span class="success">═══════════════════════════════════</span>`;
                responseDiv.innerHTML += `\n\nCampo del body: <span class="success">"${successConfig.field}"</span>`;
                responseDiv.innerHTML += `\nModo: <span class="success">"${successConfig.mode}"</span>`;
                responseDiv.innerHTML += `\n\nEjemplo de respuesta:\n${JSON.stringify(successConfig.data[0], null, 2).substring(0, 500)}...`;
            } else {
                responseDiv.innerHTML += `\n\n<span class="error">❌ No se encontró una configuración que funcione.</span>`;
                responseDiv.innerHTML += `\n<span class="error">Verifica que la API esté funcionando correctamente.</span>`;
            }
            
            btn.disabled = false;
        }
        
        // Initialize preview
        updatePreview();
    </script>
</body>
</html>

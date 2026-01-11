const fs = require('fs');

function convertDonaldsonToCSV() {
    console.log('\n📊 CONVERTIR DONALDSON JSON → CSV');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Buscar todos los archivos JSON de Donaldson
    const files = fs.readdirSync('.').filter(f => f.startsWith('donaldson-') && f.endsWith('.json') && f !== 'donaldson-batch-summary.json');
    
    if (files.length === 0) {
        console.log('❌ No se encontraron archivos JSON de Donaldson');
        return;
    }

    console.log('📁 Archivos encontrados: ' + files.length + '\n');

    // Array para almacenar todas las filas
    const rows = [];

    // Procesar cada JSON
    files.forEach(file => {
        console.log('📄 Procesando: ' + file);
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));

        // FILA BASE con info principal del producto Donaldson
        const baseRow = {
            'Manufacturer': 'Donaldson',
            'Manufacturer_Part_Number': data.donaldsonCode,
            'Description': data.mainInfo.description,
            'Product_URL': data.url,
            
            // Especificaciones técnicas
            'Outer_Diameter': data.atributos['Diámetro exterior'] || data.atributos['DiÃ¡metro exterior'] || '',
            'Inner_Diameter': data.atributos['Diámetro interior'] || data.atributos['DiÃ¡metro interior'] || '',
            'Length': data.atributos['Longitud'] || '',
            'Efficiency': data.atributos['Eficiencia'] || '',
            'Filter_Type': data.atributos['Tipo'] || '',
            'Filter_Style': data.atributos['Estilo'] || '',
            'Filter_Family': data.atributos['Familia'] || '',
            'Brand': data.atributos['Marca'] || '',
            'Media_Type': data.atributos['Tipo de medio'] || '',
            
            // Campos para cross-reference
            'OEM_Manufacturer': '',
            'OEM_Part_Number': '',
            'OEM_Notes': '',
            
            // Aplicaciones
            'Equipment_Application': '',
            
            // Alternativos
            'Alternative_Donaldson_Code': '',
            'Alternative_Description': '',
            
            // Metadata
            'Scraped_At': data.scrapedAt,
            'Competitor_Code_Used': data.competitorCode
        };

        // GENERAR FILAS PARA CADA REFERENCIA CRUZADA (OEM)
        if (data.referenciaCruzada && data.referenciaCruzada.length > 0) {
            data.referenciaCruzada.forEach(ref => {
                const row = { ...baseRow };
                row['OEM_Manufacturer'] = ref.fabricante;
                row['OEM_Part_Number'] = ref.numero;
                row['OEM_Notes'] = ref.notas;
                rows.push(row);
            });
        } else {
            // Si no hay referencias cruzadas, agregar fila base
            rows.push({ ...baseRow });
        }

        // GENERAR FILAS PARA CADA APLICACIÓN (EQUIPOS)
        if (data.productosDelEquipo && data.productosDelEquipo.length > 0) {
            data.productosDelEquipo.forEach(equipo => {
                const row = { ...baseRow };
                row['Equipment_Application'] = equipo;
                rows.push(row);
            });
        }

        // GENERAR FILAS PARA PRODUCTOS ALTERNATIVOS
        if (data.productosAlternativos && data.productosAlternativos.length > 0) {
            data.productosAlternativos.forEach(alt => {
                const row = { ...baseRow };
                row['Alternative_Donaldson_Code'] = alt.code;
                row['Alternative_Description'] = alt.description;
                rows.push(row);
            });
        }

        console.log('   ✅ ' + data.donaldsonCode + ' - ' + data.referenciaCruzada.length + ' refs, ' + 
                    data.productosDelEquipo.length + ' equipos, ' + 
                    data.productosAlternativos.length + ' alternativos');
    });

    console.log('\n📊 Total de filas generadas: ' + rows.length);

    // Generar CSV
    if (rows.length === 0) {
        console.log('❌ No hay datos para generar CSV');
        return;
    }

    // Obtener todas las columnas únicas
    const columns = Object.keys(rows[0]);

    // Crear header
    let csv = columns.join(',') + '\n';

    // Agregar filas
    rows.forEach(row => {
        const values = columns.map(col => {
            let value = row[col] || '';
            // Escapar comillas y comas
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value + '"';
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });

    // Guardar CSV
    const csvFilename = 'donaldson-master-unified.csv';
    fs.writeFileSync(csvFilename, csv, 'utf8');

    console.log('\n💾 CSV guardado: ' + csvFilename);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 RESUMEN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📁 Archivos JSON procesados: ' + files.length);
    console.log('📋 Filas CSV generadas: ' + rows.length);
    console.log('📊 Columnas: ' + columns.length);
    console.log('\n✅ ¡CONVERSIÓN COMPLETADA! 🎉\n');

    // También generar versión resumida para análisis rápido
    generateSummaryCSV(files);
}

function generateSummaryCSV(files) {
    console.log('📝 Generando CSV resumido...\n');
    
    const summaryRows = [];

    files.forEach(file => {
        const data = JSON.parse(fs.readFileSync(file, 'utf8'));
        
        summaryRows.push({
            'Donaldson_Code': data.donaldsonCode,
            'Description': data.mainInfo.description,
            'OEM_Cross_Refs': data.referenciaCruzada.map(r => r.fabricante + ':' + r.numero).join(' | '),
            'Equipment_Count': data.productosDelEquipo.length,
            'Alternatives_Count': data.productosAlternativos.length,
            'Total_Attributes': Object.keys(data.atributos).length,
            'URL': data.url
        });
    });

    const columns = Object.keys(summaryRows[0]);
    let csv = columns.join(',') + '\n';

    summaryRows.forEach(row => {
        const values = columns.map(col => {
            let value = row[col] || '';
            value = String(value).replace(/"/g, '""');
            if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                value = '"' + value + '"';
            }
            return value;
        });
        csv += values.join(',') + '\n';
    });

    fs.writeFileSync('donaldson-summary.csv', csv, 'utf8');
    console.log('💾 CSV resumido guardado: donaldson-summary.csv\n');
}

// EJECUTAR
convertDonaldsonToCSV();

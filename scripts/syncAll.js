const { execSync } = require('child_process');

console.log('?? INICIANDO ACTUALIZACIÓN TOTAL DE ELIMFILTERS...');

try {
    console.log('\n--- 1. SINCRONIZANDO FILTROS ---');
    execSync('node scripts/syncSheets.js', { stdio: 'inherit' });

    console.log('\n--- 2. SINCRONIZANDO KITS ---');
    execSync('node scripts/syncKits.js', { stdio: 'inherit' });

    console.log('\n? ¡PROCESO COMPLETADO CON ÉXITO!');
} catch (error) {
    console.error('\n? Error en la sincronización global.');
}

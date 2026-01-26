// Función de extracción inteligente para las 40 columnas
function extraerAtributos(fragmentoTexto) {
    let specs = {};
    
    // RegEx para Diámetros (Ej: OD: 76mm o 3.0 inch)
    const odMatch = fragmentoTexto.match(/(?:OD|OUTSIDE DIA)[:\s]+([\d\.]+)\s?(?:MM|INCH|")/i);
    if (odMatch) specs.ext_diameter = odMatch[1];

    // RegEx para Altura (Ej: H: 120mm)
    const hMatch = fragmentoTexto.match(/(?:HEIGHT|H)[:\s]+([\d\.]+)\s?(?:MM|INCH|")/i);
    if (hMatch) specs.height = hMatch[1];

    // RegEx para Rosca (Ej: 3/4-16 o M20x1.5)
    const threadMatch = fragmentoTexto.match(/(?:THREAD)[:\s]+([A-Z0-9\/\-\.x]+)/i);
    if (threadMatch) specs.thread_spec = threadMatch[1];

    // RegEx para Micras
    const micronMatch = fragmentoTexto.match(/(\d+)\s?MICRON/i);
    if (micronMatch) specs.micron_rating = micronMatch[1];

    return specs;
}

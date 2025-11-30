/*
 Demo: Bifurcación CR vs OEM y Fallback de Descripción
 Ejecuta: node repo/scripts/demo_cr_oem_bifurcation.js
*/

const { buildRowData } = require('../src/services/syncSheetsService');

function demoCases() {
  return [
    {
      query_normalized: 'XG10575',
      sku: 'XG10575',
      duty: 'HD',
      type: 'Oil',
      manufactured_by: 'ELIMFILTERS',
      attributes: { description: 'OIL FILTER', height: '4.5 in', outer_diameter_mm: '3.6 in', thread_size: '3/4-16 TPI UNF', cold_start_temp: '-40 F', operating_temperature_max_f: '300 F', suitable_for: 'Motor Oil, ATF, Synthetic oils', environmental_note: 'Hazardous Waste – Used Oil', gasket_od: '2.7 in', seal_id: '2.5 in', bypass_valve_setting: '12 psi', beta_200: '200', burst_pressure: '650 psi', 'Dirt Holding Capacity': '12 oz', 'Flow Rate': '12 GPM', 'Max Operating Pressure': '300 psi', 'Net Weight': '1.2 kg', 'Gasket Material': 'Buna-N', 'Housing Material': 'Steel', 'ISO Test Method': 'ISO 4548-12:2017 Multi-Pass', 'Certifications': 'ISO 9001:2015, IATF 16949:2016, ISO 14001', 'Compliance': 'CE', 'Homologation': 'ECE', 'Service Interval': '1000 h', 'Recommended Mileage': '20000 km' },
      oem_codes: [
        '90915-YZZE2', // Toyota OEM
        'PH894',       // FRAM CR
        'LF35131',     // Fleetguard CR
        'RE509031',    // John Deere OEM
        'P552100'      // Donaldson CR
      ],
      cross_reference: [ 'LF35131', 'FF1079', 'P550335', 'PH7317' ],
      engine_applications: [
        'BOBCAT 418 ZTS Motor: Kubota D722 (2019-2022)'
      ]
    },
    {
      query_normalized: 'PA1234',
      sku: 'PA1234',
      duty: 'LD',
      type: 'Air',
      attributes: {
        description: 'AIR PANEL FILTER',
        subtype: 'Panel',
        panel_width_mm: '230 mm',
        panel_depth_mm: '30 mm',
        outer_diameter_mm: '',
        inner_diameter_mm: '',
        'Pleat Count': '36',
        rated_flow_cfm: '220 CFM'
      },
      oem_codes: ['28113-2S000'],
      cross_reference: ['CA1234','A1234'],
      engine_applications: ['HYUNDAI 2.0L - Engine Air Intake']
    },
    {
      query_normalized: 'EL5000',
      sku: 'EL5000',
      duty: 'HD',
      type: 'Fuel',
      manufactured_by: 'ELIMFILTERS',
      attributes: {
        description: 'FUEL ELEMENT',
        subtype: 'Cartridge',
        overall_height: '180 mm',
        outer_diameter: '85 mm',
        'Number of Pleats': '120',
        iso_main_efficiency_percent: '99%',
        dirt_capacity_grams: '45 g',
        operating_pressure_max_psi: '250 psi',
        'Housing Material': 'Stainless Steel',
        Certification: 'ISO 19438:2003',
        'Quality Standards': 'ISO9001 / ISO14001 / ISO45001',
        'Product Approval': 'SAE J726',
        Compliance: 'API; ASTM D999',
        'Filter Life': '750 hrs',
        'Change Interval': '15000 miles'
      },
      oem_codes: ['1R-0750'],
      cross_reference: ['BF581'],
      engine_applications: ['CATERPILLAR C7 Fuel Module']
    },
    {
      query_normalized: 'FF63009',
      sku: 'PS1010',
      duty: 'HD',
      type: 'Fuel',
      manufactured_by: 'ELIMFILTERS',
      attributes: { description: 'FUEL', subtype: 'Separator', overall_height: '260 mm', outer_diameter: '90 mm', thread_size: 'M20 x 1.5', operating_temperature_min_c: '-30 C', operating_temperature_max_c: '150 C', fluid_type: 'Diesel; Gasoline', gasket_od_mm: '70 mm', gasket_id_mm: '62 mm', presion_derivacion: '1.2 bar', 'β200': '75', 'Presión de Estallido': '40 bar', 'Gramos Retenidos': '0.58 kg', 'Rated Flow': '45 LPM', 'Min Operating Pressure': '0.8 bar', 'Max Operating Pressure': '20 bar', 'Shipping Weight': '24 oz', 'Water Separation Efficiency': '99 %', 'Seal Composition': 'FKM', 'Body Composition': 'Aluminum', 'Test Standard': 'ISO 16889:2018', 'Quality Standards': 'IATF16949; ISO 9001', 'Service Interval': '20000 miles' },
      oem_codes: [ '1R-0750', '85114070', 'BF5810', 'XG7317' ],
      cross_reference: [ 'P551841', 'FF63009' ],
      engine_applications: [
        'CUMMINS ISX15 (2014-2018)'
      ]
    },
    {
      query_normalized: 'CA9999',
      sku: 'CA9999',
      duty: 'LD',
      type: 'Aire',
      attributes: { description: 'AIR', subtype: 'Panel', total_length: '10 cm', outer_diameter_mm: '8 cm', thread_size: 'M6 x 1.0', operating_temperature_min_c: '-10 C', operating_temperature_max_c: '95 C', 'Capacidad de Polvo': '450 g', 'Rated CFM': '450 CFM', 'Peso': '350 g', 'Panel Width': '8 in', 'Thickness': '1 in', 'Gasket Material': 'EPDM' },
      oem_codes: [ 'RE509031', 'PH8A', 'FL1A', 'P777638' ],
      cross_reference: [ 'AF25150', 'P777638', 'PH8A' ],
      engine_applications: [
        'HONDA CIVIC (2002-2003) Motor: 1.7L'
      ]
    },
    {
      query_normalized: 'AAR1234',
      sku: 'AAR1234',
      duty: 'HD',
      type: 'Aire',
      attributes: { description: 'AIR', subtype: 'Radial Seal', overall_height: '220 mm', outer_diameter: '80 mm', 'Inner Diameter': '2.5 in', operating_temperature_min_c: '-20 C', operating_temperature_max_c: '120 C', 'Rated CFM': '520 CFM', 'Peso': '420 g', 'Seal Material': 'Silicone' },
      oem_codes: [ 'AF25150' ],
      cross_reference: [ 'P777638' ],
      engine_applications: [ 'VOLVO FH (2016-2019) Motor: D13' ]
    },
    {
      query_normalized: 'PA5678',
      sku: 'PA5678',
      duty: 'LD',
      type: 'Air',
      attributes: {
        description: 'AIR PANEL FILTER',
        subtype: 'Panel',
        panel_width_mm: '210 mm',
        panel_depth_mm: '28 mm',
        'Pleat Count': '40',
        rated_flow_cfm: '200 CFM',
        'Material de Envoltura': 'Nylon',
        'Método de Prueba ISO': 'ISO 16889',
        'Product Approval': 'SAE',
        'Horas de Operación Recomendadas': '500 horas',
        'Intervalo de Reemplazo': '20,000 km'
      },
      oem_codes: ['16546-4BA0A'],
      cross_reference: ['CA5678'],
      engine_applications: ['NISSAN 1.6L - Engine Air Intake']
    }
  ];
}

function run() {
  const cases = demoCases();
  cases.forEach((data, idx) => {
    const row = buildRowData(data);
    console.log(`\n# Caso ${idx + 1}`);
    console.log('SKU:', row.sku, '| Type:', row.type, '| Subtype:', row.subtype, '| Duty:', row.duty);
    console.log('Descripción:', row.description);
    console.log('Media Type:', row.media_type);
    console.log('Altura (M):', row.height_mm, '| Índice Height (num):', row.height_mm_indice_mongo, '| QA:', row.height_quality_flag || '(ok)');
    console.log('Diámetro Exterior (M):', row.outer_diameter_mm, '| Índice OD (num):', row.outer_diameter_mm_indice_mongo, '| QA:', row.outer_diameter_quality_flag || '(ok)');
    console.log('Micrones (O):', row.micron_rating || '', '| Índice Micrones (num):', (row.micron_rating_indice_mongo ?? '(n/a)'));
    console.log('Temp. Mín (P):', row.operating_temperature_min_c, '| Índice Temp Min (num):', row.operating_temperature_min_c_indice_mongo, '| QA:', row.operating_temperature_min_quality_flag || '(ok)');
    console.log('Temp. Máx (Q):', row.operating_temperature_max_c, '| Índice Temp Max (num):', row.operating_temperature_max_c_indice_mongo, '| QA:', row.operating_temperature_max_quality_flag || '(ok)');
    console.log('Compatibilidad Fluidos (R):', row.fluid_compatibility, '| Índice (array):', JSON.stringify(row.fluid_compatibility_indice_mongo || '(n/a)'), '| QA:', row.fluid_compatibility_quality_flag || '(ok)');
    console.log('Disposición (S):', row.disposal_method, '| Índice (string):', row.disposal_method_indice_mongo || '(n/a)', '| QA:', row.disposal_method_quality_flag || '(ok)');
    console.log('Gasket OD (T):', (row.gasket_od_mm || '(n/a)'), '| Índice Gasket OD (num):', (row.gasket_od_mm_indice_mongo ?? '(n/a)'), '| QA:', (row.gasket_od_quality_flag || '(ok)'));
    console.log('Gasket ID (U):', (row.gasket_id_mm || '(n/a)'), '| Índice Gasket ID (num):', (row.gasket_id_mm_indice_mongo ?? '(n/a)'), '| QA:', (row.gasket_id_quality_flag || '(ok)'));
    console.log('Bypass Valve (V):', (row.bypass_valve_psi || '(n/a)'), '| Índice Bypass (num):', (row.bypass_valve_psi_indice_mongo ?? '(n/a)'), '| QA:', (row.bypass_valve_quality_flag || '(ok)'));
    console.log('Beta 200 (W):', (row.beta_200 || '(n/a)'), '| Índice Beta (num):', (row.beta_200_indice_mongo ?? '(n/a)'), '| QA:', (row.beta_200_quality_flag || '(ok)'));
    console.log('Hydrostatic Burst (X):', (row.hydrostatic_burst_psi || '(n/a)'), '| Índice Burst (num):', (row.hydrostatic_burst_psi_indice_mongo ?? '(n/a)'), '| QA:', (row.hydrostatic_burst_quality_flag || '(ok)'));
    console.log('Rated Flow (Z):', (row.rated_flow_gpm || '(n/a)'), '| Índice Flow (num):', (row.rated_flow_gpm_indice_mongo ?? '(n/a)'), '| QA:', (row.rated_flow_quality_flag || '(ok)'));
    console.log('Water Sep Eff (AG):', (row.water_separation_efficiency_percent || '(n/a)'), '| Índice WSE (num):', (row.water_separation_efficiency_percent_indice_mongo ?? '(n/a)'), '| QA:', (row.water_separation_efficiency_quality_flag || '(ok)'));
    console.log('Rated Air Flow (AA):', (row.rated_flow_cfm || '(n/a)'), '| Índice Flow Air (num):', (row.rated_flow_cfm_indice_mongo ?? '(n/a)'), '| QA:', (row.rated_flow_air_quality_flag || '(ok)'));
    console.log('Op. Pressure Min (AB):', (row.operating_pressure_min_psi || '(n/a)'), '| Índice OpMin (num):', (row.operating_pressure_min_psi_indice_mongo ?? '(n/a)'), '| QA:', (row.operating_pressure_min_quality_flag || '(ok)'));
    console.log('Op. Pressure Max (AC):', (row.operating_pressure_max_psi || '(n/a)'), '| Índice OpMax (num):', (row.operating_pressure_max_psi_indice_mongo ?? '(n/a)'), '| QA:', (row.operating_pressure_max_quality_flag || '(ok)'));
    console.log('Weight (AD):', (row.weight_grams || '(n/a)'), '| Índice Peso (num):', (row.weight_grams_indice_mongo ?? '(n/a)'), '| QA:', (row.weight_quality_flag || '(ok)'));
    console.log('Panel Width (AE):', (row.panel_width_mm || '(n/a)'), '| Índice Panel Width (num):', (row.panel_width_mm_indice_mongo ?? '(n/a)'), '| QA:', (row.panel_width_quality_flag || '(ok)'));
    console.log('Dirt Capacity (Y):', (row.dirt_capacity_grams || '(n/a)'), '| Índice Dirt (num):', (row.dirt_capacity_grams_indice_mongo ?? '(n/a)'), '| QA:', (row.dirt_capacity_quality_flag || '(ok)'));
  console.log('Panel Depth (AF):', (row.panel_depth_mm || '(n/a)'), '| Índice Panel Depth (num):', (row.panel_depth_mm_indice_mongo ?? '(n/a)'), '| QA:', (row.panel_depth_quality_flag || '(ok)'));
console.log('Service Life (AQ):', (row.service_life_hours_display || (row.service_life_hours ? `${row.service_life_hours} horas` : '(n/a)')), '| Índice Service Life (num):', (row.service_life_hours_indice_mongo ?? '(n/a)'), '| QA:', (row.service_life_hours_quality_flag || '(ok)'));
  console.log('Change Interval (AR):', (row.change_interval_km_display || (row.change_interval_km ? `${row.change_interval_km} km` : '(n/a)')), '| Índice AR (num):', (row.change_interval_km_indice_mongo ?? '(n/a)'), '| QA:', (row.change_interval_km_quality_flag || '(ok)'));
    console.log('ISO Main Efficiency (AM):', (row.iso_main_efficiency_percent || '(n/a)'), '| Índice ISO (num):', (row.iso_main_efficiency_percent_indice_mongo ?? '(n/a)'), '| QA:', (row.iso_main_efficiency_quality_flag || '(ok)'));
  console.log('ISO Test Method (AN):', (row.iso_test_method || '(n/a)'), '| Índice Método:', (row.iso_test_method_indice_mongo ?? '(n/a)'), '| QA:', (row.iso_test_method_quality_flag || '(ok)'));
  console.log('Manufacturing Standards (AO):', (row.manufacturing_standards || '(n/a)'), '| Índice AO:', JSON.stringify(row.manufacturing_standards_indice_mongo ?? '(n/a)'), '| QA:', (row.manufacturing_standards_quality_flag || '(ok)'));
  console.log('Certification Standards (AP):', (row.certification_standards || '(n/a)'), '| Índice AP:', JSON.stringify(row.certification_standards_indice_mongo ?? '(n/a)'), '| QA:', (row.certification_standards_quality_flag || '(ok)'));
    console.log('Seal Material (AK):', (row.seal_material || '(n/a)'), '| Índice Seal:', (row.seal_material_indice_mongo ?? '(n/a)'), '| QA:', (row.seal_material_quality_flag || '(ok)'));
    console.log('Housing Material (AL):', (row.housing_material || '(n/a)'), '| Índice Housing:', (row.housing_material_indice_mongo ?? '(n/a)'), '| QA:', (row.housing_material_quality_flag || '(ok)'));
    console.log('Pleat Count (AJ):', (row.pleat_count ?? '(n/a)'), '| Índice Pleats (num):', (row.pleat_count_indice_mongo ?? '(n/a)'), '| QA:', (row.pleat_count_quality_flag || '(ok)'));
    console.log('Inner Diameter (AI):', (row.inner_diameter_mm || '(n/a)'), '| Índice Inner (num):', (row.inner_diameter_mm_indice_mongo ?? '(n/a)'), '| QA:', (row.inner_diameter_quality_flag || '(ok)'));
    console.log('Rosca (N):', row.thread_size, '| Índice Rosca:', row.thread_size_indice_mongo || '(n/a)');
    console.log('Aplicación General (J):', row.equipment_applications);
    console.log('APLICACION_MOTOR_FINAL (K):', row.engine_applications);
    console.log('OEM (G, máx8):', row.oem_codes);
    console.log('CR (H, máx8):', row.cross_reference);
    console.log('Índice Mongo (todos):', JSON.stringify(row.oem_codes_indice_mongo));
    console.log('APLICACION_MOTOR_INDICE:', JSON.stringify(row.aplicacion_motor_indice));
    console.log('Validación/Warning:', row.aplicacion_motor_warning || '(sin advertencias)');
    console.log('Índice Modelos (backend):', JSON.stringify(row.aplicacion_especifica_hd_indice_mongo));
  });
}

run();
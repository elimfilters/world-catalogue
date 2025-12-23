/**
 * Technology Database - ELIMFILTERS™
 * Base de datos completa de tecnologías por familia y duty
 */

module.exports = {
  LD: {
    AIR: [
      {
        name: 'MACROCORE™ Ultra – Air Filter (LD)',
        tier: 'Ultra',
        media_type: 'MACROCORE™ Ultra',
        equivalents: 'FRAM Titanium®, Tough Guard®'
      },
      {
        name: 'MACROCORE™ Plus – Air Filter (LD)',
        tier: 'Plus',
        media_type: 'MACROCORE™ Plus',
        equivalents: 'FRAM Ultra®, Extra Guard®'
      }
    ],
    OIL: [
      {
        name: 'ELIMTEK™ MultiCore – Oil Filter (LD)',
        tier: 'MultiCore',
        media_type: 'ELIMTEK™ MultiCore',
        equivalents: 'FRAM Synthetic Endurance™, Titanium™, Ultra Synthetic®'
      },
      {
        name: 'ELIMTEK™ Blend – Oil Filter (LD)',
        tier: 'Blend',
        media_type: 'ELIMTEK™ Blend',
        equivalents: 'FRAM Force™, Extra Guard®'
      }
    ],
    CABIN: [
      {
        name: 'MICROKAPPA™ MultiCore – Cabin Filter (LD)',
        tier: 'MultiCore',
        media_type: 'MICROKAPPA™ MultiCore',
        equivalents: 'FRAM Titanium®, Fresh Breeze®'
      },
      {
        name: 'MICROKAPPA™ Plus – Cabin Filter (LD)',
        tier: 'Plus',
        media_type: 'MICROKAPPA™ Plus',
        equivalents: 'FRAM TrueAir™, Drive™'
      }
    ],
    FUEL: [
      {
        name: 'ELIMTEK™ Thermo – Fuel Filter (LD)',
        tier: 'Thermo',
        media_type: 'ELIMTEK™ Thermo',
        equivalents: 'FRAM Fuel Filters (ALL)'
      }
    ],
    COOLANT: [
      {
        name: 'ELIMTEK™ Coolant – Coolant Filter (LD)',
        tier: 'Standard',
        media_type: 'ELIMTEK™',
        equivalents: 'FRAM Coolant Filters'
      }
    ]
  },
  HD: {
    OIL: [
      {
        name: 'ELIMTEK™ MultiCore – Oil Filter (HD)',
        tier: 'MultiCore',
        media_type: 'ELIMTEK™ MultiCore',
        equivalents: 'Fleetguard StrataPore®, Donaldson Synteq™, Synteq XP™, Duramax® HE'
      },
      {
        name: 'ELIMTEK™ Blend – Oil Filter (HD)',
        tier: 'Blend',
        media_type: 'ELIMTEK™ Blend',
        equivalents: 'Fleetguard Synthetic Blend / StrataPore® intermedio, Donaldson Blue® Media, Celulose HD, P-Series'
      }
    ],
    FUEL: [
      {
        name: 'ELIMTEK™ MultiCore – Fuel Filter (HD)',
        tier: 'MultiCore',
        media_type: 'ELIMTEK™ MultiCore',
        equivalents: 'Fleetguard StrataPore®, Donaldson Synteq™'
      },
      {
        name: 'ELIMTEK™ Blend – Fuel Filter (HD)',
        tier: 'Blend',
        media_type: 'ELIMTEK™ Blend',
        equivalents: 'Fleetguard Synthetic Blend, Donaldson Blue® Media'
      }
    ],
    'FUEL SEPARATOR': [
      {
        name: 'AquaCore™ Pro – Diesel Fuel Water Separation (HD)',
        tier: 'Pro',
        media_type: 'AquaCore™ Pro',
        equivalents: 'Fleetguard FS/FH Series, Donaldson Synteq™ DRY, Twist&Drain®, Water Absorbing Media'
      }
    ],
    AIR: [
      {
        name: 'MACROCORE™ NanoMax – Engine Air (HD)',
        tier: 'NanoMax',
        media_type: 'MACROCORE™ NanoMax',
        equivalents: 'Fleetguard NanoNet®, Donaldson Ultra-Web®, Ultra-Web® HD, Ultra-Web® FR'
      },
      {
        name: 'MACROCORE™ – Engine Air (HD)',
        tier: 'Standard',
        media_type: 'MACROCORE™',
        equivalents: 'Fleetguard Direct Flow™, Donaldson PowerCore®, RadialSeal®, Cellulose HD, FPG/FWA Series'
      }
    ],
    CABIN: [
      {
        name: 'MICROKAPPA™ – Cabin Air (HD)',
        tier: 'Standard',
        media_type: 'MICROKAPPA™',
        equivalents: 'Fleetguard Carbón Activado Cabina, Donaldson Cabin Air Premium, Endurance Cabin'
      }
    ],
    HYDRAULIC: [
      {
        name: 'HydroFlow™ 5000 – Hydraulic Systems (HD)',
        tier: '5000',
        media_type: 'HydroFlow™ 5000',
        equivalents: 'Fleetguard MicroGlass, Donaldson High-Efficiency Glass Media (HV/HVG), β2000 Glass Media, Red® Hydraulic Media'
      },
      {
        name: 'ELIMTEK™ MultiCore – Hydraulic Filter (HD)',
        tier: 'MultiCore',
        media_type: 'ELIMTEK™ MultiCore',
        equivalents: 'Fleetguard StrataPore®, Donaldson Synteq™, Synteq XP™'
      }
    ],
    'AIR DRYER': [
      {
        name: 'AeroDry™ Max – Air Brake Systems (HD)',
        tier: 'Max',
        media_type: 'AeroDry™ Max',
        equivalents: 'Fleetguard Air Dryer Cartridges, Donaldson P-Series Dryers, ADP100/200, Coalescing Desiccant Cartridges'
      }
    ],
    COOLANT: [
      {
        name: 'ThermoRelease™ – Coolant Filters (HD)',
        tier: 'Standard',
        media_type: 'ThermoRelease™',
        equivalents: 'Fleetguard FleetCool®, WF Series con DCA, Donaldson DBF Series, WF2071/2087 (carga química)'
      }
    ],
    MARINO: [
      {
        name: 'AQUACORE™ Marine 2000 – Ultra-Separator Secondary Stage',
        tier: '2000',
        media_type: 'AQUACORE™ Marine 2000',
        equivalents: 'Racor/Parker Serie secundarias S3201/S3209, Fleetguard FH230/FS36231, Donaldson Synteq DRY Marina'
      },
      {
        name: 'AQUACORE™ Marine 1000 – Primary Coalescing Stage',
        tier: '1000',
        media_type: 'AQUACORE™ Marine 1000',
        equivalents: 'Racor/Parker 500FG/900FG/1000FG (primera etapa), Fleetguard FS19594 (primario marino), Donaldson Kit primario marino Water Separator'
      }
    ],
    TURBINA: [
      {
        name: 'HYDROFLOW™ TurboMax – Industrial/Marine Turbine Filtration',
        tier: 'TurboMax',
        media_type: 'HYDROFLOW™ TurboMax',
        equivalents: 'Donaldson High Efficiency Glass Turbine Filters, Fleetguard MicroGlass Industrial'
      }
    ],
    CARCASA: [
      {
        name: 'ELIMFILTERS™ Housing Assembly',
        tier: 'Standard',
        media_type: 'Housing',
        equivalents: 'OEM Housing Assemblies'
      }
    ],
    KITS: [
      {
        name: 'ELIMFILTERS™ Maintenance Kit',
        tier: 'Complete',
        media_type: 'Kit',
        equivalents: 'OEM Maintenance Kits'
      }
    ]
  }
};

/**
 * Technology Mapper - v5.0.0
 * Mapea filtros a tecnologías ELIMFILTERS™ basándose en familia, duty y atributos
 */

const technologyDatabase = require('../config/technologyDatabase');

class TechnologyMapper {
  mapTechnology(family, duty, attributes = {}) {
    const normalizedFamily = String(family || '').toUpperCase();
    const normalizedDuty = String(duty || '').toUpperCase();

    const isHeavyDuty = normalizedDuty.includes('HEAVY') || normalizedDuty === 'HD';
    const isLightDuty = normalizedDuty.includes('LIGHT') || normalizedDuty === 'LD';
    const isMarine = normalizedDuty.includes('MARINE') || normalizedFamily === 'MARINO';
    const isTurbine = normalizedFamily === 'TURBINA';

    if (isMarine) {
      return this.getMarineTechnology(attributes);
    }

    if (isTurbine) {
      return this.getTurbineTechnology(attributes);
    }

    const dutyKey = isHeavyDuty ? 'HD' : (isLightDuty ? 'LD' : 'HD');
    const technologies = this.getTechnologiesForFamily(normalizedFamily, dutyKey);

    if (!technologies || technologies.length === 0) {
      return this.getDefaultTechnology(normalizedFamily, normalizedDuty);
    }

    const selectedTech = this.selectBestTechnology(technologies, attributes);

    return {
      technology_name: selectedTech.name,
      technology_tier: selectedTech.tier,
      technology_scope: normalizedDuty,
      media_type: selectedTech.media_type,
      technology_equivalents: selectedTech.equivalents
    };
  }

  getTechnologiesForFamily(family, duty) {
    const techDB = technologyDatabase[duty] || technologyDatabase.HD;
    return techDB[family] || [];
  }

  selectBestTechnology(technologies, attributes) {
    if (technologies.length === 1) {
      return technologies[0];
    }

    const mediaType = String(attributes.media_type || attributes.media || '').toLowerCase();
    const efficiency = parseFloat(attributes.efficiency_percent || attributes.iso_efficiency || 0);
    const micron = parseFloat(attributes.micron_rating || attributes.micron || 99);

    if (mediaType.includes('synthetic') && !mediaType.includes('blend')) {
      const synthetic = technologies.find(t => 
        t.tier === 'MultiCore' || t.tier === 'Ultra' || t.tier.includes('Synthetic')
      );
      if (synthetic) return synthetic;
    }

    if (mediaType.includes('blend') || mediaType.includes('cellulose')) {
      const blend = technologies.find(t => 
        t.tier === 'Blend' || t.tier === 'Plus'
      );
      if (blend) return blend;
    }

    if (mediaType.includes('nanofiber') || mediaType.includes('nanofibra') || mediaType.includes('nano')) {
      const nano = technologies.find(t => 
        t.tier === 'NanoMax' || t.tier === 'Ultra' || t.name.includes('NanoMax')
      );
      if (nano) return nano;
    }

    if (efficiency >= 99 || micron <= 10) {
      const highEff = technologies.find(t => 
        t.tier === 'MultiCore' || t.tier === 'Ultra' || t.tier === 'NanoMax' || t.tier === 'Pro'
      );
      if (highEff) return highEff;
    }

    return technologies[0];
  }

  getMarineTechnology(attributes) {
    const description = String(attributes.description || '').toLowerCase();
    const subtype = String(attributes.subtype || '').toLowerCase();
    
    if (description.includes('secondary') || description.includes('secundari')) {
      return {
        technology_name: 'AQUACORE™ Marine 2000 – Ultra-Separator Secondary Stage',
        technology_tier: '2000',
        technology_scope: 'Marine – Secondary HPCR Protection',
        media_type: 'AQUACORE™ Marine 2000',
        technology_equivalents: 'Racor/Parker Serie secundarias S3201/S3209, Fleetguard FH230/FS36231, Donaldson Synteq DRY Marina'
      };
    }

    if (description.includes('turbine') || subtype.includes('turbine')) {
      return {
        technology_name: 'TURBINE X1000 – High-Capacity Assembly',
        technology_tier: 'X1000',
        technology_scope: 'Turbine – High Capacity',
        media_type: 'AQUACORE™ Turbine',
        technology_equivalents: 'Racor/Parker 1000FG, Donaldson MAR1000, Fleetguard FH256'
      };
    }

    return {
      technology_name: 'AQUACORE™ Marine 1000 – Primary Coalescing Stage',
      technology_tier: '1000',
      technology_scope: 'Marine – Primary Fuel/Water Separation',
      media_type: 'AQUACORE™ Marine 1000',
      technology_equivalents: 'Racor/Parker 500FG/900FG/1000FG, Fleetguard FS19594, Donaldson MAR Series'
    };
  }

  getTurbineTechnology(attributes) {
    return {
      technology_name: 'HYDROFLOW™ TurboMax – Industrial/Marine Turbine Filtration',
      technology_tier: 'TurboMax',
      technology_scope: 'Turbine – Industrial/Marine',
      media_type: 'HYDROFLOW™ TurboMax',
      technology_equivalents: 'Donaldson High Efficiency Glass Turbine Filters, Fleetguard MicroGlass Industrial'
    };
  }

  getDefaultTechnology(family, duty) {
    return {
      technology_name: ELIMTEK™ –  Filter (),
      technology_tier: 'Standard',
      technology_scope: duty,
      media_type: 'ELIMTEK™',
      technology_equivalents: ''
    };
  }
}

module.exports = new TechnologyMapper();

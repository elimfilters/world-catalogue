function normalizeMarineAuthority(racor, sierra) {
  if (racor?.valid) {
    return {
      authority_primary: 'RACOR',
      authority_secondary: sierra?.valid ? 'SIERRA' : null,
      family: racor.family,
      attributes: racor.attributes,
      cross: [
        ...(racor.cross || []),
        ...(sierra?.cross || [])
      ]
    };
  }

  if (sierra?.valid) {
    // Solo si RACOR no existe
    return {
      authority_primary: 'SIERRA',
      authority_secondary: null,
      family: sierra.family,
      attributes: sierra.attributes,
      cross: sierra.cross || []
    };
  }

  return null;
}

module.exports = { normalizeMarineAuthority };

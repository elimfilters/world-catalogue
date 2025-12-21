function resolveMarine({ racor, sierra }) {
  if (!racor?.valid) {
    return { allowed: false, reason: 'RACOR_NOT_CONFIRMED' };
  }

  return {
    allowed: true,
    authority: 'RACOR',
    family: racor.family,   // FUEL / OIL / AIR
    racorCode: racor.code,
    sierraCode: sierra?.code || null
  };
}

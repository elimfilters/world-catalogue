function mergeMarineEquivalents(record, source, code) {
  const equivalents = record.equivalents || {};
  const list = equivalents[source] || [];

  if (!list.includes(code)) {
    list.push(code);
  }

  return {
    ...equivalents,
    [source]: list
  };
}

module.exports = { mergeMarineEquivalents };

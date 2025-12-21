function normalizeResponse({
  status,
  source,
  sku = null,
  family = null,
  duty = null,
  attributes = {},
  cross = [],
  applications = [],
  normalized_query = null,
  reason = null
}) {
  return {
    api_version: "5.0.0",
    status,
    source,
    sku,
    family,
    duty,
    attributes,
    cross,
    applications,
    meta: { normalized_query, reason }
  };
}

module.exports = { normalizeResponse };

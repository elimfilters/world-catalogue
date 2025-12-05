# Notas de estabilidad de política de SKU

Estas reglas están activas y diseñadas para resultados consistentes y trazables:

- `SKU_POLICY_ENFORCE` (true por defecto): aplica el guardia inviolable al generar/upsert de SKUs.
- `ALLOW_HD_AF_RS_DONALDSON` (true): resuelve AF/RS en duty HD hacia Donaldson `P#####` si existe cruce válido.
- `ALLOW_OEM_FALLBACK_PREFIX` (true): permite fallback OEM por prefijo + últimos 4 cuando el fabricante no homologa.
- `ALLOW_LD_FRAM_CANONIZATION` (true): intenta canonizar LD vía FRAM usando mapa curado y validación estricta.

## AF/RS → Donaldson (HD)

- Se normalizan variantes `AF####`, `AF####M`, `RS####`, `RS-####` eliminando sufijos y separadores.
- Se busca en `cross_references` del `DONALDSON_DATABASE` con comparación por base `AF/RS + dígitos` y por dígitos.
- Ejemplos resueltos: `AF25139(M)`, `RS3518`, `FA1077`, `WIX-46556` → `P527682`.
- Una vez resuelto, el flujo ajusta `duty` a `HD` por fuente `DONALDSON` y el guardia valida `EA1 + last4(P)`.

## Consistencia y Trazabilidad

- El servicio de detección incluye el `policy_hash` y flags en la respuesta API para auditar reglas aplicadas.
- Se recomienda probar con el script `repo/scripts/test_afrs_resolution_consistency.js` (no interactivo) para validar normalización AF/RS.

## Comportamientos esperados

- `OK`: homologado por fabricante (HD→Donaldson, LD→FRAM) y SKU coincide con tabla de decisión.
- `OEM_FALLBACK`: si el fabricante no homologa, se permite OEM por prefijo sólo si familia/duty inferidos son coherentes.
- `NOT_FOUND`: si no hay homólogo ni hint OEM suficiente, no se genera SKU.
- `POLICY_VIOLATION`: discrepancias con la política; se bloquea el upsert.
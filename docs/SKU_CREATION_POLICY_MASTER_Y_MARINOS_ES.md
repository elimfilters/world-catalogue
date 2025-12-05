# Política de Creación de SKUs — Hoja Master y Marinos

Este documento consolida las reglas oficiales de creación de SKUs ELIMFILTERS para la Hoja Master y separa explícitamente la línea de motores Marinos, con sus prefijos jerárquicos y subtipos.

## Hoja Master — Familias Base y Prefijos

- OIL → EL8 (HD/LD)
- FUEL → EF9 (HD/LD)
- AIRE → EA1 (HD/LD)
- CABIN → EC1 (HD/LD)
- FUEL SEPARATOR → ES9 (HD)
- AIR DRYER → ED4 (HD)
- HIDRAULIC → EH6 (HD)
- COOLANT → EW7 (HD)
- CARCAZA AIR FILTER → EA2 (HD)
- KITS SERIES HD → EK5 (HD)
- KITS SERIES LD → EK3 (LD)

### Reglas de Construcción

- Prefijo oficial por familia/duty según la tabla de decisión.
- SKU se construye como `prefix + last4` con `last4 = 4 dígitos numéricos` extraídos del código OEM.
- Validación estricta: `last4` debe cumplir `^\d{4}$`; sin letras, sin invenciones.
- Si faltan `family/duty/last4`, se retorna error controlado y se registra en self-healing cuando aplica.

### Cobertura por Duty

- HD/LD: `EL8`, `EF9`, `EA1`, `EC1`. (La familia `EM9` es marina y se documenta aparte.)
- Solo HD: `ES9`, `ED4`, `EH6`, `EW7`, `EA2`, `ET9`, `EK5`.
- Solo LD: `EK3`.

### Jerarquía y Subtipos

- Las familias base no tienen jerarquía adicional de subtipos; usan el patrón estándar `prefix + last4`.
- Excepciones jerárquicas definidas fuera de Master (ver sección Marinos/Turbine): `ET9`/`ET9-F`, `EM9`.

### Ejemplos Rápidos

- `OIL|HD` con `last4=2100` → `EL82100`
- `FUEL|LD` con `last4=5234` → `EF95234`
- `AIRE|HD` con `last4=1432` → `EA11432`
- `CABIN|LD` con `last4=7788` → `EC17788`
- `FUEL SEPARATOR|HD` con `last4=0060` → `ES90060`
- `AIR DRYER|HD` con `last4=1200` → `ED41200`
- `HIDRAULIC|HD` con `last4=4501` → `EH64501`
- `COOLANT|HD` con `last4=3007` → `EW73007`
- `CARCAZA AIR FILTER|HD` con `last4=8921` → `EA28921`

> Nota: `TURBINE SERIES` no se incluye en la Hoja Master. Su manejo es exclusivamente lógica en servidor y/o flujos de Marinos (prefijos ET9/EM9 según reglas específicas).

## Hoja Marinos — Alcance, Prefijos y Subtipos

La jerarquía de prefijos y subtipos aplica a la línea de motores marinos, con reglas específicas para separadores, elementos y sistemas Turbine.

### Prefijos Marino

- `EM9` base para familia `MARINE` (HD/LD admitidos).
- `EM9-S` para separadores marinos, concatenando el código original.
- `EM9-F` para elementos de combustible marinos, usando últimos 4 alfanuméricos.
- `EM9-O` para elementos de aceite marinos, usando últimos 4 alfanuméricos.
- `EM9-A` para elementos de aire en línea marina, usando últimos 4 alfanuméricos.

### Disparadores por patrón

- Separadores (`EM9-S`): `^R(12|15|20|25|45|60|90|120)(T|S)$` → ejemplo: `R12T`, `R90S`.
- Sistemas Turbine (`ET9`): `^\d{3,5}(MA|FH)\b` → ejemplo: `900MA`, `1000FH` → SKU: `ET9900MA`, `ET91000FH`.
- Elementos Turbine (`ET9-F`): `^(2010|2020|2040)` con sufijo `T/P/S` detectado → ejemplo: `2020SM` → `ET9-F2020S`.
- Subtipo genérico Marino (`EM9-*`): cuando la familia es `MARINE` y no coincide con los patrones anteriores:
  - Base por defecto `FUEL` → `EM9-F` + últimos 4 alfanuméricos.
  - Si el hint de familia es `OIL` o `AIRE`, se mapea a `EM9-O` o `EM9-A`.

### Reglas de construcción

- `EM9-S` + `originalCode` sin limpiar: ejemplo `R20S` → `EM9-SR20S`.
- `EM9-F` / `EM9-O` / `EM9-A` + `last4` alfanumérico (`[A-Z0-9]{4}`), en mayúsculas.
- `ET9` + `originalCode` para sistemas (housing): ejemplo `900MA` → `ET9900MA`.
- `ET9-F` + base (tres a cinco dígitos) + sufijo micrón:
  - Preferencia del sufijo por presencia en el código: `T` > `P` > `S`.

### Subtipo semántico (columna `subtype`)

- `SEPARATOR` si coincide patrón `RxxT/RxxS`.
- `SYSTEM` si coincide `^\d{3,5}(MA|FH)\b`.
- `ELEMENT` si coincide `^(2010|2020|2040)`.
- Vacío en casos genéricos `EM9-F` / `EM9-O` / `EM9-A` que no son Turbine ni separador.

### Ejemplos rápidos

- `R12T` → `EM9-SR12T` (`subtype=SEPARATOR`, `family=MARINE`).
- `R90S` → `EM9-SR90S` (`subtype=SEPARATOR`, `family=MARINE`).
- `900MA` → `ET9900MA` (`subtype=SYSTEM`, `family=TURBINE SERIES`).
- `2020SM` → `ET9-F2020S` (`subtype=ELEMENT`, `family=TURBINE SERIES`).
- `MARINE` + code `AB12C` con hint `FUEL` → `EM9-FB12C`.
- `MARINE` + code `X7Y8Z` con hint `OIL` → `EM9-O7Y8Z`.

### Notas de consistencia

- `EM9-A` está soportado por el generador para `AIRE` en Marino; se añade a la lista oficial de prefijos admitidos para documentación y validación.
- Importación Marina: se recomienda usar extracción alfanumérica de `last4` para `EM9-F/O/A` por coherencia con el generador.
- La homologación HD/LD se flexibiliza para `MARINE` y `TURBINE SERIES` según la política, permitiendo OEM (p.ej., RACOR/PARKER/SIERRA/MERCURY/MERCRUISER).

---

Actualizado: diciembre 2025. Fuente: `repo/src/config/skuRules.json`, `repo/src/sku/generator.js`, `repo/src/services/marineImportService.js`, `repo/src/services/detectionServiceFinal.js`.
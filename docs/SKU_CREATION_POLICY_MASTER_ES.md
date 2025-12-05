# Política de Creación de SKUs — Hoja Master (solo Master)

Este documento describe las reglas oficiales para generar SKUs en la Hoja Master, separadas de cualquier lógica específica de Marinos. Incluye familias base, prefijos, cobertura por tipo de servicio (HD/LD), la regla de construcción del SKU y ejemplos por familia.

## Alcance y Principios

- Aplica únicamente a la Hoja Master (no a la hoja Marinos).
- La construcción del SKU sigue la forma `prefijo + 4 dígitos` estrictamente numéricos.
- El prefijo se determina por la combinación `familia|duty` usando la tabla de decisión oficial.
- La validación rechaza SKUs si los últimos 4 no son dígitos (`^\d{4}$`).

## Regla de Construcción

- `SKU = prefix + last4`
- `last4` debe ser exactamente 4 dígitos (`0000–9999`).
- El `prefix` se obtiene de las reglas canónicas por `familia|duty`.

## Familias y Prefijos (Master)

- OIL — HD/LD → `EL8`
- FUEL — HD/LD → `EF9`
- AIRE — HD/LD → `EA1`
- CABIN — HD/LD → `EC1`
- FUEL SEPARATOR — HD → `ES9`
- AIR DRYER — HD → `ED4`
- HIDRAULIC — HD → `EH6`
- COOLANT — HD → `EW7`
- CARCAZA AIR FILTER — HD → `EA2`
- KITS SERIES HD — HD → `EK5`
- KITS SERIES LD — LD → `EK3`

Notas:
- Las familias con cobertura HD/LD aceptan ambos tipos de servicio; otras son solo HD o solo LD según se especifica.
- TURBINE SERIES no se incluye en la Hoja Master; se maneja exclusivamente como lógica en servidor (prefijos ET9/EM9) y/o en flujos específicos de Marinos.

## Cobertura por Duty

- HD y LD: `OIL`, `FUEL`, `AIRE`, `CABIN`.
- Solo HD: `FUEL SEPARATOR`, `AIR DRYER`, `HIDRAULIC`, `COOLANT`, `CARCAZA AIR FILTER`, `KITS SERIES HD`.
- Solo LD: `KITS SERIES LD`.

## Ejemplos de SKUs (Master)

- OIL (HD/LD): `EL8` + `1234` → `EL81234`
- FUEL (HD/LD): `EF9` + `5678` → `EF95678`
- AIRE (HD/LD): `EA1` + `0420` → `EA10420`
- CABIN (HD/LD): `EC1` + `9012` → `EC19012`
- FUEL SEPARATOR (HD): `ES9` + `3344` → `ES93344`
- AIR DRYER (HD): `ED4` + `7788` → `ED47788`
- HIDRAULIC (HD): `EH6` + `5555` → `EH65555`
- COOLANT (HD): `EW7` + `2660` → `EW72660`
- CARCAZA AIR FILTER (HD): `EA2` + `8888` → `EA28888`
- KITS SERIES HD (HD): `EK5` + `7001` → `EK57001`
- KITS SERIES LD (LD): `EK3` + `4300` → `EK34300`

## Fuentes Autoritativas en el Código

- Reglas y tabla de decisión: `repo/src/config/skuRules.json` (`decisionTable`).
- Generación y validación: `repo/src/sku/generator.js` (`getPrefix`, `generateSKU`).
- Inferencia determinista de `family|duty` por prefijo OEM/marca: `repo/src/config/prefixMap.js`.
- Guardia de política al escribir en Master: `repo/src/services/syncSheetsService.js` (usa la política y normaliza columnas).

## Normalización de Columnas (Master)

- Dimensiones (`height_mm`, `outer_diameter_mm`): se convierten a milímetros si vienen en pulgadas o centímetros.
- `thread_size`: normalizada a formato canónico si hay variaciones de estilo.
- `micron_rating`: estándar numérico; se evita texto libre.
- `operating_temperature_min_c` y `operating_temperature_max_c`: en grados Celsius; se corrigen valores provenientes de otras unidades.
- Estas normalizaciones se aplican en el flujo de construcción de fila Master para mantener consistencia en el catálogo.

## Instrucciones por Columnas (A–AR)

Regla de fuente por duty:
- HD: columnas `A–E` provienen exclusivamente de Donaldson; `F–AR` se completan exclusivamente con datos técnicos (Fleetguard y fuentes técnicas). No se mezclan fuentes.
- LD: columnas `A–AR` provienen exclusivamente de FRAM.
- Fallback OEM: solo cuando no exista homologación Donaldson/FRAM; `A–E` se basan en OEM homologado, `F–AR` se dejan en blanco o con defaults, sin adivinar.

Valores, metodología y normalizaciones por columna:
- A `query`: código de entrada normalizado (`A–Z0–9`, sin guiones/espacios). HD: Donaldson homologado; LD: FRAM homologado; fallback: OEM normalizado. Prohibido inventar.
- B `normsku`: `prefix + last4` estrictos. `last4`: de Donaldson/FRAM u OEM. Validación y unicidad obligatorias.
- C `duty_type`: derivado de reglas oficiales por familia/prefijo; sin overrides manuales.
- D `type`: familia canónica (AIRE, OIL, FUEL, CABIN, etc.) según tabla de decisión; no se adivina.
- E `subtype`: se asigna solo si se infiere determinísticamente (`resolveSubtype`); de lo contrario vacío.
- F `description`: HD: técnica del proveedor (Fleetguard u oficial); LD: descripción FRAM. Si falta, dejar vacío/N/A. Campo inmutable: no se sobreescribe en upsert.
- G `oem_codes`: lista de OEM del proveedor; normalizada y deduplicada; sin inyecciones arbitrarias.
- H `cross_reference`: referencias del proveedor; deduplicadas; sanitizadas.
- I `media_type`: tipo de medio canónico; de proveedor o mappers; si falta, `N/A`.
- J `equipment_applications`: aplicaciones de equipo (array) provistas por el proveedor.
- K `engine_applications`: aplicaciones de motor (array) provistas por el proveedor.
- L `height_mm`: convertir a `mm` si viene en `in/cm`; sin estimaciones.
- M `outer_diameter_mm`: convertir a `mm` si viene en `in/cm`; sin estimaciones.
- N `thread_size`: estandarizar patrón (por ejemplo, `Mxxx`/`UNF`), sin texto libre.
- O `micron_rating`: numérico; si falta, `0`; no texto.
- P `operating_temperature_min_c`: `°C`; aplicar defaults solo si `FALLBACK_TEMP_ENABLED=true` y según familia.
- Q `operating_temperature_max_c`: `°C`; mismos criterios que `P`. Viton puede elevar umbral por regla documentada.
- R `fluid_compatibility`: valores canónicos; de proveedor; si falta, `N/A`.
- S `disposal_method`: valores canónicos por familia; si falta, `N/A`.
- T `gasket_od_mm`: a `mm`; solo valores del proveedor.
- U `gasket_id_mm`: a `mm`; solo valores del proveedor.
- V `bypass_valve_psi`: a `psi`; convertir desde `bar/kPa` si aplica.
- W `beta_200`: numérico; de pruebas ISO; si falta, `0`.
- X `hydrostatic_burst_psi`: a `psi`; solo proveedor; si falta, `0`.
- Y `dirt_capacity_grams`: convertir `mg/kg/lb/oz → g`; si falta, `0`.
- Z `rated_flow_gpm`: para aceite/combustible/hidráulico/refrigerante; convertir `LPM/GPH/LPH/m³/h → GPM`; si falta, `0`.
- AA `rated_flow_cfm`: para aire/secador de aire; convertir `L/s/L/min/m³/h → CFM`; si falta, `0`.
- AB `operating_pressure_min_psi`: a `psi`; si falta, `0`.
- AC `operating_pressure_max_psi`: a `psi`; si falta, `0`.
- AD `weight_grams`: convertir `kg/lb/oz → g`; si falta, `0`.
- AE `panel_width_mm`: a `mm`; si falta, `0`.
- AF `panel_depth_mm`: a `mm`; si falta, `0`.
- AG `water_separation_efficiency_percent`: `0–100`; si falta, `0`.
- AH `drain_type`: valor canónico; si falta, `N/A`.
- AI `inner_diameter_mm`: a `mm`; si falta, `0`.
- AJ `pleat_count`: numérico; si falta, `0`.
- AK `seal_material`: valor canónico; si falta, `N/A`.
- AL `housing_material`: valor canónico; si falta, `N/A`.
- AM `iso_main_efficiency_percent`: numérico; si falta, `0`.
- AN `iso_test_method`: método ISO canónico; si falta, `N/A`.
- AO `manufacturing_standards`: array canónico; si falta, `[]`.
- AP `certification_standards`: array canónico; si falta, `[]`.
- AQ `service_life_hours`: numérico; si falta, `0`.
- AR `change_interval_km`: numérico; si falta, `0`.

## Tecnología Aplicada (medios filtrantes)

- Columna: `tecnologia_aplicada` (etiqueta técnica ELIMFILTERS seleccionada automáticamente).
- Selección basada en `familia|duty|señales del proveedor` y heurísticas documentadas.
- Aire
  - HD → `MACROCORE™ NanoMax`.
  - LD → `MACROCORE™`.
  - Cabina: con carbón → `MICROKAPPA™ Carbon`; particulado → `MICROKAPPA™ Particulate`.
  - Señales proveedor (HD) aceptadas:
    - Donaldson: `Ultra-Web®` (Donaldson Blue Air), `Radialseal` con nanofibra, familias primarias de aire HD.
    - Fleetguard: palabras clave `nano`, `nanofiber`, `surface-loading`, `NanoNet®` en descripciones públicas.
    - Mapeo: todas estas señales consolidan en `MACROCORE™ NanoMax` (aire HD). Si solo se detecta celulosa convencional o medios estándar, usar `MACROCORE™`.
- Aceite (OIL)
  - HD → `ELIMTEK™ MultiCore`.
  - LD → `ELIMTEK™ Blend`.
  - FRAM básico (detecciones) → `ELIMTEK™ Standard`.
- Combustible (FUEL)
  - Con separación de agua (“water/separator”) → `AquaCore Pro`.
  - Sin separación: HD → `ELIMTEK™ MultiCore`; LD → `ELIMTEK™ Blend`.
- Hidráulico → `HydroFlow 5000`.
- Refrigerante → `ThermoRelease™`.
- Air Dryer → `AeroDry Max`.
- Marinos: HD → `ELIMTEK™ MultiCore`; LD → `ELIMTEK™ Blend`.
- Fallback seguro: líquidos sin señal fuerte → `ELIMTEK™ MultiCore`; aire sin señal → `MACROCORE™`.

Referencias y registro de tecnologías:
- Selección y registro: `src/utils/elimfiltersTechnologies.js` (`getTechnology`, `TECHNOLOGY_REGISTRY`).
- Heurísticas por proveedor:
  - FRAM detección: `src/services/framEnrichmentService.js`.
  - Fleetguard enriquecimiento: `src/services/fleetguardEnrichmentService.js`.
- Documentación detallada de medios: `docs/ELIMFILTERS-MEDIA-TECHNOLOGIES.md`.
 
### Tecnologías de Filtración Propias de ELIMFILTERS (Con Referencias)

Nuestra tecnología de filtración está diseñada para superar los estándares de OEM en rendimiento y durabilidad.

#### I. Tecnologías de Filtración Líquida (Aceite, Combustible e Hidráulico)

| Nombre de la Tecnología | Base Funcional (Descripción para tu Web) | Referencia Cruzada (Fleetguard) |
| --- | --- | --- |
| ELIMTEK™ MultiCore | Medio de profundidad de densidad graduada. Estructura de filtración de múltiples capas que aumenta exponencialmente la capacidad de retención de suciedad (capacidad de vida) y mantiene una alta eficiencia Beta (β) constante. | StrataPore® (Medios multi‑capa) |
| ELIMTEK™ Blend | Medio de fibras mixtas (Celulosa y Sintético). Combina la economía de la celulosa con la eficiencia y durabilidad mejorada de las fibras sintéticas. | Synthetic Blend / StrataPore® (Versión intermedio) |
| HydroFlow 5000 | Medio de microfibra de vidrio de ultra‑eficiencia. Diseñado para alcanzar y mantener la pureza ISO más estricta en sistemas hidráulicos de alta presión. | MicroGlass / Medios sintéticos de alta resistencia |
| AquaCore Pro | Medio coalescente mejorado. Maximiza la separación de agua y contaminantes del combustible, protegiendo los inyectores de alta presión. | Tecnologías de separación de agua de alta eficiencia |

---

#### II. Tecnologías de Filtración de Aire y Sistemas Secos

| Nombre de la Tecnología | Base Funcional (Descripción para tu Web) | Referencia Cruzada (Fleetguard) |
| --- | --- | --- |
| MACROCORE™ NanoMax | Medio de nanofibra sintética avanzada. Atrapa partículas submicrónicas en la superficie del filtro, ofreciendo alta eficiencia con menor restricción de flujo y vida útil prolongada. | NanoNet® |
| MACROCORE™ | Medio de alta capacidad. Medio de aire robusto con gran capacidad de retención de polvo para garantizar el flujo de aire óptimo y una protección de hasta 10,000 km. | Medios de Aire Convencionales / Direct Flow™ |
| MICROKAPPA™ | Medio multicapa con carbón activado. Filtra partículas ultrafinas, polen y bacterias; utiliza carbón activado para neutralizar olores y gases nocivos en cabina. | Filtros de cabina de carbón activado |
| AeroDry Max | Desecante de alto rendimiento con pre‑filtración. Cartuchos diseñados para remover humedad y vapor de agua del sistema de aire de frenos de forma eficiente. | Cartuchos de Air Dryer estándar |

Variantes homologadas (Cabina):
- MICROKAPPA™ Carbon: foco en adsorción de gases/olores con capa de carbón activado.
- MICROKAPPA™ Particulate: foco en captura particulada de alta eficiencia sin capa de carbón.

---

#### III. Tecnologías para Sistemas de Refrigeración

| Nombre de la Tecnología | Base Funcional (Descripción para tu Web) | Referencia Cruzada (Fleetguard) |
| --- | --- | --- |
| ThermoRelease™ | Sistema de liberación de aditivos controlada. Filtros diseñados para dosificar químicos (DCA – Aditivos de Refrigeración) en el sistema para prevenir la corrosión, la cavitación y mantener la química del refrigerante. | FleetCool® / Filtros de Refrigerante con DCA |

Notas:
- Estas referencias son informativas y se mantienen como metadatos técnicos; la comunicación de producto puede optar por omitir marcas de terceros en contextos comerciales.
- La selección automática de tecnología aplicada está implementada en `src/utils/elimfiltersTechnologies.js` y consumida por `src/services/syncSheetsService.js`.

### Sección insertada

- Ubicación: debajo de “Documentación detallada de medios: `docs/ELIMFILTERS-MEDIA-TECHNOLOGIES.md`.”
- Contenido añadido:

I. Tecnologías de Filtración Líquida (Aceite, Combustible e Hidráulico)

- ELIMTEK™ MultiCore — Medio de profundidad de densidad graduada. Estructura de filtración de múltiples capas que aumenta exponencialmente la capacidad de retención de suciedad (capacidad de vida) y mantiene una alta eficiencia Beta (β) constante. Referencia: StrataPore® (Medios multi‑capa).
- ELIMTEK™ Blend — Medio de fibras mixtas (Celulosa y Sintético). Combina la economía de la celulosa con la eficiencia y durabilidad mejorada de las fibras sintéticas. Referencia: Synthetic Blend / StrataPore® (Versión intermedio).
- HydroFlow 5000 — Medio de microfibra de vidrio de ultra‑eficiencia. Diseñado para alcanzar y mantener la pureza ISO más estricta en sistemas hidráulicos de alta presión. Referencia: MicroGlass / Medios sintéticos de alta resistencia.
- AquaCore Pro — Medio coalescente mejorado. Maximiza la separación de agua y contaminantes del combustible, protegiendo los inyectores de alta presión. Referencia: Tecnologías de separación de agua de alta eficiencia.

II. Tecnologías de Filtración de Aire y Sistemas Secos

- MACROCORE™ NanoMax — Medio de nanofibra sintética avanzada. Atrapa partículas submicrónicas en la superficie del filtro, ofreciendo alta eficiencia con menor restricción de flujo y vida útil prolongada. Referencia: NanoNet®.
- MACROCORE™ — Medio de alta capacidad. Medio de aire robusto con gran capacidad de retención de polvo para garantizar el flujo de aire óptimo y una protección de hasta 10,000 km. Referencia: Medios de Aire Convencionales / Direct Flow™.
- MICROKAPPA™ — Medio multicapa con carbón activado. Filtra partículas ultrafinas, polen y bacterias; utiliza carbón activado para neutralizar olores y gases nocivos en cabina. Referencia: Filtros de cabina de carbón activado.
- AeroDry Max — Desecante de alto rendimiento con pre‑filtración. Cartuchos diseñados para remover humedad y vapor de agua del sistema de aire de frenos de forma eficiente. Referencia: Cartuchos de Air Dryer estándar.
- Variantes homologadas (Cabina): MICROKAPPA™ Carbon (adsorción de gases/olores) y MICROKAPPA™ Particulate (captura particulada de alta eficiencia).

III. Tecnologías para Sistemas de Refrigeración

- ThermoRelease™ — Sistema de liberación de aditivos controlada. Filtros diseñados para dosificar químicos (DCA – Aditivos de Refrigeración) en el sistema para prevenir la corrosión, la cavitación y mantener la química del refrigerante. Referencia: FleetCool® / Filtros de Refrigerante con DCA.

## Metodología de Población (paso a paso)

- Normalizar el código de entrada y resolver `family|duty` por prefijo.
- Ejecutar el scraper correspondiente: HD → Donaldson (A–E) + Fleetguard (F–AR); LD → FRAM (A–AR).
- Extraer `last4` del código homologado (o OEM en fallback) y generar `normsku`.
- Construir la fila aplicando normalizaciones de unidades y defaults documentados.
- Aplicar guardias: política de SKU, exclusividad de proveedor, unicidad de `normsku`, invariante HD de `query`.
- Asegurar encabezados y hacer upsert; respetar campos inmutables (`description`).

## Controles de Calidad y Prohibiciones

- Conversión de unidades consistente (`mm`, `psi`, `GPM`, `CFM`, `g`).
- Rango y tipo: numéricos → `0` cuando faltan; texto canónico → `N/A` cuando falta.
- Deduplicación y saneamiento en listas (`oem_codes`, `cross_reference`).
- Inmutabilidad: `description` no se sobreescribe si ya existe en Master.
- Unicidad y anti‑similares: bloqueo de duplicados y de mapeos alternos en HD por el mismo `query`.
- Prohibido adivinar o crear fuera de norma: cualquier violación bloquea la escritura.

## Consideraciones Operativas

- Si no se encuentra un prefijo para `familia|duty`, el sistema registra y no genera el SKU.
- Si `last4` no son dígitos, el sistema rechaza la creación del SKU y registra el motivo.
- La política se aplica tanto al generar como al hacer upsert en la Hoja Master.

---

Este documento es la referencia única para SKUs de la Hoja Master. Las lógicas jerárquicas y alfanuméricas de Marinos están fuera de alcance aquí y se documentan por separado.
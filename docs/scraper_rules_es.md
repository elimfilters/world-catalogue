# Reglas Profesionales del Scraper — Master Sheet (ES)

Versión: 5.x — ELIMFILTERS API

Estas reglas están listas para producción y alineadas con el flujo determinista (clasificación por prefijo → mapeo de tecnología), la normalización métrica y el branding Elimfilters. El objetivo es llenar cada columna de la Master Sheet con valores canónicos, deduplicados y verificables.

## Identificación y Servicio
- `query_norm`: igual al `sku` canónico; mayúsculas; sin espacios extra.
- `sku`: código canónico ELIMFILTERS; una sola fila por SKU.
- `duty`: `HD`, `MD`, `LD` según segmento; preferir `HD` para servicio pesado.
- `type`/`subtype`: tipología funcional (p. ej. `OIL`, `FUEL`, `AIR`); usar subtipos cuando aplique (p. ej. `SPIN-ON`).
- `media_type`: valor canónico (`Cellulose`, `Synthetic`, `Cellulose/Synthetic Blend`, `Nano/HD`, etc.).
- `description`: frase corta, precisa y sin marketing; ejemplo: `Filtro de aceite spin-on, servicio pesado`.

## Referencias y Aplicaciones
- `oem_codes`: códigos OEM/homologaciones; mayúsculas; formato del fabricante (respetar espacios significativos); deduplicar; separados por comas.
- `cross_reference`: equivalencias aftermarket y aliases; incluir el código consultado si es alias; mayúsculas; deduplicar; separados por comas.
- `equipment_applications`: plataformas/equipos; en español, Title Case; deduplicados; separados por comas; unificar familias.
- `engine_applications`: motores aplicables; formato `Nombre (AAAA–AAAA)` si hay rango; en dash para rangos; deduplicados; separados por comas.
- Política: alias no generan filas nuevas; todo se consolida en la fila del `sku` canónico. Usar `upsertBySku` con `deleteDuplicates: true`.

## Dimensiones (SI/Métricas)
- Normalizar a milímetros (mm) y mantener números limpios (sin texto ni unidades):
  - `height_mm`, `outer_diameter_mm`, `inner_diameter_mm`, `panel_width_mm`, `panel_depth_mm`, `gasket_od_mm`, `gasket_id_mm`.
- `thread_size`: formato canónico (p. ej. `1-12 UNF`, `M20x1.5`).
- Conversión: in → mm con 25.4; redondeo consistente (2–3 decimales). Si múltiple evidencia, elegir la más precisa y verificable.

## Especificaciones de Performance
- Principios: priorizar evidencia superior (barras más altas, beta mayor, etc.).
- `hydrostatic_burst_psi`: solo si fabricante la declara; número entero o decimal; sin texto.
- `iso_test_method`: `ISO 16889`, `ISO 4548-12`, `SAE`, etc.; valor estandarizado; sin comentarios.
- `micron_rating`: número limpio (p. ej. `20`); si hay rango/símbolo, seleccionar el rating operativo más conservador verificable.
- `beta_200`: número limpio; si el fabricante declara beta a distintas micras, seleccionar la combinación con mayor confiabilidad.
- `rated_flow_gpm` (líquidos) y `rated_flow_cfm` (aire): numéricos; elegir el valor más alto confirmado cuando hay equivalencias; no mezclar unidades.
- `water_separation_efficiency_percent`: solo en filtros de combustible con separador; número limpio `0–100`.
- `dirt_capacity_grams`: capacidad de carga; número limpio; sólo si hay evidencia.

## Operación
- `operating_temperature_min_c`/`max_c`: en °C; números limpios; si faltan datos, omitir.
- `operating_pressure_min_psi`/`max_psi`: en PSI; números limpios; coherentes con burst.
- `bypass_valve_psi`: PSI; numérico; sólo si aplica (spin-on aceite con válvula bypass).
- `drain_type`: valores canónicos (`None`, `Threaded`, `Valve`, etc.).

## Materiales y Construcción
- `pleat_count`: número limpio; opcional.
- `seal_material`: `NBR`, `FKM`, `Silicone`, etc.; valor canónico.
- `housing_material`: `Steel`, `Plastic`, `Aluminum`, etc.; valor canónico.

## Estándares y Vida Útil
- `iso_main_efficiency_percent`: número `0–100`; sólo si está declarado.
- `manufacturing_standards`/`certification_standards`: listas separadas por comas; valores canónicos.
- `service_life_hours`/`change_interval_km`: numéricos; usar si hay evidencia; preferir el más conservador cuando hay conflicto.

## Reglas Operativas del Scraper
- Extracción: convertir a mayúsculas; `trim`; deduplicar; limpiar texto; traducir nombres de equipos/motores si corresponde.
- Consolidación: una fila por `sku`; alias en `cross_reference`; `query_norm = sku`.
- Validación: tras escribir referencias, verificar que la búsqueda inversa devuelve la fila canónica para cada código (`OEM` y alias).
- Campos vacíos: si la fuente es ambigua o no confiable, dejar vacío; nunca poner `N/A`.
 - Columnas `A–E` (Identificación):
   - En `HD`: deben provenir del scraper de Donaldson (código homologado oficial). Queda prohibido usar `OEM` si existe homologación Donaldson.
   - En `LD`: deben reflejar la homologación FRAM en `A–E`. Si FRAM no fabrica el código, aplicar fallback OEM conforme a la política oficial.
 - Columnas `F–AR` (Técnicas): se nutren exclusivamente del scraper técnico (Fleetguard y fuentes técnicas verificadas). Este scraper no participa en la creación del SKU, sólo en el enriquecimiento técnico.

## Ejemplo Aplicado (EL82100 / OIL / HD)
- `oem_codes`: `P552100`
- `cross_reference`: `LF3620, PH7405, PH7405A` (si FRAM confirmado)
- `equipment_applications`: `Volvo Truck VN/VNL, Mack Truck Vision/CH`
- `engine_applications`: `Detroit Diesel Series 60 (2000–2010), Cummins ISX/QSX15 (2004–2015)`

## Flujo de Despliegue
- Railway auto‑deploy al hacer `git push` (ver `DEPLOYMENT.md`).
- Verificar con `GET /health` y probar `GET /api/detect/{code}`.

## Rutas por Familia/Prefijo (canónicas)
- `EA1` (AIRE HD/LD) → HD vía `Donaldson`; LD vía `FRAM`.
- `EC1` (CABIN HD/LD) → HD vía `Donaldson`; LD vía `FRAM`.
- `EA2` (CARCAZA AIR FILTER) → HD vía `Donaldson` (solo HD).
- `EL8` (OIL HD/LD) → HD vía `Donaldson`; LD vía `FRAM`.
- `EF9` (FUEL HD/LD) → HD vía `Donaldson`; LD vía `FRAM`.
- `ES9` (FUEL SEPARATOR HD) → HD vía `Donaldson`.
- `ED4` (AIR DRYER HD) → HD vía `Donaldson`.
- `EH6` (HYDRAULIC HD) → HD vía `Donaldson`.
- `EW7` (COOLANT HD) → HD vía `Donaldson`.
- `ET9` (TURBINE SERIES HD, incl. `ET9-F` elementos) → validadores `Parker/Racor`.
- `EM9` (MARINE HD/LD, incl. `EM9-S` separadores y `EM9-F/O/A` subtipos) → validadores `Parker/Racor`, `MerCruiser` y `Sierra`.

 Notas
 - Los validadores marinos están integrados en `scraperBridge` y proporcionan `last4` y `last4_alnum`.
 - `EM9/ET9` pueden usar los 4 últimos alfanuméricos para SKU cuando aplica.
 - El `scraper de Fleetguard` sólo alimenta columnas técnicas (`F–AR`); no crea ni modifica el SKU.

## Flujo LD (FRAM) y Responsabilidades del Enriquecimiento

- Paso 1: Cruce inicial (LD)
  - El flujo traduce el código del cliente a un código FRAM verificado.
  - Con ese resultado se genera el SKU interno según reglas del servidor (p. ej. `EL8XXXX`).
  - Impacto en SKU: el SKU queda creado en este paso.

- Paso 2: Enriquecimiento (framEnrichmentService.js)
  - Recibe el `SKU_INTERNO` ya creado y el `código FRAM` como llave de entrada.
  - Usa el sitio web de FRAM para extraer especificaciones técnicas (dimensiones, performance, referencias).
  - No modifica el formato ni el valor del `SKU_INTERNO` en ningún caso.
  - Responsabilidad: devolver un diccionario limpio de datos técnicos para completar la ficha.

- Reglas de almacenamiento (LD / FRAM)
  - `oem_codes`: contener únicamente códigos; se amplía con los detectados en referencias FRAM.
  - `cross_reference`: texto legal “Multi-Referencia OEM” si hay equivalencias; “N/A” si no existen.
  - Clave del documento final: `SKU_INTERNO` generado en Paso 1.

Énfasis al equipo: El `código FRAM` es la llave de entrada para el enriquecimiento, pero la lógica de creación del SKU está protegida y permanece fuera de `framEnrichmentService.js`. Su única función es completar datos técnicos.
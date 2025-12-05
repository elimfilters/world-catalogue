# Manual de Operaciones y Creación de SKU (MOPS FINAL)

Este documento consolida el flujo operacional inalterable para validación y creación de SKUs, incluyendo reglas de Cross-Reference (CR), Fallback OEM, QA y persistencia en la Hoja Mster.

## I. Flujo Operacional y Cross-Reference (Pasos 1–6)

- Paso 1 & 2: Código Válido e Identificación de HD/LD
  - El servidor recibe el código de entrada y determina el nivel de servicio: HD o LD.
  - La determinación del servicio define el primer scraper a usar.

- Paso 3 (A y B): Homologación Primaria
  - Si es HD: intentar cruzar con Donaldson.
  - Si es LD: intentar cruzar con FRAM.
  - El scraper actúa como autoridad de validación. Si el código es encontrado, se homologa.

- Paso 4: Asignación por Fuente Principal
  - Si la homologación primaria es EXITOSA: asignar el prefijo establecido + los 4 últimos dígitos numéricos del código homologado por Donaldson o FRAM.
  - Ejemplo HD: AF25139M → EA17682 (EA1 [Prefijo AIR] + 7682 [Últimos 4 de P527682 de Donaldson]).
  - Ejemplo LD: 90915-YZZN1 → EL84967 (EL8 [Prefijo OIL] + 4967 [Últimos 4 de PH4967 de FRAM]).

- Paso 5: Fallback OEM
  - Si la homologación primaria NO es EXITOSA, proceder a la reserva (Fallback):
    - Identificar el código OEM.
    - Asignar el prefijo + los 4 últimos dígitos numéricos del código OEM homologado.
  - Si falla Donaldson/FRAM, el scraper usa los datos disponibles del OEM homologado.

- Paso 6: Creación del SKU y Persistencia
- El servidor genera el `normsku` con el prefijo correcto y llena la línea en la Hoja Mster.
  - El resultado final es un SKU único (`normsku`) basado en el código validado.
  - Exportar a hojas de cálculo cuando aplique.

## II. Regla de Oro: Exhaustividad y Cero Invención (QA)

- Obligación de Agotar Fuentes
  - El scraper debe ejecutar una secuencia de búsqueda completa (Donaldson/FRAM) antes de pasar al Fallback OEM.

- Prohibición de Extrapolación
  - El servidor solo procesa el código de entrada único. Prohibido incluir ejemplos de otras familias o códigos en el mismo flujo de ingesta/detección.

- Volumen Crítico (VOL_LOW)
  - Si `equipment_applications` o `engine_applications` tienen menos de 6 aplicaciones, se activa `VOL_LOW` y se bloquea la persistencia.

- Auditoría de Datos Mínimos
  - Si el scraper devuelve el código homólogo (p. ej., P527682 o 90915-YZZN1) pero faltan datos técnicos esenciales (p. ej., `height_mm` o `micron_rating`), tratar como Falla Parcial y pasar al Fallback OEM.

- Criterio de "Cero Invención"
  - Nunca asumir valores estándar para temperatura (`operating_temperature_*`). Si un dato técnico no está en fichas oficiales, registrar como NULO.

- Unicidad de `normsku`
  - Bloqueo (400 Bad Request) si la lógica `prefix + last4` no resulta en un código único o si existe duplicidad/similitud en HD para el mismo `query`.

## III. Regla de Construcción del SKU (Precisa)

- Forma canónica: `SKU = prefix + last4`.
- `last4` debe ser exactamente 4 dígitos (`^\d{4}$`).
- El `prefix` se obtiene de reglas canónicas por `familia|duty` (tabla oficial).
- El `last4` proviene del código homologado principal (Donaldson/FRAM); si falla, del OEM homologado.

## IV. Carga por Deber (HD/LD) y Fuentes

- HD: Columnas A–E desde Donaldson; F–AR desde Fleetguard/fuentes técnicas. No mezclar.
- LD: Columnas A–AR desde FRAM.
- Fallback OEM: A–E basados en OEM homologado; F–AR vacíos/default.

## V. Tecnologías Aplicadas (Medios Filtrantes)

 - Aire: HD → `MACROCORE™ NanoMax`; LD → `MACROCORE™`.
   - Señales proveedor (HD): Donaldson `Ultra-Web®`/Blue Air, `Radialseal` con nanofibra; Fleetguard palabras clave `nano`, `nanofiber`, `surface-loading`, `NanoNet®`.
   - Mapeo operativo: señales anteriores consolidan en `MACROCORE™ NanoMax` (HD). Si el proveedor solo declara celulosa convencional, usar `MACROCORE™`.
- Cabina: `MICROKAPPA™ Carbon` (carbón activado) / `MICROKAPPA™ Particulate` (particulado).
- Aceite: HD → `ELIMTEK™ MultiCore`; LD → `ELIMTEK™ Blend`; FRAM básico → `ELIMTEK™ Standard`.
- Combustible: separación de agua → `AquaCore Pro`; sin separación: HD → `ELIMTEK™ MultiCore`, LD → `ELIMTEK™ Blend`.
- Hidráulico → `HydroFlow 5000`.
- Refrigerante → `ThermoRelease™`.
- Air Dryer → `AeroDry Max`.
- Marinos: HD → `ELIMTEK™ MultiCore`; LD → `ELIMTEK™ Blend`.
- Fallback seguro: líquidos sin señal → `ELIMTEK™ MultiCore`; aire sin señal → `MACROCORE™`.

## VI. Persistencia y Exportación

- Construir fila Master aplicando conversiones de unidades (`mm`, `psi`, `GPM`, `CFM`, `g`), normalizaciones y defaults seguros (`0`/`N/A`).
- Respetar campos inmutables (`description`).
- Aplicar guardias de política al upsert: SKU válido, exclusividad de proveedor, unicidad, anti‑similares en HD.
- Exportar en hojas de cálculo y PDF para distribución interna.

## VII. Referencias en el Código

- Reglas y tabla de decisión: `src/config/skuRules.json`.
- Generación/validación: `src/sku/generator.js`.
- Prefijo por OEM/marca: `src/config/prefixMap.js`.
- Flujo Master y guardias: `src/services/syncSheetsService.js`.
- Tecnologías: `src/utils/elimfiltersTechnologies.js`; FRAM: `src/services/framEnrichmentService.js`; Fleetguard: `src/services/fleetguardEnrichmentService.js`.
- Documentos vinculados: `docs/SKU_CREATION_POLICY_MASTER_ES.md`, `docs/ELIMFILTERS-MEDIA-TECHNOLOGIES.md`.

---

Este MOPS FINAL es inalterable para validación/creación de SKUs y cierra la lógica de negocio y QA documentada.
# Política Oficial: Creación del SKU ELIMFILTERS

Versión: 1.0.0

Estas son las únicas reglas, de obligatorio cumplimiento, que deben permanecer en el servidor como instrucción inalterable durante actualizaciones o ajustes.

1) Paso 1 — Código de entrada válido
- El código de entrada debe normalizarse (mayúsculas, sin espacios/guiones) y contener información suficiente para identificar familia/duty o para homologar a un código oficial (Donaldson/FRAM) u OEM.

2) Paso 2 — Identificar si el código válido de entrada es HD o LD
- Se determina HD/LD y familia por prefijo y reglas oficiales del servidor.

3) Paso 3a — Si es HD
- Se hace el cross‑reference con páginas oficiales de Donaldson (shop.donaldson.com), catálogos oficiales y distribuidores autorizados.
- Se ejecuta el scraper de Donaldson y se obtiene la información para llenar columnas del Google Sheet Master (ID: 1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U).
- Una vez cruzado el código de entrada con Donaldson, se crea el SKU así: prefijo establecido + 4 últimos del código Donaldson homologado con el código de entrada, usando las reglas del servidor.
- Se llena la línea en el Google Sheet Master con la información completa obtenida del scraper.
- Esta información es la que se mostrará en la salida hacia la página web.
 - Regla explícita de columnas: las columnas `A–E` del Master Sheet deben provenir del scraper de Donaldson (HD). Queda prohibido rellenarlas con datos de OEM o heurísticas cuando exista homologación a Donaldson. Las columnas `F–AR` se rellenan con datos técnicos del scraper especializado (Fleetguard y otras fuentes técnicas), nunca se usan para crear el SKU.

4) Paso 3b — Si es LD
- Se hace el cross‑reference con páginas oficiales de FRAM (fram.com/parts-search), catálogos oficiales y distribuidores autorizados.
- Se ejecuta el scraper de FRAM y se obtiene la información para llenar columnas del Google Sheet Master (ID: 1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U).
- Una vez cruzado el código de entrada con FRAM, se crea el SKU así: prefijo establecido + 4 últimos del código FRAM homologado con el código de entrada, usando las reglas del servidor.
- Se llena la línea en el Google Sheet Master con la información completa obtenida del scraper.
- Esta información es la que se mostrará en la salida hacia la página web.
 - Regla explícita de columnas: en flujo `LD`, las columnas `A–E` del Master Sheet deben reflejar la homologación FRAM (sin usar OEM si existe equivalencia FRAM). Las columnas `F–AR` se completan con datos técnicos del scraper de FRAM u otras fuentes técnicas; el scraper no participa en la creación del SKU.

5) Paso 4b — Si es HD o LD pero Donaldson o FRAM no lo fabrican
- El código de entrada se homologa a su OEM (si el mismo código es un OEM, se usa ese código como OEM).
- Se asigna el prefijo según el tipo de filtro + 4 últimos números del OEM homologado, usando las reglas oficiales de generación de SKU.
- La determinación del tipo (familia) y, cuando aplique, del duty se realiza por reglas centralizadas de prefijo OEM y/o tablas curadas con evidencia documental.
- Se llena la línea en el Google Sheet Master con la información disponible y trazabilidad hacia el OEM.

Prohibiciones
- No se permite inventar pasos adicionales ni violar las reglas aquí descritas.
- No se permiten SKUs sin equivalentes oficiales Donaldson/FRAM u OEM homologado.
 - Queda expresamente prohibido “adivinar” o construir fuera de norma: el SKU se crea únicamente como `prefijo + últimos 4` del código homologado según la tabla oficial de prefijos.
 - No se pueden establecer reglas nuevas fuera de las documentadas y de la tabla de decisión oficial (`skuRules.json`); cualquier flujo alternativo debe ser añadido a este documento antes de su uso.
 - Unicidad estricta: cada `normsku` es único en el Master. El sistema bloquea escrituras que generen conflicto y elimina duplicados heredados.
 - Exclusividad por proveedor: HD usa Donaldson para columnas `A–E` y Fleetguard para `F–AR`; LD usa FRAM para `A–AR`. No se aceptan mezclas ni sustituciones cuando exista homologación válida.

Notas de implementación
- La generación del SKU utiliza la tabla oficial de prefijos.
- Extracción de "últimos 4":
  - Regla general: 4 dígitos numéricos (0–9).
  - Excepción oficial: `EM9` y `ET9` aceptan 4 alfanuméricos (`A–Z`, `0–9`) cuando aplica por código OEM/marino.
- Política de familias/prefijos:
  - `EA2` (Carcaza Air Filter) se mantiene únicamente en flujo `HD`.
- La identificación de HD/LD/familia se rige por las reglas centralizadas del servidor.

## Fallbacks de Temperatura por Familia

La siguiente tabla define los valores de temperatura mínima y máxima de operación que se asignarán a un SKU cuando los datos de Fleetguard (`operating_temperature_min_c` / `operating_temperature_max_c`) estén vacíos o sean cero en el JSON.

Nota: Estos valores se aplican solo si la variable de entorno `FALLBACK_TEMP_ENABLED` está activa (`true`). Si el campo `seal_material` del filtro es Viton, el sistema podría aplicar un límite superior más estricto si fuera necesario, pero por defecto se usan estos límites de sistema.

| Familia de Filtro | Temperatura Mínima por Defecto (`operating_temperature_min_c`) | Temperatura Máxima por Defecto (`operating_temperature_max_c`) | Razón / Estándar de la Industria |
|-------------------|---------------------------------------------------------------:|----------------------------------------------------------------:|-----------------------------------|
| OIL (Lubricación) |                                                           -20 °C |                                                             150 °C | Límites para el aceite de motor y componentes internos. |
| FUEL (Combustible) |                                                           -20 °C |                                                             120 °C | Límites típicos para el combustible y las bombas de alta presión. |
| AIR / CABIN (Aire) |                                                           -40 °C |                                                             120 °C | Límites del clima extremo y la temperatura del compartimento del motor. |
| HYDRAULIC (Hidráulico) |                                                    -20 °C |                                                             110 °C | Límite común de sistemas hidráulicos de trabajo pesado. |
| COOLANT (Refrigerante) |                                                     -40 °C |                                                             125 °C | Mínima por clima frío y máxima por presión del sistema de refrigeración. |
| AIR DRYER (Secador de Aire) |                                              -40 °C |                                                             105 °C | Mínima por clima frío y máxima por el aire comprimido caliente del compresor. |

Estos fallbacks garantizan seguridad operacional y consistencia técnica cuando el proveedor no aporta especificaciones térmicas.
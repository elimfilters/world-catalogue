CREACION DEL SKU elimfilters:
Paso 1  codigo de entrada valido
Paso 2 identificar si el código valido de entrada es HD o LD
Paso 3 a) si es HD: se hace el cross reference con las paginas oficiales de Donaldson ejemplo https://shop.donaldson.com/store/es-us/home,, catálogos de Donaldson y Distribuidores Autorizados.
      a.1. se hace el scrapper (Donaldson) y se obtiene toda la información necesaria para el llenado de las columnas del Google Sheet Master ubicado con este ID 1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U, los valores se encuentran en nuestro servidor railway catalogo-production-7cef.up.railway.app.
      a.2.  una vez cruzado el código de entrada con Donaldson se crea el SKU de la siguiente manera: se asigna el prefijo establecido + 4 ultimos del código Donaldson que se homologo con el código de entrada, todo se hace con las instrucciones precisas que están en el servidor.
      a.3. una vez creado el SKU con la información completa obtenida del scraper, se procede a llenar la línea en el gogle sheet Master.
      a.4. esta información es la que se va a mostrar en la salida hacia la pagina WEB.
Paso 3 b) si es LD: se hace el cross reference con las páginas oficiales de FRAM ejemplo https://www.fram.com/parts-search , catálogos de FRAM y Distribuidores Autorizados.
      b.1. se hace el scrapper (FRAM) y se obtiene toda la información necesaria para el llenado de las columnas del Google Sheet Master ubicado con este ID 1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U, los valores se encuentran en nuestro servidor railway catalogo-production-7cef.up.railway.app.
      b.2.  una vez cruzado el código de entrada con FRAMse crea el SKU de la siguiente manera: se asigna el prefijo establecido + 4 ultimos del código FRAM que se homologo con el código de entrada, todo se hace con las instrucciones precisas que están en el servidor.
      b.3. una vez creado el SKU con la información completa obtenida del scraper, se procede a llenar la línea en el gogle sheet Master.
      b.4. esta información es la que se va a mostrar en la salida hacia la pagina WEB.
      
Paso 4 b) si es HD o LD pero Donaldson o FRAM no lo fabrican: el código de entrada se le ubica su OEM ( si el mismo código de entrada es un OEM  se usa el código de entrada como OEM), se le asigna el prefijo según el tipo de filtro + 4 ultimos números del OEM homologado.
Especificación Técnica FINAL: Carga y Normalización del Catálogo de Filtros (elimfilters)

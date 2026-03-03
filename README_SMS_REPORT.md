# Generador de Reportes SMS - Sistema de Automatización

Aplicación web para automatizar la generación de reportes de envíos de SMS, procesando archivos de reporte Claro (CSV) y bases de SMS selección (XLSX).

## 🎯 Funcionalidades

- **Carga de archivos**: Sube archivos CSV (reporte Claro) y XLSX (base SMS selección)
- **Filtrado automático**: Filtra el reporte Claro basándose en la base de SMS selección
- **Generación de reporte**: Crea un archivo Excel con 3 hojas:
  - **BASE**: Copia del archivo SMS selección
  - **REPORTE**: Detalle de envíos filtrado con información completa
  - **RESUMEN**: Estadísticas y totales del envío
- **Estilo corporativo**: Diseño en rojo y blanco siguiendo la identidad de Claro

## 📋 Requisitos de Archivos

### Archivo 1: Reporte Claro (CSV)
- Formato: CSV delimitado por comas
- Columnas requeridas:
  - Fecha
  - Hora
  - Destino (número con prefijo 506)
  - Mensaje
  - Usuario
  - Total Enviados
  - Estado (ENVIADO/ERROR)

### Archivo 2: SMS Selección (XLSX)
- Formato: Excel (.xlsx o .xls)
- Columnas requeridas:
  - Telefono1 (número SIN prefijo 506)
  - Mensaje

## 🚀 Cómo Usar

1. **Cargar archivos**:
   - Selecciona el archivo CSV del reporte Claro
   - Selecciona el archivo XLSX de SMS selección

2. **Completar información**:
   - **Nombre de la campaña**: Ej: "SELECCIÓN 05/02/2026"
   - **Encargado**: Nombre del responsable del envío
   - **Número de reflejo**: Número de referencia del envío

3. **Generar reporte**:
   - Haz clic en "Generar Reporte"
   - Espera a que se procese la información
   - Descarga el archivo Excel generado

## 📊 Estructura del Reporte Generado

### Hoja BASE
Contiene la copia del archivo SMS selección con:
- Columna 1: teléfono
- Columna 2: SMS (mensaje)

### Hoja REPORTE
Contiene el detalle de envíos filtrado del reporte Claro:
- Fecha
- Hora
- Destino (con 506)
- Mensaje
- Usuario
- Total enviado
- Estado (Entregado/No enviado)
- Reflejo
- Campaña
- IdCampaña (formato: YYYYMM-NombreCampaña)
- Factura

### Hoja RESUMEN
Contiene las estadísticas del envío:
- **Base**: Nombre de la campaña
- **Cantidad de la base**: Número de registros en la base
- **Cantidad de la prosa**: Longitud del mensaje en caracteres
- **Cantidad Enviados**: Suma de Total Enviados
- **Hora**: Hora del primer envío
- **Fecha**: Fecha del envío
- **Reflejo**: Número de reflejo
- **Encargado**: Nombre del responsable
- **Total enviados (no recibidos)**: Mensajes con estado ERROR
- **Total Entregados**: Mensajes con estado ENVIADO
- **Total de mensajes No Enviados**: Duplicados/excluidos (siempre 0)

## 🎨 Diseño

La aplicación utiliza:
- **Colores corporativos**: Rojo (#DC2626) y blanco
- **Tipografía**: Times New Roman para el Excel
- **Interfaz moderna**: Diseño responsivo con shadcn/ui
- **Estilos de hoja de cálculo**:
  - Encabezados en rojo con texto blanco
  - Bordes en todas las celdas
  - Alineación adecuada por tipo de dato
  - Filas de resumen con fondo rojo claro

## 🔧 Aspectos Técnicos

### Matching de Datos
El sistema realiza el matching entre archivos considerando:
1. El número telefónico de la base se le agrega el prefijo "506"
2. Se busca coincidencia exacta en el reporte Claro
3. Se verifica también que el mensaje coincida
4. Si no hay coincidencias exactas, se busca solo por teléfono

### Procesamiento
- Los archivos se procesan en el servidor usando Python
- Se utilizan pandas para manipulación de datos
- Se usa openpyxl para generación de Excel con estilos
- El procesamiento es asíncrono para no bloquear la interfaz

## 📝 Ejemplo de Uso

```
Archivos de entrada:
- reporte claro 05022026.csv (10,424 registros totales)
- sms selección 05-02-2026.xlsx (39 registros de base)

Información ingresada:
- Nombre de la campaña: "SELECCIÓN 05/02/2026"
- Encargado: "Isaac Sánchez Rodríguez"
- Reflejo: "71984362"

Resultado:
- Reporte con 3 hojas
- 39 registros en BASE
- 39 registros en REPORTE
- RESUMEN con estadísticas
- Total Enviados: 156
- Total Entregados: 39
- Total No Enviados: 0
```

## ✅ Validaciones

La aplicación valida:
- Que ambos archivos estén cargados
- Que el nombre de la campaña no esté vacío
- Que el nombre del encargado no esté vacío
- Que el número de reflejo no esté vacío
- Formato correcto de archivos (CSV y XLSX/XLS)

## 🌐 Acceso

La aplicación se ejecuta en:
- Local: http://localhost:3000
- O a través del panel de Preview a la derecha

## 📞 Soporte

Para cualquier duda o problema con el sistema, contacte al equipo de soporte técnico.

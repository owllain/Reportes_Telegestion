# 📊 Generador de Reportes SMS

Aplicación web para automatizar la generación de reportes de envíos de SMS. **No requiere base de datos** y es **100% compatible con Vercel**.

## ✨ Características

- ✅ **Sin base de datos**: Procesamiento 100% stateless en memoria.
- ✅ **Vercel Ready**: Optimizado para despliegue serverless.
- ✅ **Procesamiento de Archivos Pesados**: Capacidad para manejar miles de registros mediante streams y buffers.
- ✅ **Generación Batch**: Procesa múltiples archivos simultáneamente y los entrega en un ZIP.
- ✅ **Interfaz Premium**: Diseño moderno con Shadcn/UI, Tailwind CSS y animaciones fluidas.

## 🚀 Quick Start

```bash
# Instalar dependencias
npm install

# Instalar dependencias de Python
pip3 install pandas openpyxl

# Iniciar desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📦 Tecnologías

- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript 5
- **UI & Estilos**: Tailwind CSS 4, Shadcn/UI, Framer Motion
- **Gestión de Estado**: Zustand (Estado global), React Query (Server State)
- **Manipulación de Archivos**: ExcelJS, JSZip, csv-parse
- **Deployment**: Vercel / Docker

## 🎯 Uso

1. Sube el archivo CSV del reporte Claro
2. Sube el archivo XLSX de SMS selección
3. Ingresa el nombre de la campaña, encargado y reflejo
4. Descarga el reporte generado con 3 hojas:
   - BASE
   - REPORTE
   - RESUMEN

## 📋 Requisitos de Archivos

### CSV (Reporte Claro)
Deben tener columnas en este orden:
1. Fecha
2. Hora
3. Destino (con 506)
4. Mensaje
5. Usuario
6. Total Enviados
7. Estado

### XLSX (SMS Selección)
Deben tener columnas en este orden:
1. Telefono1 (sin 506)
2. Mensaje

## 🌐 Deployment

### Vercel (Recomendado)

Ver [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) para instrucciones detalladas.

```bash
# Deploy en Vercel
vercel --prod
```

### Docker

```bash
# Build imagen
docker build -t sms-report-generator .

# Run container
docker run -p 3000:3000 sms-report-generator
```

## ⚙️ Scripts

```bash
# Desarrollo
npm run dev

# Build
npm run build

# Producción
npm start

# Lint
npm run lint
```

## 🏗️ Arquitectura y Patrones

### Arquitectura Técnica
El proyecto sigue una arquitectura **Serverless-First** utilizando el **App Router de Next.js**. Todo el procesamiento de datos se centraliza en el servidor para garantizar la seguridad de la información y minimizar la carga en el cliente.

- **Frontend (Client Side)**: SPA reactiva que maneja el estado de la subida y pre-visualización mediante **Zustand**.
- **API (Server Side)**: Los **Route Handlers** actúan como microservicios que procesan binarios (XLSX/CSV) en memoria, realizan el cruce de datos y generan nuevos archivos sin persistencia en disco.

### Patrones de Diseño
- **Component-Based Architecture**: Construcción de interfaces mediante componentes atómicos y reutilizables.
- **Stateless Processing**: La API no guarda estado entre peticiones, permitiendo escalabilidad horizontal inmediata.
- **Repository/Service Pattern (Implicit)**: Lógica de procesamiento de reportes desacoplada de la interfaz de usuario.
- **Strategy Pattern**: Adaptadores para procesar diferentes formatos de entrada (CSV o XLSX) de manera intercambiable.

## 📚 Documentación
- [Compatibilidad con otros archivos](./COMPATIBILIDAD_ARCHIVOS.md)
- [Deployment en Vercel](./VERCEL_DEPLOYMENT.md)
- [Instrucciones del generador de reportes](./README_SMS_REPORT.md)

## 🎨 Características del Reporte

- **Hoja BASE**: Copia del archivo SMS selección
- **Hoja REPORTE**: Detalle de envíos filtrado
- **Hoja RESUMEN**: Estadísticas completas
  - Cantidad de la base
  - Cantidad de la prosa (caracteres)
  - Cantidad Enviados
  - Fecha y Hora
  - Reflejo
  - Encargado
  - Totales de entregados y no entregados

## 🔒 Seguridad

- Sin almacenamiento de datos
- Procesamiento en memoria
- Sin persistencia de información sensible
- Archivos temporales eliminados automáticamente

## 📝 Notas Importantes

### Procesamiento Node.js
La aplicación utiliza un motor de procesamiento basado en **Node.js** con la librería `ExcelJS`. No requiere un entorno de Python externo, lo que facilita el despliegue directo en plataformas como Vercel o contenedores estándar de Node.

### Sin Base de Datos

Este proyecto **NO usa base de datos**. Todo el procesamiento se realiza en memoria y es stateless. Esto lo hace ideal para:
- Vercel Edge Functions
- Serverless deployment
- Escalado horizontal
- Sin costos de base de datos

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es propiedad de la empresa. Todos los derechos reservados.

## 📞 Soporte

Para soporte técnico, contacta al equipo de desarrollo.

---

**Versión**: 1.0.0
**Última actualización**: 2026-02-05

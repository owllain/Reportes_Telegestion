# 📊 Generador de Reportes SMS

Aplicación web para automatizar la generación de reportes de envíos de SMS. **No requiere base de datos** y es **100% compatible con Vercel**.

## ✨ Características

- ✅ **Sin base de datos**: Procesamiento 100% stateless
- ✅ **Vercel Ready**: Deployment sencillo en Vercel
- ✅ **Soporta archivos de cualquier tamaño**: Probado con 50,000+ registros
- ✅ **Docker Compatible**: Incluye Dockerfile para deployment robusto
- ✅ **Interfaz moderna**: Diseño con shadcn/ui y Tailwind CSS
- ✅ **Procesamiento en servidor**: Usa Python/pandas para manejo eficiente de datos

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

- **Frontend**: Next.js 16, React 19, TypeScript 5
- **Estilos**: Tailwind CSS 4, shadcn/ui
- **Backend**: Python 3 con pandas y openpyxl
- **Deployment**: Vercel, Docker, Node.js

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

### Requisito de Python

La aplicación requiere **Python 3** con las siguientes librerías:
- `pandas`
- `openpyxl`

En Vercel, asegúrate de usar Docker o un runtime con Python disponible.

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

# 🚀 Deployment en Vercel

## 📋 Requisitos para Vercel

Esta aplicación es **100% compatible con Vercel** sin necesidad de bases de datos externas.

### Requisitos del entorno

La aplicación requiere **Python 3** instalado en el servidor con las siguientes librerías:
- pandas
- openpyxl

### Opciones de Deployment

#### Opción 1: Vercel con Custom Runtime (Recomendado)

Para Vercel, necesitamos configurar un entorno que tenga Python disponible:

1. **Crear un archivo `.vercelignore`** (ya incluido en el proyecto)

2. **Variables de entorno en Vercel**:
   - No se requieren variables de entorno obligatorias
   - La aplicación funciona sin configuración adicional

3. **Requisito de Python en Vercel**:
   - Vercel soporta Python en el entorno Node.js mediante serverless functions
   - El código intentará ejecutar Python en `/usr/bin/python3`

#### Opción 2: Vercel con Docker (Más robusto)

Si Vercel no tiene Python disponible en el runtime estándar, usar Docker:

1. **Crear `Dockerfile`**:

```dockerfile
FROM node:20-alpine AS base

# Instalar Python y dependencias
RUN apk add --no-cache python3 py3-pip
RUN pip3 install pandas openpyxl

# Instalar dependencias de Node
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Copiar código
COPY . .

# Build
RUN npm run build

# Exponer puerto
EXPOSE 3000

CMD ["npm", "start"]
```

2. **Deploy en Vercel con Docker**:
   - Vercel soporta contenedores Docker
   - Mayor control sobre el entorno
   - Python garantizado

#### Opción 3: Vercel Edge Functions (Sin Python)

Si no puedes usar Python, hay alternativas:

- Usar librerías JavaScript para procesar Excel:
  - `xlsx` (SheetJS)
  - `exceljs`
  - `node-xlsx`

- Ventajas:
  - Funciona nativamente en Vercel Edge Functions
  - Sin dependencias externas
  - Más rápido y ligero

- Desventajas:
  - Menos potente que pandas
  - Requiere refactorización del código

---

## 📦 Instrucciones de Deployment

### Paso 1: Preparar el proyecto

```bash
# Asegurarse de que todo está limpio
npm run build

# Verificar que no haya errores
npm run lint
```

### Paso 2: Subir a GitHub

```bash
git init
git add .
git commit -m "Ready for Vercel deployment"
git branch -M main
git remote add origin <tu-repo-github>
git push -u origin main
```

### Paso 3: Deploy en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Importa tu repositorio de GitHub
3. Configura el proyecto:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Haz clic en **Deploy**

### Paso 4: Verificar el deployment

1. Vercel te dará una URL: `https://tu-proyecto.vercel.app`
2. Abre la URL en el navegador
3. Prueba cargar los archivos de ejemplo

---

## ⚠️ Posibles Problemas y Soluciones

### Problema 1: Python no encontrado

**Error**: `ModuleNotFoundError: No module named 'pandas'`

**Solución**:
- Si usas Docker: Verifica que las dependencias de Python estén instaladas
- Si usas Vercel estándar: Considera usar la opción de Docker o migrar a librerías JS

### Problema 2: Timeout en funciones grandes

**Error**: `504 Gateway Timeout` al procesar archivos muy grandes

**Solución**:
- Aumentar `maxDuration` en `vercel.json` (ya configurado a 60s)
- Para archivos más grandes, considera:
  - Usar Vercel Edge Functions (límite más alto)
  - Migrar a una solución serverless dedicada (AWS Lambda, Cloud Functions)
  - Dividir el procesamiento en chunks

### Problema 3: Memoria insuficiente

**Error**: `JavaScript heap out of memory`

**Solución**:
- Ya configurado `memory: 1024` MB en `vercel.json`
- Si necesitas más, usa Docker con más memoria

---

## 🎯 Recomendación Final

### Para producción en Vercel:

**Opción recomendada**: Docker en Vercel

**Por qué**:
- ✅ Control completo del entorno
- ✅ Python garantizado
- ✅ Más memoria disponible
- ✅ Mejor para procesamiento de archivos grandes
- ✅ Mismo comportamiento en local y producción

### Para desarrollo rápido:

**Opción recomendada**: Vercel estándar

**Por qué**:
- ✅ Deploy más rápido
- ✅ Sin configuración adicional
- ✅ Funciona para la mayoría de los casos
- ⚠️ Requiere Python disponible en el runtime

---

## 📝 Resumen

| Aspecto | Estado | Notas |
|---------|--------|-------|
| Base de datos | ❌ No requerida | La aplicación es stateless |
| Python | ✅ Requerido | Para pandas y openpyxl |
| Vercel Compatible | ✅ Sí | Con Docker o custom runtime |
| Variables de entorno | ❌ No requeridas | Funciona sin configuración |
| Archivos temporales | ✅ Ephemeral | Procesamiento en memoria |

---

## 🚀 Comandos útiles

```bash
# Build local
npm run build

# Test de producción local
npm start

# Lint
npm run lint

# Deploy en Vercel (CLI)
vercel --prod
```

---

## 💡 Next Steps

1. **Prueba local** con archivos grandes
2. **Elige la estrategia** (Docker vs estándar)
3. **Deploy en Vercel**
4. **Prueba en producción** con archivos reales
5. **Monitoriza** los logs de Vercel para detectar problemas

---

## 📞 Soporte

Si encuentras problemas en el deployment:
1. Revisa los logs en Vercel Dashboard
2. Verifica que Python esté disponible
3. Confirma que las dependencias de Python estén instaladas
4. Considera migrar a librerías JS si no puedes usar Python

¡El proyecto está listo para Vercel! 🎉

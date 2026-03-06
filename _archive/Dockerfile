# Multi-stage build para optimizar tamaño
FROM node:20-alpine AS base

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    python3 \
    py3-pip \
    && pip3 install --no-cache-dir \
    pandas \
    openpyxl

# Verificar instalación de Python
RUN python3 --version && \
    pip3 list | grep -E "pandas|openpyxl"

# Directorio de trabajo
WORKDIR /app

# Copiar package files
COPY package*.json ./

# Instalar dependencias de Node
RUN npm ci --only=production

# Copiar resto del código
COPY . .

# Build de Next.js
RUN npm run build

# Exponer puerto
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Comando de inicio
CMD ["npm", "start"]

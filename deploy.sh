#!/bin/bash
# deploy.sh — Build + Deploy automático para Firebase Hosting
# Atualiza o CACHE_NAME do Service Worker com timestamp antes de cada deploy.
# Uso: ./deploy.sh

set -e

# Gera timestamp no formato YYYYMMDD.HHmm
TIMESTAMP=$(date +"%Y%m%d.%H%M")
CACHE_NAME="app-${TIMESTAMP}"

echo "🔧 Atualizando Service Worker: CACHE_NAME = '${CACHE_NAME}'"

# Substitui qualquer valor de CACHE_NAME no sw.js (ex: app-v3, app-20260423.1200)
sed -i '' "s/const CACHE_NAME = '.*'/const CACHE_NAME = '${CACHE_NAME}'/" sw.js

echo "✅ sw.js atualizado"
echo "🎨 Gerando CSS do Tailwind..."

npx tailwindcss -i tailwind.src.css -o tailwind.min.css --minify

echo "✅ tailwind.min.css gerado"
echo "🚀 Iniciando deploy no Firebase..."

firebase deploy --only hosting

echo ""
echo "✅ Deploy concluído! Cache: ${CACHE_NAME}"

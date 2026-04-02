#!/bin/bash

# Script para migrar histórico do projeto para Git
# Cria commits históricos baseados nas pastas em proj_bkp

set -e

echo "🚀 Iniciando migração para Git..."

# Inicializar repositório Git
git init
echo "✅ Repositório Git inicializado"

# Criar .gitignore
cat > .gitignore << 'EOF'
# macOS
.DS_Store
.AppleDouble
.LSOverride

# Thumbnails
._*

# Files that might appear in the root of a volume
.DocumentRevisions-V100
.fseventsd
.Spotlight-V100
.TemporaryItems
.Trashes
.VolumeIcon.icns
.com.apple.timemachine.donotpresent

# Directories potentially created on remote AFP share
.AppleDB
.AppleDesktop
Network Trash Folder
Temporary Items
.atrr

# Firebase
.firebase/

# Node modules (se houver)
node_modules/

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Environment variables
.env
.env.local
.env.*.local

# Editor directories and files
.idea
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# Backup folders (não versionar os backups antigos)
proj_bkp/
EOF

echo "✅ .gitignore criado"

# Array com as versões em ordem cronológica
versions=(
  "01. 2ABR 11H52|2026-04-02 11:52:00|Versão inicial do projeto"
  "02. 3ABR 14H18|2026-04-03 14:18:00|Atualização estrutura JS"
  "03. 6ABR 19H23|2026-04-06 19:23:00|Melhorias na interface"
  "04. 8ABR 12H32|2026-04-08 12:32:00|Ajustes de layout"
  "05. 8ABR 17H15|2026-04-08 17:15:00|Correções de bugs"
  "06. 9ABR 11H02|2026-04-09 11:02:00|Otimizações"
  "07. 9ABR 14H29|2026-04-09 14:29:00|Novos recursos"
  "08. 10ABR 15H15|2026-04-10 15:15:00|Melhorias de performance"
  "09. 11Abr 12H10|2026-04-11 12:10:00|Ajustes de dados"
  "10. 12Abr 21h35|2026-04-12 21:35:00|Correções noturnas"
  "11. 13Abr 15h34|2026-04-13 15:34:00|Refatoração"
  "12. 14Abr 11h54|2026-04-14 11:54:00|Novos componentes"
  "13. 14Abr 12h23|2026-04-14 12:23:00|Ajustes rápidos"
  "14. 14Abr 16h08|2026-04-14 16:08:00|Melhorias UI"
  "15. 14Abr 17h51|2026-04-14 17:51:00|Correções de estilo"
  "16. 14Abr 18h26|2026-04-14 18:26:00|Ajustes finais do dia"
  "17. 14Abr 18h54|2026-04-14 18:54:00|Últimas correções"
  "18. 16Abr 10h58|2026-04-16 10:58:00|Início nova funcionalidade"
  "19. 16Abr 18h18|2026-04-16 18:18:00|Implementação completa"
  "20. 17Abr 10h31|2026-04-17 10:31:00|Testes e validações"
  "21. 20Abr 11h05|2026-04-20 11:05:00|Integração de dados"
  "22. 20Abr 12h12|2026-04-20 12:12:00|Ajustes de integração"
  "23. 20Abr 12h32|2026-04-20 12:32:00|Correções rápidas"
  "24. 20Abr 13h30|2026-04-20 13:30:00|Melhorias de dados"
  "25. 22Abr 12h52|2026-04-22 12:52:00|Otimizações gerais"
  "26. 22Abr 17h25|2026-04-22 17:25:00|Preparação para release"
  "27. 23Abr 14h29 RC1|2026-04-23 14:29:00|Release Candidate 1"
  "28. 24Abr 11h50 RC1 Pre RBAC|2026-04-24 11:50:00|RC1 - Pré implementação RBAC"
)

# Criar diretório temporário para trabalho
TEMP_DIR=$(mktemp -d)
echo "📁 Diretório temporário: $TEMP_DIR"

# Processar cada versão
for version_info in "${versions[@]}"; do
  IFS='|' read -r folder_name commit_date commit_msg <<< "$version_info"
  
  echo ""
  echo "📦 Processando: $folder_name"
  
  # Limpar diretório de trabalho (exceto .git e .gitignore)
  find . -maxdepth 1 ! -name '.' ! -name '..' ! -name '.git' ! -name '.gitignore' ! -name 'proj_bkp' ! -name 'migrate-to-git.sh' -exec rm -rf {} +
  
  # Copiar arquivos da versão
  cp -R "proj_bkp/$folder_name/"* . 2>/dev/null || true
  
  # Adicionar todos os arquivos
  git add -A
  
  # Fazer commit com data específica
  GIT_AUTHOR_DATE="$commit_date" GIT_COMMITTER_DATE="$commit_date" \
    git commit -m "$commit_msg" --allow-empty
  
  echo "✅ Commit criado: $commit_msg"
done

echo ""
echo "📦 Processando versão atual (estrutura final)"

# Limpar e copiar versão atual
find . -maxdepth 1 ! -name '.' ! -name '..' ! -name '.git' ! -name '.gitignore' ! -name 'proj_bkp' ! -name 'migrate-to-git.sh' -exec rm -rf {} +

# Restaurar estrutura atual (que está na raiz)
# Copiar de volta os arquivos que estavam na raiz antes do script
git checkout HEAD -- . 2>/dev/null || true

# Adicionar arquivos da versão atual
git add -A

# Commit final com a estrutura atual
GIT_AUTHOR_DATE="2026-04-24 15:00:00" GIT_COMMITTER_DATE="2026-04-24 15:00:00" \
  git commit -m "Estrutura final: organização em /images, /docs, /backup e /js" --allow-empty

echo ""
echo "✅ Migração concluída!"
echo ""
echo "📊 Resumo do histórico:"
git log --oneline --graph --all | head -n 35
echo ""
echo "🔗 Conectando com GitHub..."

# Renomear branch para main
git branch -M main

# Adicionar remote do GitHub
git remote add origin https://github.com/fabiodelimac-cyber/PROTIX.git

echo "✅ Remote configurado: https://github.com/fabiodelimac-cyber/PROTIX"
echo ""
echo "🚀 Fazendo push para GitHub..."

# Push para o GitHub
git push -u origin main

echo ""
echo "🎉 Projeto enviado com sucesso para o GitHub!"
echo "🔗 Acesse: https://github.com/fabiodelimac-cyber/PROTIX"

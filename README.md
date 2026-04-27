# PROTIX: Field Engagement Tracker & Analytics

PROTIX is a high-performance Business Intelligence platform built for real-time telemetry and strategic decision-making. Architected from the ground up for absolute control, deep customization, and enterprise-grade scalability. Operating on a lightweight Vanilla JS frontend powered by a robust Supabase/PostgreSQL backend, the system delivers a premium, clinical interface designed to eliminate cognitive overhead. Built for seamless deployment across web (PWA) and desktop environments via an Electron remote shell, PROTIX translates raw field interactions into precise ROI intelligence.

---

## 🔥 Latest Release: v0.92 RC2

**Data**: 27/04/2026  
**Status**: 🧪 Release Candidate

### Novidades da v0.92 RC2
- 🎨 **Redesign completo da tela de login** — layout unificado com formulário email/senha + botões Google/Microsoft em página única
- 🎨 **Novo background animado** — boxes flutuantes em CSS puro com rotação e fade, sem JavaScript (ultra performático)
- 🎨 **Gradiente de profundidade** — fundo com gradiente roxo (#685BC7) na base até preto absoluto no topo
- 🎨 **Design System expandido** — novas classes `.ds-login-title`, `.ds-login-version`, `.ds-login-version-pill` para controle centralizado da tipografia do login
- ♿ **Acessibilidade** — respeita `prefers-reduced-motion` para desabilitar animações
- ⚡ **Performance** — animações via `will-change: transform` promovidas para GPU, zero overhead de canvas/JS

### Versão Anterior: v0.90.1 (Hotfix)

**Data**: 25/04/2026  
**Status**: ✅ Produção

#### O Que Foi Corrigido
- 🐛 **Notificações OAuth aleatórias** no PWA (problema crítico de UX)
- 🐛 **Mensagem "Lost Connection to Dev Server"** no PWA instalado
- 🔧 Melhorias no Service Worker e gerenciamento de cache
- 🔧 Auto-atualização automática do PWA

### Documentação do Hotfix
- 📄 [Resumo Rápido](docs/HOTFIX_v0.90.1_SUMMARY.md) - 2 min
- 📄 [Resumo Executivo](docs/RESUMO_CORRECAO_OAUTH.md) - 5 min
- 📄 [Documentação Técnica](docs/CORRECAO_PWA_DEV_SERVER.md) - 15 min
- 📄 [Release Notes](docs/RELEASE_NOTES_v0.90.1.md) - 10 min
- 📄 [Changelog](CHANGELOG.md) - Histórico completo

---

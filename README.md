# PROTIX: Field Engagement Tracker & Analytics

PROTIX is a high-performance Business Intelligence platform built for real-time telemetry and strategic decision-making. Architected from the ground up for absolute control, deep customization, and enterprise-grade scalability. Operating on a lightweight Vanilla JS frontend powered by a robust Supabase/PostgreSQL backend, the system delivers a premium, clinical interface designed to eliminate cognitive overhead. Built for seamless deployment across web (PWA) and desktop environments via an Electron remote shell, PROTIX translates raw field interactions into precise ROI intelligence.

---

## 🔥 Latest Release: v0.92 RC2

**Date**: 04/27/2026  
**Status**: 🧪 Release Candidate

### What's New in v0.92 RC2
- 🎨 **Full login screen redesign** — unified layout with email/password form + Google/Microsoft buttons on a single page
- 🎨 **Animated background** — CSS-only floating boxes with rotation and fade, zero JavaScript overhead
- 🎨 **Depth gradient** — purple (#685BC7) at the bottom fading to absolute black at the top
- 🎨 **Expanded Design System** — new classes `.ds-login-title`, `.ds-login-version`, `.ds-login-version-pill` for centralized login typography control
- ♿ **Accessibility** — respects `prefers-reduced-motion` to disable animations
- ⚡ **Performance** — animations promoted to GPU via `will-change: transform`, no canvas/JS overhead

### Previous Release: v0.90.1 (Hotfix)

**Date**: 04/25/2026  
**Status**: ✅ Production

#### What Was Fixed
- 🐛 **Random OAuth notifications** on PWA (critical UX issue)
- 🐛 **"Lost Connection to Dev Server" message** on installed PWA
- 🔧 Service Worker and cache management improvements
- 🔧 Automatic PWA self-update

### Hotfix Documentation
- 📄 [Quick Summary](docs/HOTFIX_v0.90.1_SUMMARY.md) - 2 min
- 📄 [Executive Summary](docs/RESUMO_CORRECAO_OAUTH.md) - 5 min
- 📄 [Technical Documentation](docs/CORRECAO_PWA_DEV_SERVER.md) - 15 min
- 📄 [Release Notes](docs/RELEASE_NOTES_v0.90.1.md) - 10 min
- 📄 [Changelog](CHANGELOG.md) - Full history

---

# PROTIX: Field Engagement Tracker & Analytics

PROTIX is a high-performance Business Intelligence platform built for real-time telemetry and strategic decision-making. Architected from the ground up for absolute control, deep customization, and enterprise-grade scalability. Operating on a lightweight Vanilla JS frontend powered by a robust Supabase/PostgreSQL backend, the system delivers a premium, clinical interface designed to eliminate cognitive overhead. Built for seamless deployment across web (PWA) and desktop environments via an Electron remote shell, PROTIX translates raw field interactions into precise ROI intelligence.

---

## 🔥 Latest Release: v0.93 RC3

**Date**: 04/28/2026  
**Status**: 🧪 Release Candidate

### What's New in v0.93 RC3
- ⚠️ **Testing disclaimer banner** — visible disclaimer at the top of the page indicating this is a test version
- 🔒 **Auto-logoff after 30 min of inactivity** — automatic session termination for security and resource management
- 🔔 **Inactivity warning toast** — animated toast notification appears at 28 min of inactivity to alert the user, automatically dismissed if activity is detected, resetting the counter

---

### Previous Release: v0.92.1 (Hotfix)

**Date**: 04/27/2026  
**Status**: ✅ Production

### What Was Fixed in v0.92.1
- 🐛 **Date filter missing earlier months** — hierarchical date slicer did not display March/2026 even though dashboard charts showed data since 03/31. Root cause: the `interactions` query had a `.limit(10000)` that silently dropped older records once the table exceeded 10k rows. RPCs used by charts had no such limit, causing the inconsistency
- 🐛 **Date filter broken with array-based filters** — when Mall or Store filters were active (stored as arrays), the date slicer discarded all records due to incorrect `String([...])` comparison instead of `.includes()`

### Hotfix Documentation
- 📄 [Release Notes v0.92.1](docs/RELEASE_NOTES_v0.92.1.md) - 5 min
- 📄 [Changelog](CHANGELOG.md) - Full history

---

### Previous Release: v0.92 RC2

**Date**: 04/27/2026  
**Status**: 🧪 Release Candidate

#### What's New in v0.92 RC2
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

### Documentation Archive
- 📄 [Release Notes v0.90.1](docs/RELEASE_NOTES_v0.90.1.md)
- 📄 [Quick Summary v0.90.1](docs/HOTFIX_v0.90.1_SUMMARY.md)
- 📄 [Executive Summary](docs/RESUMO_CORRECAO_OAUTH.md)
- 📄 [Technical Documentation](docs/CORRECAO_PWA_DEV_SERVER.md)
- 📄 [Changelog](CHANGELOG.md) - Full history

---

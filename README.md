# PROTIX: Field Engagement Tracker & Analytics

PROTIX is a high-performance Business Intelligence platform built for real-time telemetry and strategic decision-making. Architected from the ground up for absolute control, deep customization, and enterprise-grade scalability. Operating on a lightweight Vanilla JS frontend powered by a robust Supabase/PostgreSQL backend, the system delivers a premium, clinical interface designed to eliminate cognitive overhead. Built for seamless deployment across web (PWA) and desktop environments via an Electron remote shell, PROTIX translates raw field interactions into precise ROI intelligence.

---

## 🔥 Latest Release: v0.94

**Date**: 04/29/2026  
**Status**: ✅ Production

### What's New in v0.94 — RLS Hardening + Frontend Fixes

#### Database (Supabase)
- 🔒 **Revoked `anon` role access** on all 3 tables: `interactions`, `user_profiles`, `performance_metrics`
- 🔒 **Revoked RPC execution for `anon` and `PUBLIC`**: `get_overview_metrics`, `get_positivacao_metrics`, `get_heatmap_metrics`, `get_performance_metrics`, `get_store_xray`, `handle_new_user` — required full function signatures with parameter types due to PostgreSQL inheritance rules
- 🛡️ **Policy corrections**: removed "Allow read for anon" policy from `interactions`; changed `performance_metrics` policies from `{public}` to `{authenticated}`
- ✅ **RLS confirmed enabled** on all 3 tables
- 📄 **SQL migration scripts**: hardening (`20260429000000`), rollback (`20260429000001`), validation (`20260429000002`)
- 💾 **Pre-hardening backup**: full schema + table data snapshots

#### Frontend
- 🔧 **supabaseClient.js rewritten** — `createFreshClient()` is now async and injects the logged-in user's JWT token into each disposable client. Token is read from `localStorage` (instant) with a fallback to `getSession()` with a 2s timeout, working around a known Chrome bug where `getSession()` hangs after tab hibernation
- 🔧 **dataManager.js refactored** — replaced duplicated code across 5 RPCs with a centralized `_callRPC()` method; added `_buildFilterParams()` to eliminate parameter repetition; `visibilitychange` now calls `onReactivation` (callback from app.js) to re-render the active view on tab wake
- 🔧 **app.js adjusted** — added `reactivateView()` that destroys charts, re-injects the active view's HTML, and re-renders (fixes corrupted DOM after hibernation); registered `appData.onReactivation` in `initData()` pointing to `reactivateView()`; uses `setTimeout(0)` to ensure unsubscribes process before the new render
- 🔧 **sw.js cache strategy corrected** — added `supabaseClient.js` to `SHELL_ASSETS`; switched JS and HTML files from Cache-first to Network-first (ensures the client always receives the latest version without needing Ctrl+Shift+R); images and static assets remain Cache-first

#### Result
Data is now accessible only to authenticated and approved users. Any unauthenticated access attempt returns 403. Frontend handles tab hibernation gracefully, with responsive filters and deployments that require no hard reload.

---

### Previous Release: v0.93.1 RC3

**Date**: 04/29/2026  
**Status**: 🧪 Release Candidate

#### What's New in v0.93.1 RC3
- 🧹 **Clean console output** — all debug `console.log` statements removed; developer console is now noise-free in production
- 🛠️ **Tailwind CSS production build** — replaced CDN script tag with a local production-optimized build, eliminating the browser warning about CDN usage in production
- 🛠️ **Multiple GoTrueClient instances warning resolved** — disposable Supabase clients now use a unique `storageKey` per instance, suppressing the concurrent-instance warning while preserving the fresh-client-per-query strategy

---

### Previous Release: v0.93 RC3

**Date**: 04/28/2026  
**Status**: 🧪 Release Candidate

#### What's New in v0.93 RC3
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

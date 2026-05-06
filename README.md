# PROTIX: Field Engagement Tracker & Analytics

PROTIX is a high-performance Business Intelligence platform built for real-time telemetry and strategic decision-making. Architected from the ground up for absolute control, deep customization, and enterprise-grade scalability. Operating on a lightweight Vanilla JS frontend powered by a robust Supabase/PostgreSQL backend, the system delivers a premium, clinical interface designed to eliminate cognitive overhead. Built for seamless deployment across web (PWA) and desktop environments via an Electron remote shell, PROTIX translates raw field interactions into precise ROI intelligence.

---

## 🚀 Latest Release: v1.0.0 — Production

**Date**: 05/06/2026
**Status**: ✅ Production

### What's New in v1.0.0 — Scalability Infrastructure & Production Hardening

This release focuses on long-term scalability, eliminating the full table scan on login, optimizing heavy RPCs, and replacing the CPU/GPU performance monitor with lightweight business-relevant session tracking.

#### Database — Scalability
- ⚡ **Fixed `pure_date::text` cast in all 5 RPCs** — cast moved from column to parameter, enabling use of `idx_interactions_date` index. Expected 10-30x improvement on date-filtered queries at scale
- ⚡ **`get_performance_metrics` optimized** — replaced CROSS JOIN with window functions for health score. Added LIMIT 50 on health scores and LIMIT 30 on efficiency. Eliminates quadratic scaling with 300+ stores
- 🆕 **New RPC `get_filter_options()`** — returns distinct filter combinations + device count by product line in a single lightweight call
- 🆕 **New table `usage_stats`** — records session duration, most-used tab, and time per tab per session (with RLS)
- 🗑️ **Dropped `performance_metrics` table** — replaced by `usage_stats`

#### Frontend
- ⚡ **Login payload reduced ~99%** — `initData()` now calls `get_filter_options()` instead of `from('interactions').select('*')`. From ~13MB to ~50KB on login
- ⚡ **300ms debounce on filters** — rapid checkbox clicks now trigger a single RPC instead of multiple simultaneous calls
- 🆕 **`usage-stats.js`** — lightweight session tracking. Saves on logout and on `pagehide` via `fetch keepalive`
- 🆕 **Offline indicator** — banner appears when connection is lost, auto-dismisses 3s after reconnection
- 🆕 **Welcome screen** — onboarding manifest for first-time users
- 🗑️ **Removed `performance-monitor.js` and `performance-integration.js`** — CPU/GPU monitoring via `requestAnimationFrame` removed

#### Scalability Projection
With this release, the architecture supports 3-4 years of growth (300 stores, 365 days/year, ~5-8M rows) without intervention. First expected bottleneck: `get_filter_options()` DISTINCT scan at ~100k unique combinations (~1.5-2 years) — resolved by switching to a materialized view, zero frontend changes required.

---

## Previous Release: v0.96 RC6

**Date**: 05/05/2026
**Status**: 🧪 Release Candidate

### What's New in v0.96 RC6 — Typography, UI Polish, User Profile Menu & Login Screen

#### Typography
- 🔤 **Replaced Michroma with Geist** across the entire dashboard for improved readability and a more modern aesthetic

#### UI / Dark Mode Polish
- 🎨 **Background softened** from `#000000` to `#121212` — reduces eye strain, aligns with Material Design dark surface standards
- 🎨 **Secondary label contrast improved** to `#A0A0A0`/`#B0B0B0` — meets WCAG AA minimum 4.5:1 contrast ratio
- 🎨 **Progress bar tracks** updated to `#2A2A2A` for better visual separation from the background
- 📊 **Subtle grid lines added** to line charts (`rgba(255,255,255,0.05)`) — data no longer "floats" without reference
- 📊 **X-axis date labels** resized for better readability

#### User Profile Floating Menu
- 👤 **Clicking the user email pill** opens a glassmorphism floating menu anchored to the top bar
- Displays user data pulled from Supabase: **Display Name**, **Email**, **Auth Provider**, **Account Created At**
- ✨ **Top-left light glow effect** on the card for a premium feel
- Click outside or on the email pill again to dismiss

#### Login Screen
- 🌍 **Final login screen** with an animated welcome message cycling through multiple languages in the background

#### Database
- 📄 **Migration added**: `20260505000000_add_previous_period_kpis.sql`

---

## Previous Release: v0.94

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

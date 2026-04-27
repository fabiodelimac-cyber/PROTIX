# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.92.0-rc2] - 2026-04-27

### 🎨 Added

#### Full Login Screen Redesign
- **Unified layout**: email/password form + Google/Microsoft buttons on a single page (no more multi-step views)
- **Animated background**: CSS-only floating boxes with rotation and fade — zero JavaScript overhead
- **Depth gradient**: purple (#685BC7) at the bottom fading to absolute black at the top
- **Design System expansion**: new classes `.ds-login-title`, `.ds-login-version`, `.ds-login-version-pill` for centralized login typography control

### ♿ Accessibility
- Respects `prefers-reduced-motion` to disable floating box animations

### ⚡ Performance
- Background animations promoted to GPU via `will-change: transform`
- Replaced canvas-based animation with pure CSS (10 animated elements, no JS)

### 🔍 Files Modified
- `index.html` — Login screen HTML/CSS redesign, floating boxes, gradient background, design system classes

---

## [0.90.1] - 2026-04-25

### 🐛 Fixed (Hotfix)

#### Random OAuth Notifications on PWA
- **Issue**: "Waiting for approval" notification appeared randomly when user left the login screen idle and switched apps, even without clicking any login button
- **Cause**: Supabase Auth SDK attempting to renew OAuth tokens in background, leaving orphaned code-verifiers in localStorage
- **Solution**: 
  - Explicit Supabase Auth configuration with PKCE flowType
  - Automatic cleanup of code-verifiers after 10s of inactivity
  - Authentication-in-progress flag to avoid interfering with real logins
  - Page visibility detector (visibilitychange API)

#### "Lost Connection to Dev Server" Message on PWA
- **Issue**: Error message appeared at the top of the page only on the installed PWA (Firebase)
- **Cause**: Service Worker caching development tool scripts (Vite, Webpack)
- **Solution**: Blocking WebSocket connections and dev server paths in the Service Worker

### 🔧 Improvements

#### Service Worker
- Added debug logs for easier troubleshooting
- Updated cache version to `app-20260425.0001`
- Explicit blocking of:
  - WebSockets (ws://, wss://)
  - Vite paths (`/__vite`, `/@vite/client`)
  - Webpack HMR (`/webpack-hmr`)
  - Localhost connections on different ports

#### OAuth Authentication
- Improved visual feedback on Google and Microsoft buttons
- Buttons show "WAITING FOR APPROVAL..." during OAuth
- 2-minute timeout to reset buttons if user doesn't approve
- RedirectTo configured to current origin

#### PWA
- Service Worker auto-update every 30 seconds
- Automatic reload when new version is detected
- Better cache and session management

### 📚 Documentation
- Added `docs/CORRECAO_PWA_DEV_SERVER.md` — Full technical documentation
- Added `docs/RESUMO_CORRECAO_OAUTH.md` — Executive summary
- Added `CHANGELOG.md` — Change history

### 🔍 Files Modified
- `sw.js` — Service Worker with blocks and logs
- `js/services/supabaseClient.js` — Explicit Auth configuration
- `js/app.js` — OAuth cleanup + inactivity detector
- `index.html` — SW auto-update

### 🧪 Tests
- ✅ Idle login screen no longer triggers notifications
- ✅ OAuth login works normally
- ✅ Installed PWA no longer shows "lost connection to dev server"
- ✅ Service Worker updates automatically

---

## [0.90.0] - 2026-04-23

### Base Version
- Analytics Dashboard with multiple views
- Authentication via Supabase (Google, Microsoft, Email/Password)
- User approval system
- Performance Monitor
- PWA with Service Worker
- Light/Dark Mode
- Hierarchical filters (Date, Mall, Store, Product Line, Region, 80/20, Visibility)
- Views: Overview, Activation, Heatmap, Performance
- Interactive charts with Chart.js
- Smart caching system
- GPU Lite Mode for low-end hardware

---

## Entry Format

### Types of Changes
- `Added` for new features
- `Changed` for changes to existing features
- `Deprecated` for features that will be removed
- `Removed` for removed features
- `Fixed` for bug fixes
- `Security` for fixed vulnerabilities

### Versioning
- **MAJOR** (X.0.0): Incompatible API changes
- **MINOR** (0.X.0): Backwards-compatible new features
- **PATCH** (0.0.X): Backwards-compatible bug fixes

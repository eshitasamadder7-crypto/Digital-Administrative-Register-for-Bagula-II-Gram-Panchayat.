# Build Audit (Phase 1 - Step 2)

Date: 2024

## Build Command
`npm run build` (using `vite build`)

## Status
Success (`✓ built in 12.01s`), but with several non-blocking warnings.

## Warnings Logged

### 1. Deprecated Dependencies
- `npm warn deprecated whatwg-encoding@2.0.0: Use @exodus/bytes instead for a more spec-conformant and faster implementation`
- `npm warn deprecated abab@2.0.6: Use your platform's native atob() and btoa() methods instead`
- `npm warn deprecated @types/dompurify@3.2.0: This is a stub types definition. dompurify provides its own type definitions, so you do not need this installed.`
- `npm warn deprecated domexception@4.0.0: Use your platform's native DOMException instead`

### 2. Tools Outdated Data
- `Browserslist: browsers data (caniuse-lite) is 14 months old. Please run: npx update-browserslist-db@latest`

### 3. CSS Parsing Warnings
```
[vite:css] @import must precede all other statements (besides @charset or empty @layer)
3  |  @tailwind utilities;
4  |
5  |  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;600;700&family=Playfair+Display:wght@700&family=Source+Sans+3:wght@400;500;600;700&display=swap');
   |  ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
6  |
7  |  @layer base {
```
*Note: This usually requires moving `@import` to the very top of `index.css` before `@tailwind` directives.*

### 4. Bundle Size Warnings
```
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
- Use build.rollupOptions.output.manualChunks to improve chunking
```
- `dist/assets/index-D-dE2-Es.js` is `1,115.63 kB` (`309.60 kB` gzipped).
- `dist/assets/jspdf.es.min-GzRq5D-x.js` is `416.02 kB` (`136.39 kB` gzipped).

## Recommended Future Actions (Phase 2 or later)
- Update browserslist DB (`npx update-browserslist-db@latest`).
- Fix `index.css` import order.
- Implement Vite manual chunks or React lazy loading for the main `index.js` chunk and `jspdf`/`html2canvas` bundles.
- Investigate and update the specific deprecated libraries (or sub-dependencies bringing them in).

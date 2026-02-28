# Project Memory: iitc-kuku-drawtools

## Build Commands
- `yarn build:dev` — development build
- `yarn build:prod` — production build (requires git tag)
- `yarn start` — file server
- `yarn autobuild` — watch mode

## TypeScript Gotchas

### @types/leaflet version 0.7.40 (very old)
- Use `L.ILayer` not `L.Layer`
- `L.FeatureGroup<L.ILayer>` (generic required)
- `L.Circle`, `L.Polygon`, `L.Polyline`, `L.Marker` do NOT have `.options` in types → cast to `any`
- `L.Map` does NOT have `addHandler` → use `(window.map as any).addHandler(...)`

### Leaflet.draw types (loaded at runtime)
- `L.Control.Draw` namespace merging doesn't work with old Leaflet types
- Use `new (L.Control as any).Draw({...})` for instantiation
- Type the control instance as `any`

### Window augmentation in ambient .d.ts files
- `types/DrawTools.d.ts` is non-module (no import/export)
- Do NOT use `declare global { interface Window { ... } }` in non-module .d.ts files
- Just write `interface Window { ... }` directly at top level

### window.plugin namespace
- `window.plugin` is typed as both `WindowPlugin` and `typeof plugin` (namespace)
- 3rd-party plugin properties (mpe, crossLinks, destroyedLinks) not in either type
- Use `(window.plugin as any).mpe` etc.

### SpectrumOptions
- iitcpluginkit declares minimal `JQueryUI.SpectrumOptions`
- Extended with `showPaletteOnly`, `change`, `color` in `types/DrawTools.d.ts`

### $.each callbacks with noImplicitReturns
- Return `return` (void) not `return true` for early exit in $.each callbacks

## External Dependencies
- `leaflet-draw` and `spectrum-colorpicker` are yarn-managed npm packages
- IITC-specific extensions (snap, geodesic, confirm, fix CSS) are NOT on npm
  - Copied from `ingress-intel-total-conversion/plugins/external/` into local `external/`
  - Resolved via webpack aliases in `webpack.config.cjs` pointing to `external/`
- `spectrum-colorpicker` requires jQuery as a CommonJS module → mapped to global `jQuery` via `externals: { jquery: 'jQuery' }` in `webpack.config.cjs`
- Module declarations for all these are in `types/DrawTools.d.ts` (`declare module 'leaflet-draw'` etc.)
- `Externals.ts` uses top-level `import 'leaflet-draw'` side-effect imports; `loadExternals()` only contains runtime Leaflet.draw patches

## Key File Locations
- Source: `src/` (Main.ts, Helper/*.ts, Externals.ts, DrawOptions.ts, styles.css)
- Types: `types/DrawTools.d.ts` (custom augmentations), `types/Types.ts` (WindowPlugin)
- Config: `plugin.json`, `tsconfig.json`

## Architecture
Refactored from monolithic `draw-tools.js` into these classes:
- `DrawOptions` — color/shape options state
- `Storage` — localStorage persistence
- `DrawControl` — Leaflet.Draw toolbar
- `SnapHelper` — portal snap logic
- `MergeControl` — merge toggle state
- `EmptyDrawnFields` — polygon fill toggle
- `OptionsDialog` — options UI + import/export
- `LocationFilter` — polygon-based portal filter
- `MpeIntegration` — Multi Projects Extension support
- `Externals` — loads leaflet.draw + spectrum at runtime

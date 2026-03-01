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

## Handlebars Templates
- `src/tpl/` contains `.hbs` files imported as raw text strings (webpack `asset/source`)
- `webpack.config.cjs` has `{ test: /\.hbs$/, type: 'asset/source' }` rule
- `types/DrawTools.d.ts` has `declare module '*.hbs'` for TS imports
- Templates compiled at runtime via `window.plugin.HelperHandlebars!.compile(tplString)`
- `window.plugin.HelperHandlebars` is typed via `declare namespace plugin { const HelperHandlebars: ... }` in `DrawTools.d.ts`
  - `window.plugin` is `typeof plugin` (namespace), NOT `WindowPlugin` — augment the namespace directly
  - The `interface WindowPlugin { ... }` augmentations in `DrawTools.d.ts` do NOT affect `window.plugin` typing
  - For 3rd-party plugin access, either augment `namespace plugin` (typed) or use `window.plugin as any` (like `MpeIntegration.ts`)

### Current templates
| File | Used by |
|------|---------|
| `OptionsDialog.hbs` | Dialog shell; four jQuery UI tabs (Items, Settings, Export/Import, Actions) |
| `ItemRow.hbs` | Single item row for the Items tab (rendered in JS loop) |
| `CopyDialog.hbs` | Export/copy dialog |
| `PasteDialog.hbs` | Import/paste dialog |

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

## OptionsDialog — Items tab live-refresh pattern
`#dt-tab-items` is an empty div in the template; all rendering is done by `renderItems()` in JS.

```typescript
// Compiled once in show():
const itemRowTemplate = window.plugin.HelperHandlebars!.compile(itemRowTpl)
let currentLayers: L.ILayer[] = []

// Single delegated handler (bound once):
$container.on('click', '.dt-item-zoom', (event) => {
    const index = parseInt($(event.currentTarget).closest('.dt-item-row').data('index') as string, 10)
    // zoom via window.map.setView (marker) or window.map.fitBounds (others)
})

// renderItems() rebuilds the tab and updates currentLayers:
const renderItems = (): void => { ... }

renderItems()                                    // initial render
this.refreshItemsTab = renderItems               // for optReset
window.map.on('draw:created', renderItems)       // live updates
window.map.on('draw:edited', renderItems)
window.map.on('draw:deleted', renderItems)

dialog({ ..., closeCallback: () => {
    window.map.off(...)
    this.refreshItemsTab = undefined
}})
```

`optReset()` calls `this.refreshItemsTab?.()` to cover the clear-all case.

## Layer type guard ordering
Always check `isPolygon` **before** `isPolyline` — Polygon extends Polyline in Leaflet.

## Zoom-to-layer pattern
```typescript
if (isMarker(layer)) {
    window.map.setView(layer.getLatLng(), Math.max(window.map.getZoom(), 16))
} else {
    window.map.fitBounds((layer as any).getBounds() as L.LatLngBounds)
}
```

## dialog() closeCallback
IITC's `dialog()` wrapper accepts a non-standard `closeCallback` option. Use it to clean up `window.map` event listeners when the dialog closes.

## Draw events (Main.ts)
- `draw:created` → fires `pluginDrawTools { event: 'layerCreated' }`
- `draw:edited` → fires `pluginDrawTools { event: 'layersEdited' }`
- `draw:deleted` → fires `pluginDrawTools { event: 'layersDeleted' }`
- `optReset` → fires `pluginDrawTools { event: 'clear' }`

## Known pre-existing ESLint warnings (non-blocking)
- `@typescript-eslint/no-unsafe-call` on Handlebars template invocations
- `@typescript-eslint/no-unnecessary-type-assertion` on `(layer as any).options?.color as string`

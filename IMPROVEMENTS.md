# Codebase Improvement Suggestions

Identified during analysis on 2026-02-28. Items marked ✅ are implemented.

---

## High Priority

### 1. XSS in `OptionsDialog.optAlert()`

`message` is passed into a template literal and injected via jQuery's `prepend()`. Though
currently only called with internal string literals, it is a fragile pattern.

```typescript
// CURRENT
.prepend(`<p ...>${message}</p>`)

// FIX — keep HTML for styled messages but sanitise external input at call sites
.prepend($('<p class="drawtools-alert" style="...">').html(message))
```

### 2. ✅ Discriminated Union for `DrawItem` — _implemented in a93efa8_

The old `DrawItem` interface had all fields optional, forcing `item.radius!` non-null
assertions and `as string | undefined` casts throughout Storage and OptionsDialog.

```typescript
// NEW — each variant declares only its own required fields
export type DrawItem =
    | { type: 'circle';   latLng: { lat: number; lng: number }; radius: number; color?: string }
    | { type: 'polygon';  latLngs: { lat: number; lng: number }[]; color?: string }
    | { type: 'polyline'; latLngs: { lat: number; lng: number }[]; color?: string }
    | { type: 'marker';   latLng: { lat: number; lng: number }; color?: string }
```

### 3. ✅ Extract Repeated Layer `instanceof` Checking — _implemented in …_

The `instanceof` pattern for Circle / Polygon / Polyline / Marker appears in at least three
places (`Storage.save`, `OptionsDialog.optCopy`, `SnapHelper`). Extracted to four type
guard functions in `src/Helper/LayerTypes.ts` (`isCircle`, `isPolygon`, `isPolyline`,
`isMarker`). Each also handles the geodesic variant. TypeScript narrows the layer type
inside each branch, removing the need for intermediate cast variables like
`const circle = layer as L.Circle`.

### 4. `MergeControl` is Just a Boolean

`src/Helper/MergeControl.ts` (8 lines) is a class wrapping a single `boolean` with a
`toggle()` method. It could be inlined into `OptionsDialog` or `Main` as a plain boolean
field.

### 5. ✅ Split `OptionsDialog` — UI vs. Business Logic — _implemented in …_

At 275 lines, `OptionsDialog` mixed UI rendering with data logic (JSON parsing, intel URL
parsing, layer-merge handling). The `promptImport` and the data-layer of `optImport`
extracted to a new `ImportExport` class. `OptionsDialog` now only orchestrates the UI;
`ImportExport` handles the pure data operations and throws on failure, letting the caller
decide how to surface errors to the user.

---

## Medium Priority

### 6. `getLatLngs()` Breaks for Polygons with Holes

`Storage.save` casts `polygon.getLatLngs()` to a flat `LatLng[]`. For polygons with holes
the return value is `LatLng[][]`. Such shapes would round-trip incorrectly (outer ring saved
only, holes lost).

### 7. Unused `_drawOptions` Parameter in `Storage.save()`

The parameter is prefixed `_` to suppress the lint warning, but it is never read. All
callers pass `drawOptions`; either the parameter should be used (e.g. to pick up
`markerOptions.icon` for marker color) or removed from the public API.

### 8. Add Named Constants for Magic Numbers

```typescript
// DrawOptions.ts
const DRAW_WEIGHT = 4
const DRAW_OPACITY = 0.5
const DRAW_FILL_OPACITY = 0.2
```

### 9. Duplicate `'a'` Access Key in `DrawControl.setAccessKeys()`

```typescript
// src/Helper/DrawControl.ts
const accessKeys = ['l', 'p', 'o', 'm', 'a', 'e', 'd', 's', 'a']
//                                          ^^^                ^^^ duplicate — second cancel
```

---

## Low Priority

### 10. No Test Coverage

No test files or framework are present. The codebase is hard to test due to globals
(`window.map`, `window.portals`, `localStorage`). Improvements would require dependency
injection and abstracting the storage layer.

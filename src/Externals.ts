// External libraries bundled by webpack.
// leaflet-draw and spectrum-colorpicker are managed via yarn (package.json).
// iitc-draw-* modules are resolved to the IITC repo via webpack.config.cjs aliases.

// https://github.com/Leaflet/Leaflet.draw
import 'leaflet-draw'
import 'leaflet-draw/dist/leaflet.draw.css'
import 'iitc-draw-fix.css'
import 'iitc-draw-snap'
import 'iitc-draw-geodesic'
import 'iitc-draw-confirm'

// https://github.com/bgrins/spectrum
import 'spectrum-colorpicker'
import 'spectrum-colorpicker/spectrum.css'

export const loadExternals = (): void => {
    // Support Leaflet >= 1 (https://github.com/Leaflet/Leaflet.draw/pull/911)
    L.Draw.Polyline.prototype.options.shapeOptions.interactive = true
    L.Draw.Polygon.prototype.options.shapeOptions.interactive = true
    L.Draw.Rectangle.prototype.options.shapeOptions.interactive = true
    L.Draw.CircleMarker.prototype.options.interactive = true
    L.Draw.Circle.prototype.options.shapeOptions.interactive = true

    // https://github.com/Leaflet/Leaflet.draw/issues/789
    L.Draw.Polyline.prototype._onTouch_original = L.Draw.Polyline.prototype._onTouch
    L.Draw.Polyline.prototype._onTouch = L.Util.falseFn as Function

    // Workaround for https://github.com/Leaflet/Leaflet.draw/issues/923
    // addHandler and TouchExtend are Leaflet.draw extensions not in @types/leaflet 0.7.x
    ;(window.map as any).addHandler('touchExtend', (L.Map as any).TouchExtend)

    // Disable tap handler (conflicts with leaflet.draw https://github.com/Leaflet/Leaflet/issues/6977)
    const mapAny = window.map as any
    mapAny.tap = mapAny.tap ? mapAny.tap.disable() : false
}

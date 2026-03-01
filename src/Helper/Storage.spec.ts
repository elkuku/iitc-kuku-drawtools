import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { Storage } from './Storage'
import { DrawOptions } from '../DrawOptions'

const KEY = 'plugin-draw-tools-layer'

// ---------------------------------------------------------------------------
// Layer factories — create instances of the mocked Leaflet classes so that
// the instanceof type guards in LayerTypes.ts classify them correctly.
// ---------------------------------------------------------------------------

const makeCircleLayer = (latLng = { lat: 1, lng: 2 }, radius = 100, color?: string): L.ILayer => {
    const layer = new (L as any).GeodesicCircle(latLng, radius) as any
    layer.options = { color }
    return layer as L.ILayer
}

const makePolygonLayer = (latLngs: { lat: number; lng: number }[] = [], color?: string): L.ILayer => {
    const layer = new (L as any).GeodesicPolygon(latLngs) as any
    layer.options = { color }
    return layer as L.ILayer
}

const makePolylineLayer = (latLngs: { lat: number; lng: number }[] = [], color?: string): L.ILayer => {
    const layer = new (L as any).GeodesicPolyline(latLngs) as any
    layer.options = { color }
    return layer as L.ILayer
}

const makeMarkerLayer = (latLng = { lat: 3, lng: 4 }, color?: string): L.ILayer => {
    const layer = new (L as any).Marker(latLng) as any
    layer.options = { icon: color ? { options: { color } } : undefined }
    return layer as L.ILayer
}

// Fake FeatureGroup: iterates given layers for save(), tracks addLayer() for load()
const makeDrawnItems = (initial: L.ILayer[] = []) => {
    const layers: L.ILayer[] = [...initial]
    return {
        eachLayer: (cb: (layer: L.ILayer) => void) => { layers.forEach(cb) },
        addLayer: vi.fn((layer: L.ILayer) => { layers.push(layer) }),
    } as unknown as L.FeatureGroup<L.ILayer>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const parsed = (): unknown[] => JSON.parse(localStorage.getItem(KEY)!) as unknown[]

describe('Storage', () => {
    let storage: Storage
    let drawOptions: DrawOptions

    beforeEach(() => {
        storage = new Storage()
        drawOptions = new DrawOptions()
        drawOptions.init()
        localStorage.clear()
        vi.clearAllMocks()
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    // -----------------------------------------------------------------------
    // isEmpty
    // -----------------------------------------------------------------------

    describe('isEmpty', () => {
        it('returns true when localStorage has no entry for the key', () => {
            expect(storage.isEmpty()).toBe(true)
        })

        it('returns true when localStorage has an empty array', () => {
            localStorage.setItem(KEY, '[]')
            expect(storage.isEmpty()).toBe(true)
        })

        it('returns false when localStorage has at least one item', () => {
            localStorage.setItem(KEY, '[{"type":"polyline","latLngs":[]}]')
            expect(storage.isEmpty()).toBe(false)
        })
    })

    // -----------------------------------------------------------------------
    // getDrawAsLines
    // -----------------------------------------------------------------------

    describe('getDrawAsLines', () => {
        it('converts a polygon to a closed polyline', () => {
            const polygon = {
                type: 'polygon',
                latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }],
            }
            localStorage.setItem(KEY, JSON.stringify([polygon]))

            const result = JSON.parse(storage.getDrawAsLines()) as { type: string; latLngs: unknown[] }[]
            expect(result).toHaveLength(1)
            expect(result[0].type).toBe('polyline')
            // 3 points + closing repeat of first point = 4
            expect(result[0].latLngs).toHaveLength(4)
        })

        it('leaves polylines unchanged', () => {
            const polyline = { type: 'polyline', latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }] }
            localStorage.setItem(KEY, JSON.stringify([polyline]))

            const result = JSON.parse(storage.getDrawAsLines()) as { type: string }[]
            expect(result).toHaveLength(1)
            expect(result[0].type).toBe('polyline')
        })

        it('leaves circles unchanged', () => {
            const circle = { type: 'circle', latLng: { lat: 0, lng: 0 }, radius: 100 }
            localStorage.setItem(KEY, JSON.stringify([circle]))

            const result = JSON.parse(storage.getDrawAsLines()) as { type: string }[]
            expect(result[0].type).toBe('circle')
        })

        it('leaves markers unchanged', () => {
            const marker = { type: 'marker', latLng: { lat: 1, lng: 1 } }
            localStorage.setItem(KEY, JSON.stringify([marker]))

            const result = JSON.parse(storage.getDrawAsLines()) as { type: string }[]
            expect(result[0].type).toBe('marker')
        })

        it('handles a mix of item types correctly', () => {
            const items = [
                { type: 'polygon', latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }] as { lat: number; lng: number }[] },
                { type: 'polyline', latLngs: [{ lat: 2, lng: 2 }, { lat: 3, lng: 3 }] },
                { type: 'circle', latLng: { lat: 0, lng: 0 }, radius: 50 },
                { type: 'marker', latLng: { lat: 5, lng: 5 } },
            ]
            localStorage.setItem(KEY, JSON.stringify(items))

            const result = JSON.parse(storage.getDrawAsLines()) as { type: string }[]
            expect(result).toHaveLength(4)
            expect(result[0].type).toBe('polyline') // polygon converted
            expect(result[1].type).toBe('polyline') // unchanged
            expect(result[2].type).toBe('circle')   // unchanged
            expect(result[3].type).toBe('marker')   // unchanged
        })

        it('preserves the colour of converted polygons', () => {
            const polygon = {
                type: 'polygon',
                color: '#ff0000',
                latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }],
            }
            localStorage.setItem(KEY, JSON.stringify([polygon]))

            const result = JSON.parse(storage.getDrawAsLines()) as { type: string; color?: string }[]
            expect(result[0].color).toBe('#ff0000')
        })
    })

    // -----------------------------------------------------------------------
    // save
    // -----------------------------------------------------------------------

    describe('save', () => {
        it('serialises a circle layer to localStorage', () => {
            storage.save(makeDrawnItems([makeCircleLayer({ lat: 1, lng: 2 }, 150)]))
            const [item] = parsed() as { type: string; radius: number }[]
            expect(item.type).toBe('circle')
            expect(item.radius).toBe(150)
        })

        it('serialises a polygon layer to localStorage', () => {
            const lngs = [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }]
            storage.save(makeDrawnItems([makePolygonLayer(lngs)]))
            const [item] = parsed() as { type: string }[]
            expect(item.type).toBe('polygon')
        })

        it('serialises a polyline layer to localStorage', () => {
            storage.save(makeDrawnItems([makePolylineLayer([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }])]))
            const [item] = parsed() as { type: string }[]
            expect(item.type).toBe('polyline')
        })

        it('serialises a marker layer to localStorage', () => {
            storage.save(makeDrawnItems([makeMarkerLayer({ lat: 3, lng: 4 })]))
            const [item] = parsed() as { type: string }[]
            expect(item.type).toBe('marker')
        })

        it('preserves layer colour (from options.color)', () => {
            storage.save(makeDrawnItems([makeCircleLayer({ lat: 0, lng: 0 }, 100, '#ff0000')]))
            const [item] = parsed() as { color?: string }[]
            expect(item.color).toBe('#ff0000')
        })

        it('preserves marker colour (from options.icon.options.color)', () => {
            storage.save(makeDrawnItems([makeMarkerLayer({ lat: 0, lng: 0 }, '#00ff00')]))
            const [item] = parsed() as { color?: string }[]
            expect(item.color).toBe('#00ff00')
        })

        it('writes all layers as a single JSON array', () => {
            const layers = [makeCircleLayer(), makePolylineLayer(), makeMarkerLayer()]
            storage.save(makeDrawnItems(layers))
            expect(parsed()).toHaveLength(3)
        })

        it('warns on an unknown layer type', () => {
            const warnSpy = vi.spyOn(console, 'warn')
            storage.save(makeDrawnItems([{} as L.ILayer]))
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown layer type'))
        })
    })

    // -----------------------------------------------------------------------
    // load
    // -----------------------------------------------------------------------

    describe('load', () => {
        it('does nothing when localStorage has no entry', () => {
            const drawnItems = makeDrawnItems()
            storage.load(drawnItems, drawOptions)
            expect((drawnItems as any).addLayer).not.toHaveBeenCalled()
        })

        it('adds one layer per stored item', () => {
            localStorage.setItem(KEY, JSON.stringify([
                { type: 'polyline', latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }] },
                { type: 'circle',   latLng: { lat: 0, lng: 0 }, radius: 50 },
                { type: 'polygon',  latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }] },
                { type: 'marker',   latLng: { lat: 5, lng: 5 } },
            ]))
            const drawnItems = makeDrawnItems()
            storage.load(drawnItems, drawOptions)
            expect((drawnItems as any).addLayer).toHaveBeenCalledTimes(4)
        })

        it('does not throw and logs a specific warning when localStorage contains invalid JSON', () => {
            localStorage.setItem(KEY, 'not-valid-json')
            const warnSpy = vi.spyOn(console, 'warn')
            expect(() => { storage.load(makeDrawnItems(), drawOptions) }).not.toThrow()
            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('failed to load data from localStorage'))
        })

        it('calls runHooks with the import event after loading', () => {
            localStorage.setItem(KEY, JSON.stringify([{ type: 'polyline', latLngs: [] }]))
            storage.load(makeDrawnItems(), drawOptions)
            expect((window as any).runHooks).toHaveBeenCalledWith('pluginDrawTools', { event: 'import' })
        })

        it('does not log "failed to load" when a runHooks listener throws', () => {
            // Simulate a 3rd-party hook listener that fails during boot
            // (e.g. tries to call .wrap() on a DOM element not yet present).
            localStorage.setItem(KEY, JSON.stringify([{ type: 'polyline', latLngs: [] }]))
            vi.stubGlobal('runHooks', vi.fn().mockImplementation(() => {
                throw new TypeError("Cannot read properties of undefined (reading 'wrap')")
            }))
            const warnSpy = vi.spyOn(console, 'warn')

            storage.load(makeDrawnItems(), drawOptions)

            const messages = warnSpy.mock.calls.map(c => String(c[0]))
            // The outer catch must NOT fire — layers were loaded successfully
            expect(messages.some(m => m.includes('failed to load data from localStorage'))).toBe(false)
            // The hook error IS caught and re-logged under a different, specific message
            expect(messages.some(m => m.includes('hook listener'))).toBe(true)

            vi.stubGlobal('runHooks', vi.fn())
        })

        it('does not log "failed to load" when addLayer throws (e.g. 3rd-party layeradd listener fails)', () => {
            // Simulate the exact error: a 3rd-party plugin's layeradd handler calls
            // .wrap() on a DOM element not yet in the page during boot.
            localStorage.setItem(KEY, JSON.stringify([
                { type: 'polyline', latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }] },
                { type: 'circle',   latLng: { lat: 0, lng: 0 }, radius: 50 },
            ]))
            const drawnItems = makeDrawnItems()
            ;(drawnItems as any).addLayer.mockImplementationOnce(() => {
                throw new TypeError("Cannot read properties of undefined (reading 'wrap')")
            })
            const warnSpy = vi.spyOn(console, 'warn')

            storage.load(drawnItems, drawOptions)

            const messages = warnSpy.mock.calls.map(c => String(c[0]))
            // The outer "failed to load data from localStorage" must NOT appear
            expect(messages.some(m => m.includes('failed to load data from localStorage'))).toBe(false)
            // The per-layer error IS logged with a specific message
            expect(messages.some(m => m.includes('failed to restore'))).toBe(true)
            // The second layer (circle) is still loaded despite the first failing
            expect((drawnItems as any).addLayer).toHaveBeenCalledTimes(2)
        })

        it('round-trips: save then load restores the same number of layers', () => {
            // Save a set of layers
            const original = [
                makeCircleLayer({ lat: 1, lng: 2 }, 100, '#ff0000'),
                makePolylineLayer([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }]),
                makePolygonLayer([{ lat: 0, lng: 0 }, { lat: 2, lng: 0 }, { lat: 2, lng: 2 }]),
                makeMarkerLayer({ lat: 5, lng: 5 }, '#00ff00'),
            ]
            storage.save(makeDrawnItems(original))

            // Load back into a fresh drawnItems
            const restored = makeDrawnItems()
            storage.load(restored, drawOptions)

            expect((restored as any).addLayer).toHaveBeenCalledTimes(original.length)
        })

        it('passes proper L.LatLng instances (not plain objects) to the layer factories', () => {
            // Plain {lat,lng} objects stored in localStorage must be converted to
            // L.LatLng instances so the geodesic library can call .wrap() on them.
            localStorage.setItem(KEY, JSON.stringify([
                { type: 'polygon',  latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }] },
                { type: 'polyline', latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }] },
                { type: 'circle',   latLng: { lat: 0, lng: 0 }, radius: 50 },
                { type: 'marker',   latLng: { lat: 5, lng: 5 } },
            ]))

            const polygonSpy  = vi.spyOn(L as any, 'geodesicPolygon')
            const polylineSpy = vi.spyOn(L as any, 'geodesicPolyline')
            const circleSpy   = vi.spyOn(L as any, 'geodesicCircle')
            const LatLngCtor  = (L as any).LatLng as new (...args: unknown[]) => unknown

            storage.load(makeDrawnItems(), drawOptions)

            // Polygon: flat LatLng[] (outer ring) — L.geodesicPolygon expects flat, not nested rings
            const polyCoords2 = polygonSpy.mock.calls[0]?.[0] as unknown[]
            expect(polyCoords2?.[0]).toBeInstanceOf(LatLngCtor)

            // Polyline: flat array of L.LatLng instances
            const polyCoords = polylineSpy.mock.calls[0]?.[0] as unknown[]
            expect(polyCoords?.[0]).toBeInstanceOf(LatLngCtor)

            // Circle center: a proper L.LatLng instance
            expect(circleSpy.mock.calls[0]?.[0]).toBeInstanceOf(LatLngCtor)
        })
    })
})

/**
 * Vitest global setup — stubs IITC/Leaflet globals consumed by source modules.
 * Runs before every test file regardless of environment.
 */
import { vi } from 'vitest'

// ---------------------------------------------------------------------------
// Mock Leaflet layer classes.
// MockPolygon extends MockPolyline mirroring Leaflet's real class hierarchy so
// that `instanceof L.Polyline` returns true for polygon layers (see LayerTypes.ts).
// ---------------------------------------------------------------------------

class MockPolyline {
    latLngs: unknown
    options: unknown
    constructor(latLngs?: unknown, options?: unknown) {
        this.latLngs = latLngs
        this.options = options
    }
    getLatLngs() { return this.latLngs }
}

class MockPolygon extends MockPolyline {}

class MockCircle {
    latLng: unknown
    radius: number
    options: unknown
    constructor(latLng?: unknown, radius?: number, options?: unknown) {
        this.latLng = latLng
        this.radius = radius ?? 0
        this.options = options
    }
    getLatLng() { return this.latLng }
    getRadius() { return this.radius }
}

class MockMarker {
    latLng: unknown
    options: unknown
    constructor(latLng?: unknown, options?: unknown) {
        this.latLng = latLng
        this.options = options
    }
    getLatLng() { return this.latLng }
}

// ---------------------------------------------------------------------------
// Factory helpers — return values typed as Leaflet types so spec files can
// pass them to type-guard functions without unsafe casts.
// ---------------------------------------------------------------------------

export const makeCircle = (): L.ILayer => new MockCircle() as unknown as L.ILayer
export const makePolygon = (): L.ILayer => new MockPolygon() as unknown as L.ILayer
export const makePolyline = (): L.ILayer => new MockPolyline() as unknown as L.ILayer
export const makeMarker = (): L.ILayer => new MockMarker() as unknown as L.ILayer

// ---------------------------------------------------------------------------
// Stub globals
// ---------------------------------------------------------------------------

vi.stubGlobal('L', {
    Circle: MockCircle,
    Polyline: MockPolyline,
    Polygon: MockPolygon,
    Marker: MockMarker,
    GeodesicCircle: MockCircle,
    GeodesicPolyline: MockPolyline,
    GeodesicPolygon: MockPolygon,
    extend: (dest: object, ...sources: object[]): object => Object.assign(dest, ...sources),
    DivIcon: {
        ColoredSvg: class MockColoredSvg {
            options: { color: string }
            constructor(color?: string) { this.options = { color: color ?? '' } }
        },
    },
    LatLng: class MockLatLng {
        constructor(public lat: number, public lng: number) {}
    },
    geodesicPolyline: (latLngs: unknown, options?: unknown) => new MockPolyline(latLngs, options),
    geodesicPolygon: (latLngs: unknown, options?: unknown) => new MockPolygon(latLngs, options),
    geodesicCircle: (latLng: unknown, radius: number, options?: unknown) => new MockCircle(latLng, radius, options),
})

vi.stubGlobal('registerMarkerForOMS', vi.fn())
vi.stubGlobal('dialog', vi.fn())
vi.stubGlobal('runHooks', vi.fn())

// ---------------------------------------------------------------------------
// Fake localStorage — jsdom 28 has issues with localStorage in some configs.
// ---------------------------------------------------------------------------

const fakeStorageData: Record<string, string> = {}
vi.stubGlobal('localStorage', {
    getItem: (key: string): string | null => Object.hasOwn(fakeStorageData, key) ? fakeStorageData[key] : null,
    setItem: (key: string, value: string): void => { fakeStorageData[key] = value },
    removeItem: (key: string): void => { delete fakeStorageData[key] },
    clear: (): void => { for (const k of Object.keys(fakeStorageData)) delete fakeStorageData[k] },
    get length(): number { return Object.keys(fakeStorageData).length },
    key: (i: number): string | null => Object.keys(fakeStorageData)[i] ?? null,
})

import { describe, it, expect } from 'vitest'
import { toPolygonRings, isCircle, isPolygon, isPolyline, isMarker } from './LayerTypes'
import { makeCircle, makePolygon, makePolyline, makeMarker } from '../TestSetup'

const pt = (lat: number, lng: number): { lat: number; lng: number } => ({ lat, lng })

// ---------------------------------------------------------------------------
// toPolygonRings
// ---------------------------------------------------------------------------

describe('toPolygonRings', () => {
    it('returns [] for an empty input', () => {
        expect(toPolygonRings([])).toEqual([])
    })

    it('wraps a flat array of points into a single ring', () => {
        const flat = [pt(0, 0), pt(1, 1), pt(2, 0)]
        expect(toPolygonRings(flat)).toEqual([flat])
    })

    it('returns a flat single-point array as a one-point ring', () => {
        const flat = [pt(5, 10)]
        expect(toPolygonRings(flat)).toEqual([[pt(5, 10)]])
    })

    it('returns a nested rings array as the same reference', () => {
        const rings = [[pt(0, 0), pt(1, 1)], [pt(2, 2), pt(3, 3)]]
        expect(toPolygonRings(rings)).toBe(rings)
    })

    it('preserves multiple rings (polygon with holes)', () => {
        const outer = [pt(0, 0), pt(0, 10), pt(10, 10), pt(10, 0)]
        const hole = [pt(1, 1), pt(1, 9), pt(9, 9), pt(9, 1)]
        const rings = [outer, hole]
        expect(toPolygonRings(rings)).toBe(rings)
        expect(toPolygonRings(rings)).toHaveLength(2)
    })
})

// ---------------------------------------------------------------------------
// Type guards
// ---------------------------------------------------------------------------

describe('isCircle', () => {
    it('returns true for a Circle layer', () => {
        expect(isCircle(makeCircle())).toBe(true)
    })

    it('returns false for a Polygon layer', () => {
        expect(isCircle(makePolygon())).toBe(false)
    })

    it('returns false for a Marker layer', () => {
        expect(isCircle(makeMarker())).toBe(false)
    })
})

describe('isPolygon', () => {
    it('returns true for a Polygon layer', () => {
        expect(isPolygon(makePolygon())).toBe(true)
    })

    it('returns false for a plain Polyline layer', () => {
        expect(isPolygon(makePolyline())).toBe(false)
    })

    it('returns false for a Circle layer', () => {
        expect(isPolygon(makeCircle())).toBe(false)
    })
})

describe('isPolyline', () => {
    it('returns true for a Polyline layer', () => {
        expect(isPolyline(makePolyline())).toBe(true)
    })

    it('returns true for a Polygon layer (Polygon extends Polyline in Leaflet)', () => {
        expect(isPolyline(makePolygon())).toBe(true)
    })

    it('returns false for a Circle layer', () => {
        expect(isPolyline(makeCircle())).toBe(false)
    })

    it('returns false for a Marker layer', () => {
        expect(isPolyline(makeMarker())).toBe(false)
    })
})

describe('isMarker', () => {
    it('returns true for a Marker layer', () => {
        expect(isMarker(makeMarker())).toBe(true)
    })

    it('returns false for a Polyline layer', () => {
        expect(isMarker(makePolyline())).toBe(false)
    })

    it('returns false for a Polygon layer', () => {
        expect(isMarker(makePolygon())).toBe(false)
    })
})

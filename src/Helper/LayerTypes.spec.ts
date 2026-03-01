import { describe, it, expect } from 'vitest'
import { isCircle, isPolygon, isPolyline, isMarker } from './LayerTypes'
import { makeCircle, makePolygon, makePolyline, makeMarker } from '../TestSetup'

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

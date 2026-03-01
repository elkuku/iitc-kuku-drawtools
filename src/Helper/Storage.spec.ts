import { describe, it, expect, beforeEach } from 'vitest'
import { Storage } from './Storage'

const KEY = 'plugin-draw-tools-layer'

describe('Storage', () => {
    let storage: Storage

    beforeEach(() => {
        storage = new Storage()
        localStorage.clear()
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
        it('converts a simple polygon to a closed polyline', () => {
            const polygon = {
                type: 'polygon',
                latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }],
            }
            localStorage.setItem(KEY, JSON.stringify([polygon]))

            const result = JSON.parse(storage.getDrawAsLines()) as { type: string; latLngs: unknown[] }[]
            expect(result).toHaveLength(1)
            expect(result[0].type).toBe('polyline')
            // 3 ring points + closing repeat of first point = 4
            expect(result[0].latLngs).toHaveLength(4)
        })

        it('uses only the outer ring for a polygon with holes', () => {
            const outer = [{ lat: 0, lng: 0 }, { lat: 0, lng: 10 }, { lat: 10, lng: 10 }, { lat: 10, lng: 0 }]
            const hole = [{ lat: 1, lng: 1 }, { lat: 1, lng: 9 }, { lat: 9, lng: 9 }, { lat: 9, lng: 1 }]
            localStorage.setItem(KEY, JSON.stringify([{ type: 'polygon', latLngs: [outer, hole] }]))

            const result = JSON.parse(storage.getDrawAsLines()) as { type: string; latLngs: unknown[] }[]
            expect(result).toHaveLength(1)
            expect(result[0].type).toBe('polyline')
            // outer ring has 4 points + closing = 5; hole is dropped
            expect(result[0].latLngs).toHaveLength(5)
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
                { type: 'polygon', latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 0 }, { lat: 1, lng: 1 }] },
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
})

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ImportExport } from './ImportExport'
import { DrawOptions } from '../DrawOptions'
import type { DrawItem } from '../DrawTypes'
import type { Storage } from './Storage'

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

const makeDrawnItems = () => {
    const layers: L.ILayer[] = []
    return {
        addLayer: vi.fn((layer: L.ILayer) => { layers.push(layer) }),
        clearLayers: vi.fn(() => { layers.length = 0 }),
        eachLayer: vi.fn((callback: (layer: L.ILayer) => void) => { layers.forEach(callback) }),
        getLayers: () => layers,
    }
}

const makeStorage = () => ({
    keyStorage: 'plugin-draw-tools-layer',
    save: vi.fn<[L.FeatureGroup<L.ILayer>], void>(),
    import: vi.fn<[DrawItem[], L.FeatureGroup<L.ILayer>, DrawOptions], void>(),
    load: vi.fn<[L.FeatureGroup<L.ILayer>, DrawOptions], void>(),
    isEmpty: vi.fn<[], boolean>().mockReturnValue(false),
    getDrawAsLines: vi.fn<[], string>().mockReturnValue('[]'),
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImportExport', () => {
    let drawnItems: ReturnType<typeof makeDrawnItems>
    let storage: ReturnType<typeof makeStorage>
    let drawOptions: DrawOptions
    let importExport: ImportExport

    beforeEach(() => {
        drawnItems = makeDrawnItems()
        storage = makeStorage()
        drawOptions = new DrawOptions()
        drawOptions.init()
        importExport = new ImportExport(
            drawnItems as unknown as L.FeatureGroup<L.ILayer>,
            drawOptions,
            storage as unknown as Storage,
        )
        localStorage.clear()
    })

    // -----------------------------------------------------------------------
    // promptImport — intel URL path
    // -----------------------------------------------------------------------

    describe('promptImport with a stock intel URL', () => {
        const url = 'https://intel.ingress.com/intel?z=14&pls=1.0,2.0,3.0,4.0_5.0,6.0,7.0,8.0'

        it('creates one layer per pls segment', () => {
            importExport.promptImport(url, true)
            expect(drawnItems.addLayer).toHaveBeenCalledTimes(2)
        })

        it('does not clear existing layers when merge=true', () => {
            importExport.promptImport(url, true)
            expect(drawnItems.clearLayers).not.toHaveBeenCalled()
        })

        it('clears existing layers before import when merge=false', () => {
            importExport.promptImport(url, false)
            expect(drawnItems.clearLayers).toHaveBeenCalledOnce()
            expect(drawnItems.addLayer).toHaveBeenCalledTimes(2)
        })

        it('calls storage.save after import', () => {
            importExport.promptImport(url, true)
            expect(storage.save).toHaveBeenCalledOnce()
        })

        it('throws when a pls coordinate is NaN', () => {
            const bad = 'https://intel.ingress.com/intel?pls=1.0,NaN,3.0,4.0'
            expect(() => { importExport.promptImport(bad, true) }).toThrow()
        })

        it('throws when a pls segment does not have exactly four values', () => {
            const bad = 'https://intel.ingress.com/intel?pls=1.0,2.0,3.0'
            expect(() => { importExport.promptImport(bad, true) }).toThrow()
        })
    })

    // -----------------------------------------------------------------------
    // promptImport — JSON path
    // -----------------------------------------------------------------------

    describe('promptImport with JSON draw-tools data', () => {
        const jsonData = JSON.stringify([{ type: 'polyline', latLngs: [{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }] }])

        it('calls storage.import with the parsed data', () => {
            importExport.promptImport(jsonData, false)
            expect(storage.import).toHaveBeenCalledOnce()
        })

        it('always clears layers before importing (JSON path re-imports from merged data)', () => {
            importExport.promptImport(jsonData, false)
            expect(drawnItems.clearLayers).toHaveBeenCalledOnce()
        })

        it('merges pasted JSON with existing stored data when merge=true', () => {
            const existing = JSON.stringify([{ type: 'circle', latLng: { lat: 0, lng: 0 }, radius: 100 }])
            localStorage.setItem('plugin-draw-tools-layer', existing)
            const newData = JSON.stringify([{ type: 'marker', latLng: { lat: 1, lng: 1 } }])

            importExport.promptImport(newData, true)

            const [mergedData] = storage.import.mock.calls[0]
            expect(mergedData).toHaveLength(2)
        })

        it('calls storage.save after import', () => {
            importExport.promptImport(jsonData, true)
            expect(storage.save).toHaveBeenCalledOnce()
        })

        it('throws on completely invalid input', () => {
            expect(() => { importExport.promptImport('not json and not a url', true) }).toThrow()
        })
    })

    // -----------------------------------------------------------------------
    // importData
    // -----------------------------------------------------------------------

    describe('importData', () => {
        const rawData = [{ type: 'polyline', latLngs: [] }]

        it('delegates to storage.import', () => {
            importExport.importData(rawData, false)
            expect(storage.import).toHaveBeenCalledOnce()
        })

        it('clears layers first when clearFirst=true', () => {
            importExport.importData(rawData, true)
            expect(drawnItems.clearLayers).toHaveBeenCalledOnce()
        })

        it('does not clear layers when clearFirst=false', () => {
            importExport.importData(rawData, false)
            expect(drawnItems.clearLayers).not.toHaveBeenCalled()
        })

        it('saves after import', () => {
            importExport.importData(rawData, false)
            expect(storage.save).toHaveBeenCalledOnce()
        })
    })
})

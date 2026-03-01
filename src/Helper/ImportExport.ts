import { DrawItem } from '../DrawTypes'
import { DrawOptions } from '../DrawOptions'
import { Storage } from './Storage'

export class ImportExport {
    constructor(
        private readonly drawnItems: L.FeatureGroup<L.ILayer>,
        private readonly drawOptions: DrawOptions,
        private readonly storage: Storage,
    ) {}

    /**
     * Parse and import a pasted string — either a stock intel URL or JSON draw-tools data.
     * Pass merge=true to append to existing layers; false clears first.
     * Throws on parse/import failure; the caller is responsible for user-facing error handling.
     */
    readonly promptImport = (promptAction: string, merge: boolean): void => {
        const matchIntel = /^(https:\/\/)?intel\.ingress\.com\/.*[?&]pls=/.exec(promptAction)
        if (matchIntel) {
            const items = promptAction.split(/[?&]/)
            const foundAt = items.findIndex((item) => item.startsWith('pls='))
            if (foundAt === -1) throw new Error('No drawn items found in intel URL')

            const newLines: L.ILayer[] = []
            const linesStr = items[foundAt].slice(4).split('_')
            for (const lineStr of linesStr) {
                const floats = lineStr.split(',').map(Number)
                if (floats.length !== 4) throw new Error('URL item not a set of four floats')
                if (floats.some((num) => isNaN(num))) throw new Error('URL item had invalid number')
                newLines.push(L.geodesicPolyline([[floats[0], floats[1]], [floats[2], floats[3]]] as unknown as L.LatLng[], this.drawOptions.lineOptions))
            }

            if (!merge) {
                this.drawnItems.clearLayers()
            }
            for (const line of newLines) {
                this.drawnItems.addLayer(line)
            }
            window.runHooks('pluginDrawTools', { event: 'import' })
            console.log(`DRAWTOOLS: ${merge ? '' : 'reset and '}pasted drawn items from stock URL`)
        } else {
            let mergedAction = promptAction
            if (merge) {
                const existing = window.localStorage.getItem(this.storage.keyStorage)
                if (existing && existing.length > 4) {
                    mergedAction = existing.slice(0, -1) + ',' + promptAction.slice(1)
                }
            }

            let data: unknown
            try {
                data = JSON.parse(mergedAction)
            } catch {
                let mutated = mergedAction
                if (!mutated.startsWith('[{')) mutated = mutated.slice(mutated.indexOf('[{'))
                if (!mutated.endsWith('}]')) mutated = mutated.slice(0, mutated.lastIndexOf('}]') + 2)
                data = JSON.parse(mutated)
            }

            this.drawnItems.clearLayers()
            this.storage.import(data as DrawItem[], this.drawnItems, this.drawOptions)
            console.log(`DRAWTOOLS: ${merge ? '' : 'reset and '}pasted drawn items`)
        }

        this.storage.save(this.drawnItems)
    }

    /**
     * Import a parsed JSON array into the drawn items layer.
     * Pass clearFirst=true to wipe existing layers before importing.
     * Throws on failure; the caller is responsible for user-facing error handling.
     */
    readonly importData = (rawData: unknown[], clearFirst: boolean): void => {
        if (clearFirst) {
            this.drawnItems.clearLayers()
        }
        this.storage.import(rawData as DrawItem[], this.drawnItems, this.drawOptions)
        this.storage.save(this.drawnItems)
    }
}

import { DrawOptions } from '../DrawOptions'
import { isCircle, isPolygon, isPolyline, isMarker, toPolygonRings } from './LayerTypes'
import { Storage } from './Storage'
import { DrawControl } from './DrawControl'
import { SnapHelper } from './SnapHelper'
import { EmptyDrawnFields } from './EmptyDrawnFields'
import { ImportExport } from './ImportExport'

export class OptionsDialog {
    private mergeMode = true

    constructor(
        private readonly drawnItems: L.FeatureGroup<L.ILayer>,
        private readonly drawOptions: DrawOptions,
        private readonly storage: Storage,
        private readonly drawControl: DrawControl,
        private readonly snapHelper: SnapHelper,
        private readonly edf: EmptyDrawnFields,
        private readonly importExport: ImportExport,
    ) {}

    readonly show = (): void => {
        const $container = $('<div>')

        const $styles = $('<div class="drawtoolsStyles">')
        $('<input>').attr({ type: 'color', name: 'drawColor', id: 'drawtools_color' }).appendTo($styles)
        $container.append($styles)

        const $setbox = $('<div class="drawtoolsSetbox">')
        $('<a>').text('Copy Drawn Items').attr('tabindex', '0').on('click', () => { this.optCopy() }).appendTo($setbox)
        $('<a>').text('Paste Drawn Items').attr('tabindex', '0').on('click', () => { this.optPaste() }).appendTo($setbox)
        $('<a>').text('Import Drawn Items').attr('tabindex', '0').on('click', () => { this.optImport() }).appendTo($setbox)
        $('<a>').text('Export Drawn Items').attr('tabindex', '0').on('click', () => { this.optExport() }).appendTo($setbox)
        $('<a>').text('Reset Drawn Items').attr('tabindex', '0').on('click', () => { this.optReset() }).appendTo($setbox)
        $('<a>').text('Snap to portals').attr('tabindex', '0').on('click', () => {
            this.snapHelper.snapToPortals(this.drawnItems, this.storage, this.drawOptions)
        }).appendTo($setbox)

        const $mergeLabel = $('<label id="MergeToggle">')
        $('<input>').attr({ type: 'checkbox', name: 'merge' })
            .prop('checked', !this.mergeMode)
            .on('change', () => { this.mergeMode = !this.mergeMode })
            .appendTo($mergeLabel)
        $mergeLabel.append('Reset draws before paste or import')
        $('<center>').append($mergeLabel).appendTo($setbox)

        const $edfLabel = $('<label id="edfToggle">')
        $('<input>').attr({ type: 'checkbox', name: 'edf' })
            .prop('checked', !this.edf.status)
            .on('change', () => { this.edf.statusToggle(this.drawnItems, this.storage, this.drawOptions) })
            .appendTo($edfLabel)
        $edfLabel.append('Fill the polygon(s)')
        $('<center>').append($edfLabel).appendTo($setbox)

        $container.append($setbox)

        dialog({
            html: $container,
            id: 'plugin-drawtools-options',
            dialogClass: 'ui-dialog-drawtoolsSet',
            title: 'Draw Tools Options',
        })

        // spectrum is loaded at runtime via loadExternals; cast options to pick up non-standard fields
        $('#drawtools_color').spectrum({
            flat: false,
            showInput: false,
            showButtons: false,
            showPalette: true,
            showPaletteOnly: false,
            showSelectionPalette: false,
            palette: [
                ['#a24ac3', '#514ac3', '#4aa8c3', '#51c34a'],
                ['#c1c34a', '#c38a4a', '#c34a4a', '#c34a6f'],
                ['#000000', '#666666', '#bbbbbb', '#ffffff'],
            ],
            change: (color: { toHexString(): string }) => {
                this.drawControl.setDrawColor(color.toHexString(), this.drawOptions)
            },
            color: this.drawOptions.currentColor,
        } as JQueryUI.SpectrumOptions)
    }

    readonly optAlert = (message: string): void => {
        $('.ui-dialog-drawtoolsSet .ui-dialog-buttonset')
            .prepend($('<p class="drawtools-alert" style="float:left;margin-top:4px;">').html(message))
        $('.drawtools-alert').delay(2500).fadeOut()
    }

    readonly optCopy = (): void => {
        if (this.storage.isEmpty()) return

        if (window.isApp && window.app.shareString) {
            window.app.shareString(window.localStorage[this.storage.keyStorage] as string)
            return
        }

        const stockWarnings: Record<string, boolean> = {}
        const stockLinks: number[][] = []

        this.drawnItems.eachLayer((layer) => {
            if (isCircle(layer)) {
                stockWarnings.noCircle = true
            } else if (isMarker(layer)) {
                stockWarnings.noMarker = true
            } else if (isPolygon(layer)) {
                stockWarnings.polyAsLine = true
                const rawLatLngs = layer.getLatLngs() as { lat: number; lng: number }[] | { lat: number; lng: number }[][]
                const rings = toPolygonRings(rawLatLngs)
                for (const ring of rings) {
                    for (let index = 0; index < ring.length - 1; index++) {
                        stockLinks.push([ring[index].lat, ring[index].lng, ring[index + 1].lat, ring[index + 1].lng])
                    }
                    if (ring.length > 0) {
                        stockLinks.push([ring.at(-1)!.lat, ring.at(-1)!.lng, ring[0].lat, ring[0].lng])
                    }
                }
            } else if (isPolyline(layer)) {
                const latLngs = layer.getLatLngs() as { lat: number; lng: number }[]
                for (let index = 0; index < latLngs.length - 1; index++) {
                    stockLinks.push([latLngs[index].lat, latLngs[index].lng, latLngs[index + 1].lat, latLngs[index + 1].lng])
                }
            } else {
                stockWarnings.unknown = true
            }
        })

        const stockUrl = makePermalink(undefined as unknown as L.LatLng, { includeMapView: true, fullURL: true }) +
            '&pls=' + stockLinks.map((link) => link.join(',')).join('_')

        const stockWarnTexts: string[] = []
        if (stockWarnings.polyAsLine) stockWarnTexts.push('Note: polygons are exported as lines')
        if (stockLinks.length > 40) stockWarnTexts.push(`Warning: Stock intel may not work with more than 40 line segments - there are ${stockLinks.length}`)
        if (stockWarnings.noCircle) stockWarnTexts.push('Warning: Circles cannot be exported to stock intel')
        if (stockWarnings.noMarker) stockWarnTexts.push('Warning: Markers cannot be exported to stock intel')
        if (stockWarnings.unknown) stockWarnTexts.push('Warning: UNKNOWN ITEM TYPE')

        const $html = $('<div>')
        $html.append(
            $('<p style="margin:0 0 6px;">Normal export:</p>'),
            $('<p style="margin:0 0 6px;">').append(
                $('<a>').text('Select all').on('click', () => { $html.find('textarea#copyNorm').trigger('select') })
            ).append(' and press CTRL+C to copy it.'),
            $('<textarea id="copyNorm" readonly>').text(window.localStorage[this.storage.keyStorage] as string).on('click', function () { $(this).trigger('select') }),
            $('<hr/>'),
            $('<p style="margin:0 0 6px;">or export with polygons as lines (not filled):</p>'),
            $('<p style="margin:0 0 6px;">').append(
                $('<a>').text('Select all').on('click', () => { $html.find('textarea#copyEDF').trigger('select') })
            ).append(' and press CTRL+C to copy it.'),
            $('<textarea id="copyEDF" readonly>').text(this.storage.getDrawAsLines()).on('click', function () { $(this).trigger('select') }),
            $('<hr/>'),
            $('<p style="margin:0 0 6px;">or export as a link for the standard intel map (for non IITC users):</p>'),
            $('<p style="margin:0 0 6px;">').append(
                $('<a>').text('Select all').on('click', function () { $(this).next('input').trigger('select') })
            ).append(' and press CTRL+C to copy it.'),
            $('<input type="text" size="49">').val(stockUrl).on('click', function () { $(this).trigger('select') }),
        )
        if (stockWarnTexts.length > 0) {
            $html.append($('<ul>').append(stockWarnTexts.map((text) => $('<li>').text(text))))
        }

        dialog({ html: $html, width: 600, dialogClass: 'ui-dialog-drawtoolsSet-copy', id: 'plugin-drawtools-export', title: 'Draw Tools Export' })
    }

    readonly optExport = (): void => {
        if (this.storage.isEmpty()) return
        saveFile(window.localStorage[this.storage.keyStorage] as string, 'IITC-drawn-items.json', 'application/json')
    }

    readonly optPaste = (): void => {
        const $html = $('<div>').append(
            $('<p>').text('Press CTRL+V to paste (draw-tools data or stock intel URL).'),
            $('<input>').attr({ id: 'drawtoolsimport', type: 'text', style: 'width:100%' }),
        )

        dialog({
            title: 'Import Draw-Tools data',
            html: $html,
            closeCallback: () => {
                const value = $('#drawtoolsimport').val()
                const text = typeof value === 'string' ? value.trim() : ''
                if (text) {
                    try {
                        this.importExport.promptImport(text, this.mergeMode)
                        this.optAlert('Import Successful.')
                    } catch (error) {
                        console.warn('DRAWTOOLS: failed to import data: ' + String(error))
                        this.optAlert('<span style="color: #f88">Import failed</span>')
                    }
                }
            },
        })
    }

    readonly optImport = (): void => {
        let firstRun = true
        L.FileListLoader.loadFiles({ accept: 'application/json', multiple: true }).on('load', (event: unknown) => {
            try {
                const rawData = JSON.parse((event as any).reader.result as string) as unknown[]
                this.importExport.importData(rawData, firstRun && !this.mergeMode)
                firstRun = false
                console.log(`DRAWTOOLS: ${this.mergeMode ? '' : 'reset and '}imported drawn items`)
                this.optAlert('Import Successful.')
            } catch (error) {
                console.warn('DRAWTOOLS: failed to import data: ' + String(error))
                this.optAlert('<span style="color: #f88">Import failed</span>')
            }
        })
    }

    readonly optReset = (): void => {
        if (confirm('All drawn items will be deleted. Are you sure?')) {
            window.localStorage[this.storage.keyStorage] = '[]'
            this.drawnItems.clearLayers()
            this.storage.load(this.drawnItems, this.drawOptions)
            console.log('DRAWTOOLS: reset all drawn items')
            this.optAlert('Reset Successful. ')
            window.runHooks('pluginDrawTools', { event: 'clear' })
        }
    }
}

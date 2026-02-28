import { DrawOptions } from '../DrawOptions'
import { MergeControl } from './MergeControl'
import { Storage } from './Storage'
import { DrawControl } from './DrawControl'
import { SnapHelper } from './SnapHelper'
import { EmptyDrawnFields } from './EmptyDrawnFields'
import { ImportExport } from './ImportExport'

export class OptionsDialog {
    constructor(
        private readonly drawnItems: L.FeatureGroup<L.ILayer>,
        private readonly drawOptions: DrawOptions,
        private readonly mergeControl: MergeControl,
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
            .prop('checked', !this.mergeControl.status)
            .on('change', () => { this.mergeControl.toggle() })
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
            .prepend(`<p class="drawtools-alert" style="float:left;margin-top:4px;">${message}</p>`)
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
            if (layer instanceof L.GeodesicCircle || layer instanceof L.Circle) {
                stockWarnings.noCircle = true
                return
            } else if (layer instanceof L.Marker) {
                stockWarnings.noMarker = true
                return
            } else if (!(layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline ||
                         layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon)) {
                stockWarnings.unknown = true
                return
            }

            if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
                stockWarnings.polyAsLine = true
            }

            const latLngs = layer.getLatLngs()
            for (let index = 0; index < latLngs.length - 1; index++) {
                stockLinks.push([latLngs[index].lat, latLngs[index].lng, latLngs[index + 1].lat, latLngs[index + 1].lng])
            }
            if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
                stockLinks.push([latLngs.at(-1)!.lat, latLngs.at(-1)!.lng, latLngs[0].lat, latLngs[0].lng])
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
                        this.importExport.promptImport(text)
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
                this.importExport.importData(rawData, firstRun && !this.mergeControl.status)
                firstRun = false
                console.log(`DRAWTOOLS: ${this.mergeControl.status ? '' : 'reset and '}imported drawn items`)
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

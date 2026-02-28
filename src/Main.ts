import * as Plugin from 'iitcpluginkit'

// @ts-expect-error we don't want to import JSON files :(
import plugin from '../plugin.json'

import { loadExternals } from './Externals'
import { isMarker } from './Helper/LayerTypes'
import { DrawOptions } from './DrawOptions'
import { Storage } from './Helper/Storage'
import { SnapHelper } from './Helper/SnapHelper'
import { DrawControl } from './Helper/DrawControl'
import { EmptyDrawnFields } from './Helper/EmptyDrawnFields'
import { OptionsDialog } from './Helper/OptionsDialog'
import { ImportExport } from './Helper/ImportExport'
import { LocationFilter } from './Helper/LocationFilter'
import { MpeIntegration } from './Helper/MpeIntegration'

// eslint-disable-next-line @typescript-eslint/no-unsafe-call
const PLUGIN_NAME = plugin.name.replace('IITC plugin: ', '') as string

class Main implements Plugin.Class {

    drawnItems!: L.FeatureGroup<L.ILayer>

    private drawOptions!: DrawOptions
    private storage!: Storage
    private snapHelper!: SnapHelper
    private drawControl!: DrawControl
    private edf!: EmptyDrawnFields
    private optionsDialog!: OptionsDialog
    private importExport!: ImportExport
    private locationFilter!: LocationFilter
    private mpeIntegration!: MpeIntegration

    init = (): void => {
        console.log(`${PLUGIN_NAME} - ${VERSION}`)

        // eslint-disable-next-line @typescript-eslint/no-require-imports
        require('./styles.css')

        loadExternals()

        this.drawOptions = new DrawOptions()
        this.drawOptions.init()

        this.drawnItems = new L.FeatureGroup<L.ILayer>()
        this.storage = new Storage()
        this.snapHelper = new SnapHelper()
        this.drawControl = new DrawControl()
        this.edf = new EmptyDrawnFields()
        this.locationFilter = new LocationFilter()
        this.mpeIntegration = new MpeIntegration()
        this.importExport = new ImportExport(
            this.drawnItems,
            this.drawOptions,
            this.storage,
        )

        this.optionsDialog = new OptionsDialog(
            this.drawnItems,
            this.drawOptions,
            this.storage,
            this.drawControl,
            this.snapHelper,
            this.edf,
            this.importExport,
        )

        this.boot()

        // Expose public API for other plugins (hook-compatible)
        ;(window.plugin as any).drawTools = {
            drawnItems: this.drawnItems,
            filterEvents: this.locationFilter.filterEvents,
            getLocationFilters: () => this.locationFilter.getLocationFilters(this.drawnItems),
        }
    }

    private boot = (): void => {
        this.storage.load(this.drawnItems, this.drawOptions)
        this.drawControl.create(this.drawnItems, this.drawOptions, this.snapHelper)
        this.drawControl.setDrawColor(this.drawOptions.currentColor, this.drawOptions)

        // Hide draw toolbar when the 'Drawn Items' layer is off, show when on
        $('.leaflet-draw-section').hide()
        window.map.on('layeradd', (event: L.LeafletEvent) => {
            if ((event as any).layer === this.drawnItems) {
                $('.leaflet-draw-section').show()
            }
        })
        window.map.on('layerremove', (event: L.LeafletEvent) => {
            if ((event as any).layer === this.drawnItems) {
                $('.leaflet-draw-section').hide()
            }
        })

        layerChooser.addOverlay(this.drawnItems, 'Drawn Items')

        window.map.on('draw:created', (event: L.LeafletEvent) => {
            const layer = (event as any).layer as L.ILayer
            this.drawnItems.addLayer(layer)
            this.storage.save(this.drawnItems)

            if (isMarker(layer)) {
                registerMarkerForOMS(layer)
            }

            if (this.edf.status) {
                this.edf.clearAndDraw(this.drawnItems, this.storage, this.drawOptions)
            }

            window.runHooks('pluginDrawTools', { event: 'layerCreated', layer })
        })

        window.map.on('draw:deletestart', () => {
            this.edf.oldStatus = this.edf.status
            this.edf.status = false
            this.edf.toggleOpacityOpt(this.drawOptions)
            this.edf.clearAndDraw(this.drawnItems, this.storage, this.drawOptions)
        })

        window.map.on('draw:deletestop', () => {
            this.edf.status = this.edf.oldStatus
            this.edf.toggleOpacityOpt(this.drawOptions)
            this.edf.clearAndDraw(this.drawnItems, this.storage, this.drawOptions)
        })

        window.map.on('draw:deleted', () => {
            this.storage.save(this.drawnItems)
            window.runHooks('pluginDrawTools', { event: 'layersDeleted' })
        })

        window.map.on('draw:edited', () => {
            this.storage.save(this.drawnItems)
            window.runHooks('pluginDrawTools', { event: 'layersEdited' })
        })

        IITC.toolbox.addButton({
            label: 'KDrawTools',
            title: 'Draw Tools',
            id: 'btn-DrawTools',
            action: this.optionsDialog.show,
        })

        this.locationFilter.init(this.drawnItems)
        this.mpeIntegration.init(this.storage, this.drawOptions, this.drawnItems)
        this.edf.setup(this.drawnItems, this.storage, this.drawOptions)
        this.edf.init()
    }

    readonly getLocationFilters = (): ((portal: unknown) => boolean)[] =>
        this.locationFilter.getLocationFilters(this.drawnItems)
}

Plugin.Register(new Main, PLUGIN_NAME)

// The original draw-tools sets setup.priority = 'high' so it runs before dependent plugins
// (e.g. cross-links checks window.plugin.drawTools !== undefined at setup time).
// iitcpluginkit's Register() doesn't expose priority, so we set it on the last bootPlugin entry.
if (window.bootPlugins?.length) {
    (window.bootPlugins.at(-1) as any).priority = 'high'
}

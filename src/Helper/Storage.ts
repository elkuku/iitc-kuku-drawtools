import { DrawItem } from '../DrawTypes'
import { DrawOptions } from '../DrawOptions'
import { isCircle, isPolygon, isPolyline, isMarker } from './LayerTypes'

export class Storage {
    keyStorage = 'plugin-draw-tools-layer'

    readonly save = (drawnItems: L.FeatureGroup<L.ILayer>): void => {
        const data: DrawItem[] = []

        drawnItems.eachLayer((layer) => {
            // Cast to any where @types/leaflet 0.7.x doesn't declare .options on instances
            if (isCircle(layer)) {
                data.push({ type: 'circle', latLng: layer.getLatLng(), radius: layer.getRadius(), color: (layer as any).options?.color as string | undefined })
            } else if (isPolygon(layer)) {
                data.push({ type: 'polygon', latLngs: layer.getLatLngs() as { lat: number; lng: number }[], color: (layer as any).options?.color as string | undefined })
            } else if (isPolyline(layer)) {
                data.push({ type: 'polyline', latLngs: layer.getLatLngs() as { lat: number; lng: number }[], color: (layer as any).options?.color as string | undefined })
            } else if (isMarker(layer)) {
                const icon = (layer as any).options?.icon as (L.DivIcon & { options: { color: string } }) | undefined
                data.push({ type: 'marker', latLng: layer.getLatLng(), color: icon?.options?.color })
            } else {
                console.warn('Unknown layer type when saving draw tools layer')
            }
        })

        window.localStorage.setItem(this.keyStorage, JSON.stringify(data))
        console.log('draw-tools: saved to localStorage')
    }

    readonly load = (drawnItems: L.FeatureGroup<L.ILayer>, drawOptions: DrawOptions): void => {
        try {
            const dataStr = window.localStorage.getItem(this.keyStorage) ?? undefined
            if (dataStr === undefined) return
            const data = JSON.parse(dataStr) as DrawItem[]
            this.import(data, drawnItems, drawOptions)
        } catch (error) {
            console.warn('draw-tools: failed to load data from localStorage: ' + String(error))
        }
    }

    readonly import = (data: DrawItem[], drawnItems: L.FeatureGroup<L.ILayer>, drawOptions: DrawOptions): void => {
        for (const item of data) {
            try {
                let layer: L.ILayer | undefined
                const extraOptions = item.color ? { color: item.color } : {}

                switch (item.type) {
                    case 'polyline': {
                        const latLngs = (item.latLngs as { lat: number; lng: number }[]).map((ll) => new L.LatLng(ll.lat, ll.lng))
                        layer = L.geodesicPolyline(latLngs as L.LatLng[], L.extend({}, drawOptions.lineOptions, extraOptions))
                        break
                    }
                    case 'polygon': {
                        const latLngs = item.latLngs.map((ll) => new L.LatLng(ll.lat, ll.lng))
                        layer = L.geodesicPolygon(latLngs as L.LatLng[], L.extend({}, drawOptions.polygonOptions, extraOptions))
                        break
                    }
                    case 'circle': {
                        const latLng = new L.LatLng(item.latLng.lat, item.latLng.lng)
                        layer = L.geodesicCircle(latLng as L.LatLng, item.radius, L.extend({}, drawOptions.polygonOptions, extraOptions))
                        break
                    }
                    case 'marker': {
                        const latLng = new L.LatLng(item.latLng.lat, item.latLng.lng)
                        const markerOptions = L.extend({}, drawOptions.markerOptions,
                            item.color ? { icon: drawOptions.getMarkerIcon(item.color) } : {}
                        ) as L.MarkerOptions
                        layer = new L.Marker(latLng as L.LatLng, markerOptions)
                        registerMarkerForOMS(layer as L.Marker)
                        break
                    }
                    default:
                        console.warn(`unknown layer type "${String((item as Record<string, unknown>).type)}" when loading draw tools layer`)
                }

                if (layer) {
                    drawnItems.addLayer(layer)
                }
            } catch (error) {
                console.warn(`draw-tools: failed to restore ${item.type} layer: ${String(error)}`)
            }
        }

        // Wrap in its own try-catch: a failing hook listener (e.g. from a 3rd-party
        // plugin that manipulates DOM elements not yet present at boot time) must not
        // abort the import and cause "failed to load data from localStorage".
        try {
            window.runHooks('pluginDrawTools', { event: 'import' })
        } catch (error) {
            console.warn('draw-tools: error in pluginDrawTools hook listener: ' + String(error))
        }
    }

    readonly isEmpty = (): boolean => {
        const data = window.localStorage.getItem(this.keyStorage)
        if (!data || data.length <= 2) {
            dialog({
                html: 'Error! The storage is empty or does not exist. Draw something before trying to copy/export.',
                width: 250,
                dialogClass: 'ui-dialog-drawtools-message',
                title: 'Draw Tools Message',
            })
            return true
        }
        return false
    }

    readonly getDrawAsLines = (): string => {
        const rawDraw = JSON.parse(window.localStorage.getItem(this.keyStorage) ?? '[]') as DrawItem[]
        const draw: DrawItem[] = []

        for (const element of rawDraw) {
            if (element.type === 'polygon') {
                if (element.latLngs.length > 0) {
                    draw.push({
                        color: element.color,
                        type: 'polyline',
                        latLngs: [...element.latLngs, element.latLngs[0]],
                    })
                }
            } else {
                draw.push(element)
            }
        }

        return JSON.stringify(draw)
    }
}

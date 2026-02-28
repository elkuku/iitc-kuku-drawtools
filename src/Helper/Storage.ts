import { DrawItem } from '../DrawTypes'
import { DrawOptions } from '../DrawOptions'
import { isCircle, isPolygon, isPolyline, isMarker, toPolygonRings } from './LayerTypes'

export class Storage {
    keyStorage = 'plugin-draw-tools-layer'

    readonly save = (drawnItems: L.FeatureGroup<L.ILayer>, _drawOptions: DrawOptions): void => {
        const data: DrawItem[] = []

        drawnItems.eachLayer((layer) => {
            // Cast to any where @types/leaflet 0.7.x doesn't declare .options on instances
            if (isCircle(layer)) {
                data.push({ type: 'circle', latLng: layer.getLatLng(), radius: layer.getRadius(), color: (layer as any).options?.color as string | undefined })
            } else if (isPolygon(layer)) {
                const rawLatLngs = layer.getLatLngs() as { lat: number; lng: number }[] | { lat: number; lng: number }[][]
                data.push({ type: 'polygon', latLngs: toPolygonRings(rawLatLngs), color: (layer as any).options?.color as string | undefined })
            } else if (isPolyline(layer)) {
                data.push({ type: 'polyline', latLngs: layer.getLatLngs() as { lat: number; lng: number }[], color: (layer as any).options?.color as string | undefined })
            } else if (isMarker(layer)) {
                const icon = (layer as any).options?.icon as (L.DivIcon & { options: { color: string } }) | undefined
                data.push({ type: 'marker', latLng: layer.getLatLng(), color: icon?.options?.color })
            } else {
                console.warn('Unknown layer type when saving draw tools layer')
            }
        })

        window.localStorage[this.keyStorage] = JSON.stringify(data)
        console.log('draw-tools: saved to localStorage')
    }

    readonly load = (drawnItems: L.FeatureGroup<L.ILayer>, drawOptions: DrawOptions): void => {
        try {
            const dataStr = window.localStorage[this.keyStorage] as string | undefined
            if (dataStr === undefined) return
            const data = JSON.parse(dataStr) as DrawItem[]
            this.import(data, drawnItems, drawOptions)
        } catch (error) {
            console.warn('draw-tools: failed to load data from localStorage: ' + String(error))
        }
    }

    readonly import = (data: DrawItem[], drawnItems: L.FeatureGroup<L.ILayer>, drawOptions: DrawOptions): void => {
        for (const item of data) {
            let layer: L.ILayer | undefined
            const extraOptions = item.color ? { color: item.color } : {}

            switch (item.type) {
                case 'polyline':
                    layer = L.geodesicPolyline(item.latLngs as L.LatLng[], L.extend({}, drawOptions.lineOptions, extraOptions))
                    break
                case 'polygon':
                    layer = L.geodesicPolygon(toPolygonRings(item.latLngs) as unknown as L.LatLng[], L.extend({}, drawOptions.polygonOptions, extraOptions))
                    break
                case 'circle':
                    layer = L.geodesicCircle(item.latLng as L.LatLng, item.radius, L.extend({}, drawOptions.polygonOptions, extraOptions))
                    break
                case 'marker': {
                    const markerOptions = L.extend({}, drawOptions.markerOptions,
                        item.color ? { icon: drawOptions.getMarkerIcon(item.color) } : {}
                    ) as L.MarkerOptions
                    layer = new L.Marker(item.latLng as L.LatLng, markerOptions)
                    registerMarkerForOMS(layer as L.Marker)
                    break
                }
                default:
                    console.warn(`unknown layer type "${String((item as Record<string, unknown>).type)}" when loading draw tools layer`)
            }

            if (layer) {
                drawnItems.addLayer(layer)
            }
        }

        window.runHooks('pluginDrawTools', { event: 'import' })
    }

    readonly isEmpty = (): boolean => {
        const data = window.localStorage[this.keyStorage] as string | undefined
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
        const rawDraw = JSON.parse(window.localStorage[this.keyStorage] as string) as DrawItem[]
        const draw: DrawItem[] = []

        for (const element of rawDraw) {
            if (element.type === 'polygon') {
                const rings = toPolygonRings(element.latLngs)
                if (rings.length === 0) continue
                const outerRing = rings[0]
                if (outerRing.length > 0) {
                    draw.push({
                        color: element.color,
                        type: 'polyline',
                        latLngs: [...outerRing, outerRing[0]],
                    })
                }
            } else {
                draw.push(element)
            }
        }

        return JSON.stringify(draw)
    }
}

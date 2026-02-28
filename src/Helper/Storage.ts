import { DrawItem } from '../DrawTypes'
import { DrawOptions } from '../DrawOptions'

export class Storage {
    keyStorage = 'plugin-draw-tools-layer'

    readonly save = (drawnItems: L.FeatureGroup<L.ILayer>, _drawOptions: DrawOptions): void => {
        const data: DrawItem[] = []

        drawnItems.eachLayer((layer) => {
            // Cast to any where @types/leaflet 0.7.x doesn't declare .options on instances
            if (layer instanceof L.GeodesicCircle || layer instanceof L.Circle) {
                const circle = layer as L.Circle
                data.push({ type: 'circle', latLng: circle.getLatLng(), radius: circle.getRadius(), color: (circle as any).options?.color as string | undefined })
            } else if (layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon) {
                const polygon = layer
                data.push({ type: 'polygon', latLngs: polygon.getLatLngs() as { lat: number; lng: number }[], color: (polygon as any).options?.color as string | undefined })
            } else if (layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline) {
                const polyline = layer
                data.push({ type: 'polyline', latLngs: polyline.getLatLngs() as { lat: number; lng: number }[], color: (polyline as any).options?.color as string | undefined })
            } else if (layer instanceof L.Marker) {
                const marker = layer
                const icon = (marker as any).options?.icon as (L.DivIcon & { options: { color: string } }) | undefined
                data.push({ type: 'marker', latLng: marker.getLatLng(), color: icon?.options?.color })
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
                    layer = L.geodesicPolygon(item.latLngs as L.LatLng[], L.extend({}, drawOptions.polygonOptions, extraOptions))
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
                draw.push({
                    color: element.color,
                    type: 'polyline',
                    latLngs: [...element.latLngs, element.latLngs[0]],
                })
            } else {
                draw.push(element)
            }
        }

        return JSON.stringify(draw)
    }
}

export class LocationFilter {
    filterEvents = new L.Evented()
    private cachedFilters: Array<(portal: unknown) => boolean> | null = null

    readonly init = (drawnItems: L.FeatureGroup<L.ILayer>): void => {
        window.map.on('draw:created draw:edited draw:deleted', (event: L.LeafletEvent) => {
            this.filterEvents.fire('changed', { originalEvent: event })
        })
        this.filterEvents.on('changed', () => {
            this.cachedFilters = null
        })

        void drawnItems
    }

    readonly getLocationFilters = (drawnItems: L.FeatureGroup<L.ILayer>): Array<(portal: unknown) => boolean> => {
        if (this.cachedFilters) return this.cachedFilters

        if (!window.map.hasLayer(drawnItems)) return []

        const markers: L.Marker[] = []
        const polygons: L.GeodesicPolygon[] = []

        drawnItems.eachLayer((layer) => {
            if (layer instanceof L.GeodesicPolygon) {
                polygons.push(layer as L.GeodesicPolygon)
            } else if (layer instanceof L.Marker) {
                markers.push(layer as L.Marker)
            }
        })

        const activeMarkers = markers.filter((marker) => (marker as any)._icon?._leaflet_pos)
        const rings = polygons
            .filter((poly) => (poly as any)._rings?.length)
            .map((poly) => (poly as any)._rings[0] as L.Point[])

        this.cachedFilters = rings.map((ring) => (portal: unknown) => {
            let point: L.Point | undefined
            const asAny = portal as any

            if ('_point' in (asAny as object) || portal instanceof L.CircleMarker) {
                point = asAny._point as L.Point | undefined
                if (!point) return false
            } else if (asAny && 'x' in (asAny as object)) {
                point = asAny as L.Point
            } else if (asAny && 'lat' in (asAny as object)) {
                point = window.map.latLngToLayerPoint(asAny as L.LatLng)
            } else if (asAny?.getLatLng) {
                point = window.map.latLngToLayerPoint((asAny as L.CircleMarker).getLatLng())
            }

            if (!point) return false

            if (activeMarkers.some((marker) => (marker as any)._icon._leaflet_pos.equals(point))) {
                return false
            }

            return window.pnpoly(ring, point)
        })

        return this.cachedFilters
    }
}

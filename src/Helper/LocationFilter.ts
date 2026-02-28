export class LocationFilter {
    filterEvents = new L.Evented()
    private cachedFilters: ((portal: unknown) => boolean)[] | undefined = undefined

    readonly init = (drawnItems: L.FeatureGroup<L.ILayer>): void => {
        window.map.on('draw:created draw:edited draw:deleted', (event: L.LeafletEvent) => {
            this.filterEvents.fire('changed', { originalEvent: event })
        })
        this.filterEvents.on('changed', () => {
            this.cachedFilters = undefined
        })

        void drawnItems
    }

    readonly getLocationFilters = (drawnItems: L.FeatureGroup<L.ILayer>): ((portal: unknown) => boolean)[] => {
        if (this.cachedFilters) return this.cachedFilters

        if (!window.map.hasLayer(drawnItems)) return []

        const markers: L.Marker[] = []
        const polygons: L.GeodesicPolygon[] = []

        drawnItems.eachLayer((layer) => {
            if (layer instanceof L.GeodesicPolygon) {
                polygons.push(layer)
            } else if (layer instanceof L.Marker) {
                markers.push(layer)
            }
        })

        // eslint-disable-next-line no-underscore-dangle
        const activeMarkers = markers.filter((marker) => (marker as any)._icon?._leaflet_pos)
        const rings = polygons
            // eslint-disable-next-line no-underscore-dangle
            .filter((poly) => (poly as any)._rings?.length)
            // eslint-disable-next-line no-underscore-dangle
            .map((poly) => (poly as any)._rings[0] as L.Point[])

        this.cachedFilters = rings.map((ring) => (portal: unknown) => {
            let point: L.Point | undefined
            const asAny = portal as any

            if ('_point' in (asAny as object) || portal instanceof L.CircleMarker) {
                // eslint-disable-next-line no-underscore-dangle
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

            // eslint-disable-next-line no-underscore-dangle
            if (activeMarkers.some((marker) => ((marker as any)._icon._leaflet_pos as L.Point).equals(point))) {
                return false
            }

            return window.pnpoly(ring, point)
        })

        return this.cachedFilters
    }
}

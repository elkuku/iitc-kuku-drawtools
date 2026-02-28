import { Storage } from './Storage'

export class SnapHelper {
    readonly getSnapLatLng = (unsnappedLatLng: L.LatLng): L.LatLng => {
        const containerPoint = window.map.latLngToContainerPoint(unsnappedLatLng)
        const candidates: [number, L.LatLng][] = []

        $.each(window.portals, (_guid, portal) => {
            const ll = portal.getLatLng()
            const pp = window.map.latLngToContainerPoint(ll)
            // portal.options lacks weight/radius in @types/leaflet 0.7.x; cast to access runtime values
            const portalOptions = portal.options as any
            const size = ((portalOptions.weight as number) ?? 0) + ((portalOptions.radius as number) ?? 0)
            const distance = pp.distanceTo(containerPoint)
            if (distance > size) return
            candidates.push([distance, ll])
        })

        if (candidates.length === 0) return unsnappedLatLng
        candidates.sort((a, b) => a[0] - b[0])
        return new L.LatLng(candidates[0][1].lat, candidates[0][1].lng)
    }

    readonly snapToPortals = (drawnItems: L.FeatureGroup<L.ILayer>, storage: Storage): void => {
        if (!(getDataZoomTileParameters() as any).hasPortals) {
            if (!confirm('Not all portals are visible on the map. Snap to portals may move valid points to the wrong place. Continue?')) {
                return
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        if (window.mapDataRequest.getStatus().short !== 'done') {
            if (!confirm('Map data has not completely loaded, so some portals may be missing. Do you want to continue?')) {
                return
            }
        }

        const visibleBounds = window.map.getBounds()
        const visiblePortals: Record<string, L.Point> = {}

        $.each(window.portals, (guid, portal) => {
            const ll = portal.getLatLng()
            if (visibleBounds.contains(ll)) {
                visiblePortals[guid] = window.map.project(ll)
            }
        })

        if (Object.keys(visiblePortals).length === 0) {
            alert('Error: No portals visible in this view - nothing to snap points to!')
            return
        }

        const findClosest = (latlng: L.LatLng): L.LatLng | undefined => {
            const testPoint = window.map.project(latlng)
            let minSquaredDistance = Infinity
            let minGuid: string | undefined

            for (const guid in visiblePortals) {
                const diff = visiblePortals[guid].subtract(testPoint)
                const squaredDistance = diff.x * diff.x + diff.y * diff.y
                if (minSquaredDistance > squaredDistance) {
                    minSquaredDistance = squaredDistance
                    minGuid = guid
                }
            }

            if (minGuid) {
                const pll = window.portals[minGuid].getLatLng()
                if (pll.lat !== latlng.lat || pll.lng !== latlng.lng) {
                    return new L.LatLng(pll.lat, pll.lng)
                }
            }
            return undefined
        }

        let changedCount = 0
        let testCount = 0

        drawnItems.eachLayer((layer) => {
            const asAny = layer as any
            if (asAny.getLatLng) {
                const ll = (layer as L.Circle).getLatLng()
                if (visibleBounds.contains(ll)) {
                    testCount++
                    const newll = findClosest(ll)
                    if (newll) {
                        (layer as L.Circle).setLatLng(newll)
                        changedCount++
                    }
                }
            } else if (asAny.getLatLngs) {
                const polyline = asAny as L.Polyline
                const lls = polyline.getLatLngs()
                let layerChanged = false
                lls.forEach((ll, index) => {
                    if (visibleBounds.contains(ll)) {
                        testCount++
                        const newll = findClosest(ll)
                        if (newll) {
                            lls[index] = newll
                            changedCount++
                            layerChanged = true
                        }
                    }
                })
                if (layerChanged) {
                    polyline.setLatLngs(lls)
                }
            }
        })

        if (changedCount) {
            window.runHooks('pluginDrawTools', { event: 'layersSnappedToPortals' })
        }

        alert(`Tested ${testCount} points, and moved ${changedCount} onto portal coordinates`)
        storage.save(drawnItems)
    }
}

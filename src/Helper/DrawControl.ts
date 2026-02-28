import { DrawOptions } from '../DrawOptions'
import { SnapHelper } from './SnapHelper'

// Minimal shape of the Leaflet.draw control (loaded at runtime via loadExternals)
interface LeafletDrawControl extends L.IControl {
    setDrawingOptions(options: Record<string, unknown>): void;
}

export class DrawControl {
    private control!: LeafletDrawControl

    readonly create = (drawnItems: L.FeatureGroup<L.ILayer>, drawOptions: DrawOptions, snapHelper: SnapHelper): void => {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        this.control = new (L.Control as any).Draw({
            draw: {
                rectangle: false,
                circlemarker: false,
                polygon: {
                    shapeOptions: drawOptions.polygonOptions,
                    snapPoint: snapHelper.getSnapLatLng,
                },
                polyline: {
                    shapeOptions: drawOptions.lineOptions,
                    snapPoint: snapHelper.getSnapLatLng,
                },
                circle: {
                    shapeOptions: drawOptions.polygonOptions,
                    snapPoint: snapHelper.getSnapLatLng,
                },
                marker: L.extend({}, drawOptions.markerOptions, {
                    snapPoint: snapHelper.getSnapLatLng,
                    repeatMode: true,
                }) as any,
            },
            edit: {
                featureGroup: drawnItems,
                edit: {
                    selectedPathOptions: drawOptions.editOptions,
                },
            },
        }) as LeafletDrawControl

        window.map.addControl(this.control)
    }

    readonly setDrawColor = (color: string, drawOptions: DrawOptions): void => {
        drawOptions.updateColor(color)
        this.control.setDrawingOptions({
            polygon: { shapeOptions: drawOptions.polygonOptions, feet: false, nautic: false },
            polyline: { shapeOptions: drawOptions.lineOptions, feet: false, nautic: false },
            circle: { shapeOptions: drawOptions.polygonOptions, feet: false, nautic: false },
            marker: { icon: drawOptions.markerOptions.icon },
        })
    }

}

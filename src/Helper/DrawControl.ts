import { DrawOptions } from '../DrawOptions'
import { SnapHelper } from './SnapHelper'

// Minimal shape of the Leaflet.draw control (loaded at runtime via loadExternals)
interface LeafletDrawControl extends L.IControl {
    _toolbars: Record<string, L.Toolbar>;
    _container: HTMLElement;
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

        this.setAccessKeys()

        // eslint-disable-next-line no-underscore-dangle
        for (const toolbarId of Object.keys(this.control._toolbars)) {
            // eslint-disable-next-line no-underscore-dangle
            if (this.control._toolbars[toolbarId] instanceof L.Toolbar) {
                // eslint-disable-next-line no-underscore-dangle
                this.control._toolbars[toolbarId].on('enable', () => {
                    setTimeout(this.setAccessKeys, 10)
                })
            }
        }
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

    readonly setAccessKeys = (): void => {
        const expr = /\s*\[\w+]$/
        const accessKeys = [
            'l', // line
            'p', // polygon
            'o', // circle
            'm', // marker
            'a', // cancel (_abort)
            'e', // edit
            'd', // delete
            's', // save
            'a', // cancel
        ]

        // eslint-disable-next-line no-underscore-dangle
        const buttons = this.control._container.getElementsByTagName('a')
        for (const [index, button] of [...buttons].entries()) {
            let title = button.title
            const found = title.search(expr)
            if (found !== -1) title = title.slice(0, found)

            if (!button.offsetParent) {
                button.accessKey = ''
            } else if (accessKeys[index]) {
                button.accessKey = accessKeys[index]
                title = title === '' ? `[${accessKeys[index]}]` : `${title} [${accessKeys[index]}]`
            }
            button.title = title
        }
    }
}

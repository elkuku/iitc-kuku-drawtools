import { DrawOptions } from '../DrawOptions'
import { SnapHelper } from './SnapHelper'

export class DrawControl {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private control!: any

    readonly create = (drawnItems: L.FeatureGroup<L.ILayer>, drawOptions: DrawOptions, snapHelper: SnapHelper): void => {
        // L.Control.Draw is loaded at runtime via loadExternals (Leaflet.draw)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        })

        window.map.addControl(this.control)

        this.setAccessKeys()

        for (const toolbarId in this.control._toolbars) {
            if (this.control._toolbars[toolbarId] instanceof L.Toolbar) {
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

        const buttons = this.control._container.getElementsByTagName('a')
        for (let index = 0; index < buttons.length; index++) {
            const button = buttons[index]
            let title = button.title
            const found = title.search(expr)
            if (found !== -1) title = title.slice(0, found)

            if (!button.offsetParent) {
                button.accessKey = ''
            } else if (accessKeys[index]) {
                button.accessKey = accessKeys[index]
                if (title === '') title = '[' + accessKeys[index] + ']'
                else title += ' [' + accessKeys[index] + ']'
            }
            button.title = title
        }
    }
}

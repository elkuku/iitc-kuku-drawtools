import { DrawOptions } from '../DrawOptions'
import { Storage } from './Storage'

export class EmptyDrawnFields {
    status = false
    oldStatus = false

    private drawnItems!: L.FeatureGroup<L.ILayer>
    private storage!: Storage
    private drawOptions!: DrawOptions

    readonly setup = (drawnItems: L.FeatureGroup<L.ILayer>, storage: Storage, drawOptions: DrawOptions): void => {
        this.drawnItems = drawnItems
        this.storage = storage
        this.drawOptions = drawOptions
    }

    readonly init = (): void => {
        window.addHook('iitcLoaded', () => {
            if (this.status) {
                this.toggleOpacityOpt(this.drawOptions)
                this.clearAndDraw(this.drawnItems, this.storage, this.drawOptions)
            }
        })
    }

    readonly toggle = (): void => {
        this.status = !this.status
    }

    readonly toggleOpacityOpt = (drawOptions: DrawOptions): void => {
        drawOptions.setFillOpacity(!this.status)
    }

    readonly clearAndDraw = (drawnItems: L.FeatureGroup<L.ILayer>, storage: Storage, drawOptions: DrawOptions): void => {
        drawnItems.clearLayers()
        storage.load(drawnItems, drawOptions)
        console.log('DRAWTOOLS: reset all drawn items')
    }

    readonly statusToggle = (drawnItems: L.FeatureGroup<L.ILayer>, storage: Storage, drawOptions: DrawOptions): void => {
        this.toggle()
        this.toggleOpacityOpt(drawOptions)
        this.clearAndDraw(drawnItems, storage, drawOptions)
    }
}

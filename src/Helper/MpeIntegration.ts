import { Storage } from './Storage'
import { DrawOptions } from '../DrawOptions'

export class MpeIntegration {
    readonly init = (storage: Storage, drawOptions: DrawOptions, drawnItems: L.FeatureGroup<L.ILayer>): void => {
        // window.plugin namespace is TypeScript-only; mpe/crossLinks/destroyedLinks are 3rd-party plugins
        const wPlugin = window.plugin as any
        if (!wPlugin.mpe) return

        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        wPlugin.mpe.setMultiProjects({
            namespace: 'drawTools',
            title: 'Draw Tools Layer',
            fa: 'fa-pencil',
            func_setKey: (newKey: string) => {
                storage.keyStorage = newKey
            },
            defaultKey: 'plugin-draw-tools-layer',
            func_pre: () => { /* intentionally empty */ },
            func_post: () => {
                drawnItems.clearLayers()
                storage.load(drawnItems, drawOptions)
                console.log('DRAWTOOLS: reset all drawn items (func_post)')

                if (wPlugin.crossLinks) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    wPlugin.crossLinks.checkAllLinks()
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    wPlugin.destroyedLinks?.cross.removeCrossAll()
                }
            },
        })
    }
}

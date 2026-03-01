import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DrawOptions } from './DrawOptions'

describe('DrawOptions', () => {
    let drawOptions: DrawOptions

    beforeEach(() => {
        drawOptions = new DrawOptions()
        drawOptions.init()
    })

    it('initialises with the default colour #a24ac3', () => {
        expect(drawOptions.currentColor).toBe('#a24ac3')
    })

    describe('lineOptions', () => {
        it('has stroke weight 4', () => {
            expect(drawOptions.lineOptions.weight).toBe(4)
        })

        it('has opacity 0.5', () => {
            expect(drawOptions.lineOptions.opacity).toBe(0.5)
        })

        it('has fill disabled', () => {
            expect(drawOptions.lineOptions.fill).toBe(false)
        })

        it('uses the default colour', () => {
            expect(drawOptions.lineOptions.color).toBe('#a24ac3')
        })
    })

    describe('polygonOptions', () => {
        it('has fill enabled', () => {
            expect(drawOptions.polygonOptions.fill).toBe(true)
        })

        it('has fillOpacity 0.2', () => {
            expect(drawOptions.polygonOptions.fillOpacity).toBe(0.2)
        })

        it('inherits weight and opacity from lineOptions', () => {
            expect(drawOptions.polygonOptions.weight).toBe(4)
            expect(drawOptions.polygonOptions.opacity).toBe(0.5)
        })
    })

    describe('editOptions', () => {
        it('has dashArray set', () => {
            expect(drawOptions.editOptions.dashArray).toBe('10,10')
        })

        it('has no color property (deleted after extend)', () => {
            expect(drawOptions.editOptions.color).toBeUndefined()
        })
    })

    describe('updateColor', () => {
        it('changes currentColor', () => {
            drawOptions.updateColor('#ff0000')
            expect(drawOptions.currentColor).toBe('#ff0000')
        })

        it('propagates the new colour to lineOptions', () => {
            drawOptions.updateColor('#00ff00')
            expect(drawOptions.lineOptions.color).toBe('#00ff00')
        })

        it('propagates the new colour to polygonOptions', () => {
            drawOptions.updateColor('#0000ff')
            expect(drawOptions.polygonOptions.color).toBe('#0000ff')
        })
    })

    describe('setFillOpacity', () => {
        it('restores fillOpacity to 0.2 when filled=true', () => {
            drawOptions.setFillOpacity(false)
            drawOptions.setFillOpacity(true)
            expect(drawOptions.polygonOptions.fillOpacity).toBe(0.2)
        })

        it('sets fillOpacity to 0 when filled=false', () => {
            drawOptions.setFillOpacity(false)
            expect(drawOptions.polygonOptions.fillOpacity).toBe(0)
        })

        it('sets interactive=true when filled', () => {
            drawOptions.setFillOpacity(true)
            expect(drawOptions.polygonOptions.interactive).toBe(true)
        })

        it('sets interactive=false when not filled', () => {
            drawOptions.setFillOpacity(false)
            expect(drawOptions.polygonOptions.interactive).toBe(false)
        })
    })

    describe('getMarkerIcon', () => {
        it('returns an icon object', () => {
            const icon = drawOptions.getMarkerIcon('#ff0000')
            expect(icon).toBeDefined()
        })

        it('logs a warning when called without a colour', () => {
            const spy = vi.spyOn(console, 'warn').mockImplementation(() => { /* no-op */ })
            drawOptions.getMarkerIcon()
            expect(spy).toHaveBeenCalledOnce()
            spy.mockRestore()
        })
    })
})

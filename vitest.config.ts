import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        globals: false,
        environment: 'jsdom',
        environmentOptions: {
            jsdom: {
                url: 'http://localhost/',
            },
        },
        setupFiles: ['./src/TestSetup.ts'],
        include: ['src/**/*.spec.ts'],
    },
})

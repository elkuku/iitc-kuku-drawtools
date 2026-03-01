'use strict'

const path = require('path')

// IITC-specific Leaflet.draw extensions (not on npm), copied from ingress-intel-total-conversion.
const EXTERNAL = path.resolve(__dirname, 'external')

module.exports = {
    externals: {
        // spectrum-colorpicker requires('jquery') at runtime; map it to the IITC global
        jquery: 'jQuery',
    },
    module: {
        rules: [
            {
                test: /\.hbs$/,
                type: 'asset/source',
            },
        ],
    },
    resolve: {
        alias: {
            'iitc-draw-snap': path.join(EXTERNAL, 'leaflet.draw-snap.js'),
            'iitc-draw-geodesic': path.join(EXTERNAL, 'leaflet.draw-geodesic.js'),
            'iitc-draw-confirm': path.join(EXTERNAL, 'leaflet.draw-confirm.js'),
            'iitc-draw-fix.css': path.join(EXTERNAL, 'leaflet.draw-fix.css'),
        },
    },
}

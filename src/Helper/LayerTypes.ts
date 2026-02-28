/**
 * Type guard helpers for Leaflet layer classification.
 *
 * IITC uses geodesic variants (L.Geodesic*) alongside stock Leaflet types.
 * These guards normalise both into a single predicate.
 *
 * NOTE: In Leaflet, Polygon extends Polyline, so isPolyline() returns true
 * for polygon layers. In an if-else chain always check isPolygon before isPolyline.
 */

export const isCircle = (layer: L.ILayer): layer is L.Circle =>
    layer instanceof L.GeodesicCircle || layer instanceof L.Circle

export const isPolygon = (layer: L.ILayer): layer is L.Polygon =>
    layer instanceof L.GeodesicPolygon || layer instanceof L.Polygon

export const isPolyline = (layer: L.ILayer): layer is L.Polyline =>
    layer instanceof L.GeodesicPolyline || layer instanceof L.Polyline

export const isMarker = (layer: L.ILayer): layer is L.Marker =>
    layer instanceof L.Marker

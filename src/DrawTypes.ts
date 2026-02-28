export type DrawItem =
    | { type: 'circle';   latLng: { lat: number; lng: number }; radius: number; color?: string }
    | { type: 'polygon';  latLngs: { lat: number; lng: number }[] | { lat: number; lng: number }[][]; color?: string }
    | { type: 'polyline'; latLngs: { lat: number; lng: number }[]; color?: string }
    | { type: 'marker';   latLng: { lat: number; lng: number }; color?: string }

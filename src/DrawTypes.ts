export type DrawItemType = 'circle' | 'polygon' | 'polyline' | 'marker';

export interface DrawItem {
    type: DrawItemType;
    color?: string;
    latLng?: { lat: number; lng: number };
    latLngs?: { lat: number; lng: number }[] | { lat: number; lng: number }[][];
    radius?: number;
}

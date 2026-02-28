export type DrawItemType = 'circle' | 'polygon' | 'polyline' | 'marker';

export interface DrawItem {
    type: DrawItemType;
    color?: string;
    latLng?: { lat: number; lng: number };
    latLngs?: Array<{ lat: number; lng: number }> | Array<Array<{ lat: number; lng: number }>>;
    radius?: number;
}

export class DrawOptions {
    currentColor = '#a24ac3';
    currentMarker!: L.DivIcon;
    lineOptions!: L.PolylineOptions;
    polygonOptions!: L.PolylineOptions;
    editOptions!: L.PolylineOptions;
    markerOptions!: { icon: L.DivIcon; zIndexOffset: number };

    readonly getMarkerIcon = (color?: string): L.DivIcon => {
        if (!color) {
            console.warn('Color is not set (default #a24ac3 will be used)');
        }
        return new L.DivIcon.ColoredSvg(color);
    };

    readonly init = (): void => {
        this.currentMarker = this.getMarkerIcon(this.currentColor);

        this.lineOptions = {
            stroke: true,
            color: this.currentColor,
            weight: 4,
            opacity: 0.5,
            fill: false,
            interactive: true,
        };

        this.polygonOptions = L.extend({}, this.lineOptions, {
            fill: true,
            fillColor: null,
            fillOpacity: 0.2,
            dashArray: '',
            interactive: true,
        }) as L.PolylineOptions;

        this.editOptions = L.extend({}, this.polygonOptions, {
            dashArray: '10,10',
        }) as L.PolylineOptions;
        delete this.editOptions.color;

        this.markerOptions = {
            icon: this.currentMarker,
            zIndexOffset: 2000,
        };
    };

    readonly updateColor = (color: string): void => {
        this.currentColor = color;
        this.currentMarker = this.getMarkerIcon(color);
        this.lineOptions.color = color;
        this.polygonOptions.color = color;
        this.markerOptions.icon = this.currentMarker;
    };

    readonly setFillOpacity = (filled: boolean): void => {
        this.polygonOptions.fillOpacity = filled ? 0.2 : 0.0;
        this.polygonOptions.interactive = filled;
    };
}

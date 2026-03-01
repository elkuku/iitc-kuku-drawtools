// Declare external modules so TypeScript accepts side-effect imports.
// leaflet-draw and spectrum-colorpicker are installed via yarn.
// iitc-draw-* aliases are resolved to the IITC repo via webpack.config.cjs.
declare module '*.hbs' {
    const content: string;
    export default content;
}

declare module 'leaflet-draw'
declare module 'iitc-draw-snap'
declare module 'iitc-draw-geodesic'
declare module 'iitc-draw-confirm'
declare module 'spectrum-colorpicker'
declare module '*.css'

// Draw-tools specific type augmentations.
// iitcpluginkit already declares: L.GeodesicPolyline/Polygon/Circle, window.map,
// window.portals (IITC.Portal), window.mapDataRequest, window.dialog (as global fn),
// window.registerMarkerForOMS, window.saveFile (as global fn), layerChooser (as global const),
// makePermalink (as global fn), getDataZoomTileParameters (as global fn).

declare namespace L {
    // L.extend as a top-level utility (Leaflet 1.x runtime, not in 0.7.x @types)
    function extend<T extends object>(dest: T, ...sources: object[]): T;

    // L.Evented (Leaflet 1.x class, not in 0.7.x @types)
    class Evented {
        on(type: string, fn: (...args: any[]) => void, context?: any): this;
        off(type: string, fn?: (...args: any[]) => void, context?: any): this;
        fire(type: string, data?: any, propagate?: boolean): this;
        once(type: string, fn: (...args: any[]) => void, context?: any): this;
    }

    // L.DivIcon.ColoredSvg (IITC extension on static side of DivIcon)
    interface DivIconStatic {
        ColoredSvg: new (color?: string) => DivIcon & { options: DivIconOptions & { color: string } };
    }

    // L.geodesicCircle (not in leaflet_extentions/index.d.ts)
    function geodesicCircle(latlng: LatLngExpression, radius: number, options: PolylineOptions): GeodesicPolyline;

    // L.FileListLoader (Leaflet.draw extension)
    class FileListLoader {
        static loadFiles(options: { accept?: string; multiple?: boolean }): Evented;
    }

    // Leaflet.draw: L.Control.Draw
    namespace Control {
        interface DrawShapeOptions {
            shapeOptions?: PolylineOptions;
            feet?: boolean;
            nautic?: boolean;
            snapPoint?: (latlng: LatLng) => LatLng;
            repeatMode?: boolean;
        }
        interface DrawIconOptions extends MarkerOptions {
            snapPoint?: (latlng: LatLng) => LatLng;
            repeatMode?: boolean;
        }
        interface DrawControlOptions {
            draw?: {
                rectangle?: false;
                circlemarker?: false;
                polygon?: DrawShapeOptions;
                polyline?: DrawShapeOptions;
                circle?: DrawShapeOptions;
                marker?: DrawIconOptions;
            };
            edit?: {
                featureGroup?: FeatureGroup<ILayer>;
                edit?: { selectedPathOptions?: PolylineOptions };
            };
        }
        interface DrawingUpdateOptions {
            polygon?: DrawShapeOptions;
            polyline?: DrawShapeOptions;
            circle?: DrawShapeOptions;
            marker?: { icon?: Icon | DivIcon };
        }
        class Draw extends Control {
            constructor(options?: DrawControlOptions);
            _toolbars: Record<string, Toolbar>;
            _container: HTMLElement;
            setDrawingOptions(options: DrawingUpdateOptions): void;
        }
    }

    // L.Toolbar (base class for Leaflet.draw toolbars)
    class Toolbar extends Evented {}

    // Leaflet.draw prototype augmentations
    namespace Draw {
        namespace Polyline {
            const prototype: {
                options: { shapeOptions: PolylineOptions };
                _onTouch: Function;
                _onTouch_original?: Function;
            };
        }
        namespace Polygon {
            const prototype: { options: { shapeOptions: PolylineOptions } };
        }
        namespace Rectangle {
            const prototype: { options: { shapeOptions: PolylineOptions } };
        }
        namespace CircleMarker {
            const prototype: { options: { interactive: boolean } };
        }
        namespace Circle {
            const prototype: { options: { shapeOptions: PolylineOptions } };
        }
    }

    namespace Map {
        class TouchExtend extends Handler {}
    }
}

// MPE plugin integration options
interface MpeIntegrationOptions {
    namespace: string;
    title: string;
    fa: string;
    func_setKey: (key: string) => void;
    defaultKey: string;
    func_pre: () => void;
    func_post: () => void;
}

// Augment WindowPlugin (declared in types/Types.ts) for draw-tools related plugins
interface WindowPlugin {
    mpe?: {
        setMultiProjects(options: MpeIntegrationOptions): void;
    };
    crossLinks?: {
        checkAllLinks(): void;
    };
    destroyedLinks?: {
        cross: { removeCrossAll(): void };
    };
}

// Additional IITC globals not declared by iitcpluginkit
// Note: declare global{} is for module files. In this ambient file, augment Window directly.
interface Window {
    isApp: boolean;
    app: { shareString(text: string): void };
    pnpoly(poly: L.Point[], point: L.Point): boolean;
}

// Augment the plugin namespace so window.plugin.HelperHandlebars is typed
declare namespace plugin {
    const HelperHandlebars: {
        compile: (templateString: string) => Handlebars.TemplateDelegate;
    } | undefined;
}

// Extend spectrum options with properties used by draw-tools
declare namespace JQueryUI {
    interface SpectrumOptions {
        showPaletteOnly?: boolean;
        showSelectionPalette?: boolean;
        change?: (color: { toHexString(): string }) => void;
        color?: string;
    }
}

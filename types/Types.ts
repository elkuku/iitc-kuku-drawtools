
export interface HelperHandlebars {
    compile: (templateString: any) => Handlebars.TemplateDelegate
    registerHelper: (name: Handlebars.HelperDeclareSpec) => void
}

// Extend this interface in other .d.ts files to add plugin namespaces
interface WindowPlugin {
    HelperHandlebars?: HelperHandlebars
}

declare global {
    interface Window {
        plugin: WindowPlugin
    }
}

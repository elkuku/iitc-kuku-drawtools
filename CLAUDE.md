# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
yarn build          # dev build (alias for build:dev)
yarn build:dev      # development build via iitcpluginkit
yarn build:prod     # production build (used for tagged releases)
yarn start          # start file server (yarn ipk fileserver)
yarn autobuild      # watch mode with auto-rebuild
```

ESLint is configured but has no dedicated `lint` script — run it directly:
```bash
yarn eslint src/
```

There are no tests in this project.

## Architecture

This is an **IITC (Ingress Intel Total Conversion) plugin** built with [IITCPluginKit](https://github.com/McBen/IITCPluginKit). IITC runs inside the Ingress map browser page and plugins extend its functionality.

### Build system
`iitcpluginkit` (the `ipk` CLI) handles bundling (webpack under the hood), TypeScript compilation, and output. It reads `plugin.json` for plugin metadata and `src/Main.ts` as the entry point. Dev builds go to `dist/`, prod builds are used for tagged releases.

### Plugin lifecycle
Plugins implement the `Plugin.Class` interface from `iitcpluginkit` and register via `Plugin.Register(instance, name)`. The `init()` method is the entry point called by IITC after the plugin loads.

### Source layout
- `src/Main.ts` — plugin entry point; implements `Plugin.Class`
- `src/Helper/` — helper classes (e.g., `Dialog.ts` wraps `window.dialog()` with Handlebars templating)
- `src/tpl/` — Handlebars templates (`.hbs` files, imported as text)
- `src/styles.css` — plugin CSS, loaded via `require('./styles.css')` in `init()`
- `types/` — ambient type declarations; `Types.ts` extends `Window` with IITC globals
- `plugin.json` — plugin metadata (name, id, category, author, entry point, download URL)

### IITC globals
The plugin relies on globals injected by IITC at runtime: `window.dialog()`, `IITC.toolbox`, `window.plugin.HelperHandlebars`, and the `VERSION` constant injected by iitcpluginkit. These are not imported — they are ambient globals.

### CI/CD
GitHub Actions (`.github/workflows/build.yml`) builds both HEAD (dev) and the latest git tag (prod), generates a changelog and GitHub Pages site. Releases are made by pushing a git tag.

## Code conventions

- **Filename casing**: PascalCase for all source files (enforced by `unicorn/filename-case`); exceptions for `*.d.ts`, `index*.ts`, `API*`, `*.schema.ts`, `*.spec.ts`
- **Arrow functions**: all functions must use arrow syntax (`prefer-arrow-functions/prefer-arrow-functions`)
- **No underscores in names** (`no-underscore-dangle`)
- TypeScript strict mode is enabled; `noUnusedLocals` is enforced
- Unused function parameters may be prefixed with `_` to suppress the lint rule

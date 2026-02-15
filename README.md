# Excalidraw Nuxt

A collaborative drawing application built with [Nuxt 4](https://nuxt.com/) and [Vue 3](https://vuejs.org/), inspired by and based on [Excalidraw](https://excalidraw.com/).

## Credits

This project is a Vue/Nuxt reimplementation inspired by [Excalidraw](https://github.com/excalidraw/excalidraw), the excellent open-source virtual whiteboard created by the Excalidraw team and contributors. The original Excalidraw source is used as a reference for feature parity and correctness, then adapted into idiomatic Vue composables and Nuxt conventions.

Thank you to the Excalidraw team for building such a well-designed, open-source drawing tool.

## Stack

- **Nuxt 4** (Vue 3.5+) with SSR disabled
- **Tailwind CSS v4**
- **TypeScript**
- **RoughJS** + **perfect-freehand** for canvas shape rendering
- **VueUse** for composables
- **pnpm** package manager

## Setup

Install dependencies:

```bash
pnpm install
```

## Development

Start the development server on `http://localhost:3000`:

```bash
pnpm dev
```

## Production

Build for production:

```bash
pnpm build
```

Preview the production build:

```bash
pnpm preview
```

## Testing

```bash
pnpm test            # Run all tests
pnpm test:unit       # Unit tests only
pnpm test:browser    # Browser tests only
```

## Linting & Type Checking

```bash
pnpm lint            # Run oxlint then eslint
pnpm typecheck       # Type-check with nuxi
```

## License

This project references the [Excalidraw](https://github.com/excalidraw/excalidraw) source code, which is licensed under the [MIT License](https://github.com/excalidraw/excalidraw/blob/master/LICENSE).

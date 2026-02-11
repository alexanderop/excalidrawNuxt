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
- **Bun** package manager

## Setup

Install dependencies:

```bash
bun install
```

## Development

Start the development server on `http://localhost:3000`:

```bash
bun dev
```

## Production

Build for production:

```bash
bun build
```

Preview the production build:

```bash
bun preview
```

## Testing

```bash
bun test            # Run all tests
bun test:unit       # Unit tests only
bun test:browser    # Browser tests only
```

## Linting & Type Checking

```bash
bun lint            # Run oxlint then eslint
bun typecheck       # Type-check with nuxi
```

## License

This project references the [Excalidraw](https://github.com/excalidraw/excalidraw) source code, which is licensed under the [MIT License](https://github.com/excalidraw/excalidraw/blob/master/LICENSE).

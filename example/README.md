# Playground

A local Parcel app to try the library during development.

```bash
yarn build           # build the library at the repo root first
cd example
yarn install
yarn start           # http://localhost:1234
```

The example consumes the library via `link:..`, so a rebuild of the root package is needed after any source change (or run `yarn dev` at the root in watch mode).

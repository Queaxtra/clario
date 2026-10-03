# clario

A free, in-browser background remover. AI cutouts run entirely on your device with WebGPU or WebAssembly, so photos never leave the browser. Batch ready, no signup.

## prerequisites

- [Bun](https://bun.sh/) (latest)
- A modern browser with WebGPU or WebAssembly SIMD (for running the model)

## install

```bash
git clone https://github.com/Queaxtra/clario
cd clario
bun install
```

## develop

```bash
bun run dev
```

## build

```bash
bun run build
```

## checks

```bash
bun run check    # svelte-check types and diagnostics
bun run lint     # prettier + eslint
bun run format   # prettier --write
```

## how it works

- Background removal runs in a Web Worker with [transformers.js](https://github.com/huggingface/transformers.js) and the `briaai/RMBG-1.4` model.
- The execution provider (`webgpu` / `wasm`) and precision (`q8` / `fp16` / `fp32`) are picked from device capabilities and can be overridden in the developer panel; the choice is remembered in `localStorage`.
- Options include mask mode, cutoff, gamma, edge feather, tiling, output format (PNG / WebP / JPEG), and background replacement with a color, gradient, or image.
- `/api/image` is a same-origin, SSRF-guarded proxy used only to fetch remote images that do not allow CORS. There is no server-side inference.

## license

MIT, see [LICENSE](LICENSE).

The bundled model (BRIA RMBG-1.4) is source-available and non-commercial, with its own license: https://huggingface.co/briaai/RMBG-1.4

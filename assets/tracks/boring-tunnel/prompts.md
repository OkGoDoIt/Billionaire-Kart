# Boring Tunnel: generated art

## Painted horizon (`assets/backdrops/boring-tunnel.webp`)

The checklist's generation route is `tools/gen-image.mjs` (OpenAI), but no
OpenAI key exists on the fleet VM (no `.env` in any clone), so this strip was
generated with Muse's media pipeline from the checklist's verbatim prompt,
then cut like the International Waters strip: the white ground was keyed out
(flood fill from the borders, so whites inside the neon signs survive), and
the skyline was laid round a 4096x512 transparent strip in four passes
(squeezed to ~0.43 of its height-scaled width, flopped repeats between).
`backdrop: { img, top: 9, bottom: -0.3 }` in the track def. To regenerate at
full quality with the repo tool once a key is available:

```
node tools/gen-image.mjs --size 3072x1024 --quality high --background transparent --format png --out bt-backdrop.png --prompt "<below>"
```

Prompt (verbatim from PR #223 / issue #234, item 4):

> desert boomtown skyline at golden hour, casino towers, a giant pyramid hotel, a half-built tower crane, art-deco casino signs, warm sandstone and neon, flat vector illustration, transparent background, wide panorama

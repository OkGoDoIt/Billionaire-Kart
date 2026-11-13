# Singularity Speedway: generated art

Made with `node tools/gen-image.mjs` (model `gpt-image-2.6-sunburst`, quality high), then converted as noted. Look at every result before using it.

## Backdrop: `assets/backdrops/singularity-speedway.webp`

`--size 3072x1024 --background transparent`

> A very wide panoramic backdrop strip of deep space for a stylized kart racing video game, on a fully TRANSPARENT background. Painted: huge soft swirling nebula clouds in magenta, violet and electric cyan, a bright spiral galaxy, scattered glowing star clusters, and long thin ribbons of glowing data streams (rows of tiny luminous cyan and pink dots) arcing gracefully across the nebula. Along the bottom edge, a distant skyline of floating futuristic server-tower megastructures with tiny lit windows, silhouetted in deep indigo with glowing cyan and pink edge lights. Clean bold shapes, painterly 3D-animated-film look, bright and saturated, Nintendo-like, not photoreal. Everything that is not nebula, galaxy, data stream or structure is transparent (no black fill, no solid sky). The left and right edges are soft and simple so the strip can be mirrored and tiled. No text, no letters, no logos, no planets, no people, no vehicles.

The model returned an opaque cloud-shaped blob, so the alpha is rebuilt from brightness (dark sky turns transparent and the stars show through) and the faded side edges are cropped so the mirrored copies meet:

```bash
magick pano.png -crop 2952x1024+60+0 +repage -write mpr:src +delete \
  \( mpr:src -alpha extract -blur 0x16 \) \( mpr:src -alpha off -colorspace gray -level 4%,40% \) \
  -compose multiply -composite -write mpr:a +delete mpr:src -alpha off mpr:a -compose CopyOpacity -composite \
  -resize 3072x1024\! p2.png
magick p2.png -channel RGB -evaluate multiply 0.8 +channel -modulate 100,90 -resize 2304x -quality 78 -define webp:alpha-quality=80 singularity-speedway.webp   # pushed back a little so signs and karts stay on top
```

## Server rack face: `rack.webp` (the floating monoliths and the capabilities tower)

`--size 1024x1536`, then `magick rack.png -resize 512x768 -quality 82 rack.webp`

> A seamless tileable texture of the front of a futuristic server rack tower for a stylized kart racing video game: a dark navy-indigo metal face divided into stacked blade-server units, each with rows of tiny glowing status LEDs in cyan, magenta and gold, thin glowing cyan seams between units, small vent grilles, a few brighter glowing light bars. Flat orthographic front view, evenly lit, no perspective, no shadows at the edges, fills the whole frame edge to edge, tiles seamlessly top to bottom. Clean bold shapes, painterly 3D-animated-film look, Nintendo-like, not photoreal. No text, no letters, no logos.

## Dyson swarm panel: `panel.webp` (mapped onto hexagons round the star)

`--size 1024x1024`, then `magick panel.png -resize 512x512 -quality 82 panel.webp`

> A square texture tile of one hexagonal-cell solar and compute panel from a Dyson sphere megastructure, for a stylized kart racing video game: deep blue photovoltaic cells in a neat grid, framed by a bright glowing cyan border, with thin magenta circuit traces and a few small gold heat-sink fins. Flat orthographic front view, evenly lit, fills the whole frame edge to edge. Clean bold shapes, painterly 3D-animated-film look, Nintendo-like, not photoreal. No text, no letters, no logos.

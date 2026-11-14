# Davos Circuit backdrop (`davos.webp`)

Two strips from `tools/gen-image.mjs --size 3072x1024 --quality high --background transparent --format png`,
joined side by side (A then B) with 256 px alpha crossfades at both seams (the second seam wraps B's right
edge onto A's left), then `magick strip.png -resize 4096x1024! -quality 72 -define webp:alpha-quality=70 -define webp:method=6 davos.webp`.
The hero peak sits at u = 0.325 of the strip; `backdrop.rot` in `src/tracks/davos.js` turns it to face south.

**A (the hero peak):**

> A very wide horizon backdrop strip for a stylized kart racing video game, on a fully TRANSPARENT background. Only the distant landscape is painted: a grand ring of snow-covered Swiss Alps at golden hour, with one tall dramatic pyramid-shaped peak, jagged snowy ridges in three layered depths (nearest ridge darker blue-violet, farthest palest), glaciers and snowfields, sunlit faces glowing warm peach and rose alpenglow, shadowed faces cool lavender blue, a few dark pine forests along the lowest foothills. Clean bold shapes, painterly 3D-animated-film look, saturated but soft. The landscape occupies the lower 60 percent with an irregular natural silhouette of peaks along its top edge; everything above it is transparent (no sky, no clouds, no sun). The left and right edges are simple so the strip can be mirrored and tiled. No text, no people, no vehicles, no buildings, no foreground objects.

**B (the glacier massif, no single peak):**

> A very wide horizon backdrop strip for a stylized kart racing video game, on a fully TRANSPARENT background. Only the distant landscape is painted: a long range of snow-covered Swiss Alps at golden hour with NO single dominant peak: a broad glaciated massif with several rounded and jagged summits of similar height, a wide glacier tongue in the middle, and jagged snowy ridges in three layered depths (nearest ridge darker blue-violet, farthest palest). Sunlit faces glow warm peach and rose alpenglow, shadowed faces cool lavender blue, a few dark pine forests along the lowest foothills. Clean bold shapes, painterly 3D-animated-film look, saturated but soft. The landscape occupies the lower 55 percent with an irregular natural silhouette of peaks along its top edge; the silhouette is LOW and simple at the far left and far right edges. Everything above it is transparent (no sky, no clouds, no sun). No text, no people, no vehicles, no buildings, no foreground objects.

Seam crossfade (per seam, L = left strip's last 256 columns, R = right strip's first 256):

```
magick L.png R.png -channel RGB -fx "(u*u.a*(1-i/w)+v*v.a*(i/w))/max(0.0001,u.a*(1-i/w)+v.a*(i/w))" +channel -alpha off rgb.png
magick L.png R.png -fx "u.a*(1-i/w)+v.a*(i/w)" -alpha off -colorspace gray alpha.png
magick rgb.png alpha.png -alpha off -compose CopyOpacity -composite seam.png
```

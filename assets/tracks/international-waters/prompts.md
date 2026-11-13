# International Waters: generated art

## Painted horizon (`assets/backdrops/international-waters.webp`)

Generated with `node tools/gen-image.mjs --size 3072x1024 --quality high --background transparent --format png --out iw-backdrop.png --prompt "<below>"` (model `gpt-image-2.6-sunburst`), then cut into its three landmasses and laid round a 4096x512 strip so nothing is stretched once the sky wraps it 360 degrees (`top: 9.4, bottom: -0.35` in the track's `backdrop`):

```
magick iw-backdrop.png -crop 1060x565+0+300 +repage -resize 200x512! c1.png     # the tower island
magick iw-backdrop.png -crop 1400x565+1000+300 +repage -resize 265x512! c2.png  # the low islets
magick iw-backdrop.png -crop 742x565+2330+300 +repage -resize 140x512! c3.png   # the casino cliffs
magick -size 4096x512 xc:none c1.png -geometry +300+0 -composite c2.png -geometry +1300+0 -composite \
  c3.png -geometry +2250+0 -composite \( c1.png -flop \) -geometry +3300+0 -composite \
  \( c2.png -flop \) -geometry +3700+0 -composite \( c3.png -flop \) -geometry +850+0 -composite \
  -quality 88 -define webp:alpha-quality=92 international-waters.webp
```

Prompt:

> A very wide horizon backdrop strip for a stylized kart racing video game, on a fully TRANSPARENT background. Only the distant landscape is painted: an offshore tax-haven archipelago seen across open sea. Left third: a steep green rocky island crowded with gleaming white and cream apartment towers, terraced villas, and a few tall glass skyscrapers stepping up its slopes, a tiny lighthouse on the point. Middle: low distant islands with palm groves and a long white sandy beach, a few small white superyachts far away at anchor as tiny shapes. Right third: dramatic sea cliffs and a rocky headland with a castle-like white casino building on top. Bright late-morning Mediterranean light, warm sun from the left, soft atmospheric blue haze on the farthest shapes, saturated but natural colors. Clean bold shapes, painterly 3D-animated-film look. The landscape occupies the lower 45 percent with an irregular silhouette along its top edge; everything above it is transparent (no sky, no clouds, no sun). The bottom edge is a straight horizon line where the sea would meet it. The left and right edges are simple so the strip can be mirrored and tiled. No text, no people, no vehicles, no foreground objects.

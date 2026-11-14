# Datacenter Dash generated art

Made with `node tools/gen-image.mjs` (model `gpt-image-2.6-sunburst`), then `magick in.png -resize 1024x683 -quality 84 out.webp`.

## rack-front.webp

`--size 1536x1024 --quality high`

> Flat orthographic front view texture of four identical server rack cabinets standing side by side, filling the whole image edge to edge with no background, for a stylized bright Nintendo-style kart racing game. Each cabinet is a tall dark charcoal frame filled with stacked horizontal server units: alternating 1U and 2U blades with tiny perforated vent grilles, small round status lights in green, cyan and amber, a few drive bays, thin colorful patch cables (yellow, blue, magenta) looping neatly between units, and one small blank rounded badge plate on some units. Clean bold shapes, slightly cartoony, soft even lighting, no perspective, no shadows on the floor, no text, no logos, no people. The left and right edges must tile seamlessly.

Used by `rackKit()` in `src/tracks/datacenter-dash.js`: drawn into the cabinet band of the shared rack texture (one repeat = 4.8 m of rack); the blinking LED frames are extracted from its green, cyan, and amber status lights.

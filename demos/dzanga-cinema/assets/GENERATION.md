# Version 2 asset provenance

## Diffuse-light forest base

Files: `sangha-neutral.webp` (1672 × 941) and `sangha-neutral-small.webp` (1008 × 568).

Generated with the built-in OpenAI image-generation tool on 2026-09-25, editing the original `sangha-forest.webp`. The original sunlit assets are retained for comparison, but are no longer requested by the scene. The selected generated PNG was encoded to WebP at quality 88 (full) and 82 (small); compression level 6. No creative postprocessing was applied during conversion.

Source output: `exec-f5fe1e68-d0fe-4228-b905-685cb347ccf6.png`.

Full edit prompt:

```text
Use case: lighting-weather.
Asset type: diffuse-light base plate for real-time relighting.
Input image: edit target — the exact supplied Congo Basin rainforest photograph.
Change ONLY illumination and the overexposed sun opening. Preserve exact camera, crop, aspect ratio, scene geometry and image registration: every trunk, buttress root, liana, leaf mass, stone, stream bank, water boundary and the fallen log at lower right stays in exactly the same place and shape.
Remove the visible sun and bright golden sun opening at top center-right. Remove ALL directional light shafts/god rays and bright golden reflection stripes on water. Replace the sun opening with believable distant leafy canopy and diffuse gray-green sky glimpses, with no isolated bright orb or blown-out patch.
Relight the ENTIRE scene in soft even overcast skylight: diffuse neutral forest light, no direct sunlight, no strong directional cast shadows or warm patches. Preserve wet botanical texture, atmospheric depth and rich readable midtones. No light shafts baked into the mist. Water remains dark tea-colored with dim neutral green canopy reflections and low-contrast ripples, NO fixed bright reflection band. Lush natural color, not monochrome, not nighttime, not black.
This plate will receive moving sunlight in software: critically no fixed sun, fixed sunbeams or intense fixed specular highlights should remain.
Do not add/remove trees, roots, rocks, or logs. No animals, people, text or watermark. Preserve exact composition and geometry; only change illumination and fill the small glaring sun opening.
```

## Foreground bough

File: `foreground-bough.webp`

Use case: photorealistic-natural.
Asset type: transparent foreground foliage cutout for compositing and animating over an existing Congo Basin rainforest photograph.
Primary request: a single slim woody rainforest bough with many small glossy dark-green elliptical broadleaf leaves, realistic wet leaf texture and delicate pointed tips. The branch enters from the UPPER RIGHT corner and extends diagonally left and slightly down across the upper half. Several graceful secondary twigs with different-sized leaf clusters hang down. The thick cut end continues outside the upper right edge. Leaves have rich shaded green upper surfaces, occasional subtle warm morning rim light from above, softly backlit veins, plausible natural arrangement and small imperfections. This is close foreground vegetation, lush but airy enough to see through between leaves.
Composition: landscape 3:2 canvas. Foliage should occupy upper 65 percent and rightmost75 percent only. Lower third and lower-left half must be mostly empty alpha. Full natural branch visible except attachment at upper right edge. Photographic realism, forest subdued light, no studio glow.
Constraints: genuinely transparent alpha background. No background scene, no black or white backdrop, no checkerboard, no ground, no pot, no extra disconnected leaves, no flowers, no fruit, no birds, no giant monstera leaves, no bamboo, no palm, no pine, no text, no watermark, no border. Transparent areas between individual leaves. The cutout should be suitable for small wind animation anchored at the top-right attachment.

Original assets generated for this project using the built-in OpenAI image-generation tool. WebP encoding preserves alpha. No animal footage, recordings or third-party artwork are embedded.

## African grey parrot atlas

File: `grey-parrot-atlas.webp`

Use case: stylized-concept, photorealistic wildlife game sprite asset.
Asset type: a strictly aligned 2 by 2 sprite atlas on a genuinely transparent alpha background, square canvas preferably 2048x2048.
Primary request: the SAME African grey parrot (Psittacus erithacus) in four animation poses, photographic realism, grey scalloped feathers, red short tail, black hooked beak, pale face, realistic anatomy. It will be composited SMALL into a Congo Basin rainforest photograph, not used as an illustration poster.
Composition: four equally sized square cells, 2 columns and 2 rows, no drawn cell borders. All birds face RIGHT in a near-side view. The bird torso center occupies exactly the center of each cell. Consistent scale across all 3 flight poses, identical torso width; full wings and tail fit well inside each cell with at least 8% empty alpha padding. Identical soft forest daylight lighting from upper right, no rim halos, no shadows on background.
Top left cell: flight pose with wings high raised in upward stroke, torso roughly horizontal, feet tucked.
Top right cell: same flying bird with wings extended at mid stroke, torso identical position.
Bottom left cell: same flying bird with wings lowered at bottom of stroke, torso identical position.
Bottom right cell: same bird perched upright, wings folded, both feet at bottom of body, looking right. No perch, no branch, no props.
Constraints: EXACTLY four isolated bird cutouts; no extra birds; NO background, no checkerboard pattern, no ground, no branches, no text, no labels, no border, no watermark. Preserve real transparent space between cells and crisp fine feather alpha edges. Natural subdued grey plumage and small red tail; not a macaw. Do not stylize as cartoon or vector.

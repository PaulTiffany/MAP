# Dzanga · the listening forest

A fictional cinematic forest study inspired by the humid lowland forests of the Sangha region, in Central Africa. This is an original generated scene, not documentary footage or a reconstruction of a named location. It does not depict or reproduce BaAka people, art, music, or cultural practices.

## Image provenance

Generated with the built-in OpenAI image-generation tool for this project. No reference-channel footage or images are used. The user supplied DreamyCinematic68 as a broad atmosphere reference; direct inspection of the channel was unavailable. The original generation prompt is preserved below, and the current neutral edit is recorded in [Version 2 asset prompts](assets/GENERATION.md).

## Current lighting foundation

The runtime scene uses `assets/sangha-neutral.webp` and its smaller responsive alternative, `assets/sangha-neutral-small.webp`. The generated edit preserves the forest composition while replacing the illustrated sun, directional beams and golden highlights with diffuse overcast illumination. This gives the browser's changing solar field a consistent base: time-dependent rays, dapple, color, exposure and water highlights are supplied by the renderer.

The earlier `sangha-forest.webp` and `sangha-forest-small.webp` remain available for provenance, but are not requested by the current page. The neutral image still has diffuse shading, occlusion and water reflections; it is not an albedo map. The scene remains an artistic 2.5D approximation, without ray tracing or geometrically accurate shadow casting.

## Original sunlit plate — generation prompt

Use case: photorealistic-natural.
Asset type: ultra-wide cinematic background plate for a full-screen living still on a website; generate a single landscape image, 16:9, preferably 2560x1440 or higher.
Primary request: an exquisitely cinematic, deeply immersive Congolian / Central African lowland rainforest inspired by the Dzanga-Sangha landscape. A fixed camera at human eye height on a secluded forest stream bank at first light after rain.
Scene: towering old-growth broadleaf trees with huge sculptural buttress roots, long woody lianas, a dense layered green canopy, many small wet leaves, delicate ferns and understory foliage. A shallow narrow dark tea-colored stream occupies the lower central third and recedes gently toward a luminous misty opening in the center distance. Low irregular earthy banks, immersed roots, fallen branches, a few wet river stones, natural quiet water reflections. Giant trunks frame the sides; darker foreground foliage at the outer corners; distant trunks dissolve into fine mist. The stream should have a clean visible surface in the lower middle to animate with subtle ripples.
Style: photorealistic high-end nature cinematography with dreamy atmospheric depth, tactile botanical detail and incredible scale, nuanced restrained film color. Organic and richly detailed rather than polished fantasy illustration. 28mm lens, deep focus, carefully exposed rich shadows that retain visible detail.
Lighting: soft golden early daylight filters from the upper center-right through the canopy; visible delicate shafts of sunlight in humid air; silvery pale jade mist in distant layers; warm patches on damp roots and leaves. Deep forest greens, warm brown bark, silver-green light. Most of the image should remain legible, only outermost foreground corners dark. Quiet, intimate, enveloping, timeless.
Composition: wide horizontal immersive panorama, depth carried by the stream and repeated trunks, center unobstructed; enough foliage continues outside frame for a gentle 3 percent overscan. Not an overhead view.
Constraints: Congo Basin humid broadleaf rainforest, no pine trees, no European temperate woodland, no mountains, no bamboo grove, no manicured garden, no tropical beach, no waterfalls, no huts, no people, no animals, no architecture, no lanterns, no boats, no fantasy glowing flowers, no dominant giant monstera leaves. No text, labels, logos, signatures, frames or watermarks. One cohesive photograph-like scene, not a collage.

## Landscape reference

- [UNESCO: Sangha Trinational](https://whc.unesco.org/en/list/1380/) — humid tropical forest, wetlands and forest openings across Cameroon, the Central African Republic and the Republic of Congo.
- See the existing [cultural grounding](demos/dzanga/CULTURAL_GROUNDING.md) for the project's representation boundaries.

## Movement

Stable trunks and roots anchor the frame. Version 2 makes water refraction and highlights, low mist, wind-driven leaf groups and foreground foliage independently visible. A generated African grey parrot atlas supports perched and flying actors. [Additional asset prompts](assets/GENERATION.md) record that generation. This is a 2.5D living image, not a reconstructed 3D forest.

The [replication methodology](methodology.html) explains source-space regions, lighting approximations, actor registration, shared time, audio event scheduling, performance budgets and verification.

## Sticker-book study

The forest is now the [MAP home scene](https://paultiffany.github.io/MAP/). Reusable animation assets, placed instances, scene paths and decision policy are being separated so the same image treatment can support other places. “Sticker” means a composited object with an anchor, scale, depth and named actions; it does not require an illustrated outline or a paper-cutout appearance.

The existing generated plate, bough and parrot atlas remain the visual foundation. This pass adds a photographic-style transparent leaf cutout, generated with the built-in image tool and compressed to a 512 × 512 WebP (42,566 bytes). Its full prompt is in the [asset record](assets/GENERATION.md). Ripples and the small butterfly are procedural. A leaf can tumble, touch water and float; a bird can follow a named flight path and call. The aim is distinct, legible behaviors, not applying more parallax to the entire still.

Reuse an asset only after reauthoring its placement, light treatment and movement constraints for the new scene. The present renderer has scene-specific masks and no general geometric occlusion or shadow system. The [runtime contract](lib/sticker-world/README.md) explains what can be directed today and what remains future work.

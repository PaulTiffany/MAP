# MAP motion model

The MAP explorer treats navigation and explanation as one continuous spatial system.

- At the center, wheel, trackpad, or drag input moves the camera continuously along the dominant axis.
- Releasing the gesture settles toward the nearest authored lane or returns to MAP.
- Inside a lane, native vertical scrolling is preserved.
- Scene graphics are scrubbed from each step's actual viewport progress rather than running on autonomous loops.
- Transfer particles, membrane separation, viability regions, the MAD→MAP inversion, application reveal, lineage assembly, and the Lean curve all respond to scroll position.
- `prefers-reduced-motion` is respected.

This file exists only to make the interaction intent explicit for future maintainers and agents.

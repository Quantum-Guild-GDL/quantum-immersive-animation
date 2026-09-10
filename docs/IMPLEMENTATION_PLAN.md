# Implementation plan — Quantum Cat Journey

## Visual-language findings

The reference frames establish a near-black navy field with restrained cyan, violet and magenta accents. Fine particles, low-contrast orbital curves, translucent wireframes and large areas of negative space make the system feel scientific and spatial rather than decorative. The astronaut cat already shares the violet rim light and dark tonal range, so it can be integrated with low opacity, `screen` compositing and environmental occlusion instead of appearing as a bright overlay.

## Plan

1. Keep roughly 90% of the loop focused on the quantum field. The cat begins as an uncertain peripheral tail sighting and never becomes a UI mascot.
2. Build the experience as a virtual canvas. A separate screen configuration defines any number of output regions, their sizes, positions, orientations and transition delays.
3. Split the runtime into configuration, timing, mapping, environment, cat and effect modules. Keep the browser client dependency-free and synchronized with the system clock.
4. Stage an atmospheric sequence: empty field, tail glimpse, zero-gravity crossing, sphere reaction, 1.3-second superposition, particle paw prints, restrained pumpkin encounter and delayed finale.
5. Use a single debug flag to reveal canvas bounds, screen IDs, trajectories and timestamps. Production mode contains no website-like controls.
6. Verify module syntax, local HTTP delivery, configured output routes, asset loading and timeline calculations before publishing the branch.

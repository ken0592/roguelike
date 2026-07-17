# FOXBOUND Codex Asset Pack

This pack is organized for code-friendly use.

## Structure
- `assets/<category>/<entity>/frames/` : one PNG per extracted frame
- `assets/<category>/<entity>/spritesheet.png` : rebuilt transparent spritesheet
- `assets/<category>/<entity>/meta.json` : row/column layout and frame size
- `manifest.json` : list of all packaged entities

## Notes
- Backgrounds were removed and frames were centered onto a fixed transparent canvas per entity.
- Rows and columns preserve the original visual order from the source sheet.
- Animation semantics are not guaranteed for every entity; some sheets mix idle / movement / attack / hurt in different orders. Use the row/column layout as the ground truth.
- This is a starter pack for prototyping in Codex / web games, not a final hand-cleaned production asset set.

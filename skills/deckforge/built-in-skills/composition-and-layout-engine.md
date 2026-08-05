# Composition and Layout Engine

Use this workflow for every generated or substantially redesigned deck.

## Why this workflow is mandatory

A layout ID is not enough. If blocks still receive unrelated absolute coordinates, the slide can overlap, drift, or become visually sparse. DeckForge therefore uses semantic slots and deterministic constraints before optional freeform positioning.

## Step 1 — Create a slide composition brief

For each slide record:

- slide role and claim-led title;
- audience action or takeaway;
- primary content type;
- secondary content type;
- density: low, medium, or high;
- focal element;
- selected layout ID and variant;
- why the layout matches the content;
- responsive reading order.

## Step 2 — Load the layout contract

Read `assets/layout-manifest.json`. Each layout contains:

- a 12×8 semantic grid;
- named slots;
- allowed block types;
- content budgets;
- responsive stacking order;
- overlap and whitespace policies.

Use the layout exactly as a constraint model. Do not invent large frame values first and attach a layout label afterward.

## Step 3 — Bind blocks to slots

Every normal block receives a `slot` value. Examples:

- `kicker`
- `title`
- `subtitle`
- `primary`
- `secondary`
- `visual`
- `evidence`
- `caption`
- `footer`

A slot may contain a small stack of related blocks when the contract allows it. Preserve internal spacing with flow layout rather than hand-authored y coordinates.

## Step 4 — Resolve geometry

The renderer converts normalized grid slots into canvas rectangles using canvas size, safe margin, row/column gaps, and the layout variant.

Use CSS Grid/Flexbox or an equivalent constraint solver inside each slot. Keep absolute positioning only for:

- freeform user-dragged blocks;
- diagram nodes inside a diagram's own slot;
- annotation arrows and highlights;
- decorative/background elements marked non-content.

## Step 5 — Apply content budgets

Enforce each slot's `contentBudget` from the layout contract. Use layout and block budgets to catch likely fit issues before rendering. Budgets include:

- maximum title lines;
- maximum title characters;
- body word/line targets;
- bullet count and words per bullet;
- maximum metric/card count;
- minimum visual region size;
- maximum table rows/columns;
- caption/source allowance.

When over budget, rewrite, split, move details to notes, or choose a denser layout. Do not reduce font size below the theme's presentation minimum.

The editor must surface budget warnings per slot so authors and agents catch overflow before rendering. Treat these as indicators to shorten, split, or change layout, not as license to ignore the budget.

## Step 6 — Run collision and balance checks

Run `scripts/audits/audit_deck_layout.py`.

Treat these as blocking:

- content outside safe margins;
- overlap between title/header slots and content/visual slots;
- overlap greater than the allowed threshold;
- zero-size or negative-size frames;
- freeform content without explicit `positionMode: freeform`;
- high-risk text overflow;
- slide occupied area outside the layout's whitespace range.

Decorative backgrounds and intentional diagram internals may opt out explicitly.

## Step 7 — Vary rhythm across the deck

Do not use the same two-column or card-grid composition repeatedly. A professional deck usually alternates among:

- opening/statement slides;
- visual/evidence slides;
- process/sequence slides;
- comparison/decision slides;
- data/technical slides;
- summary/action slides.

Variation must still share the same typography, grid, palette, and shape language.

## Step 8 — Verify narrow behavior

Use slot order to produce semantic stacking. Keep the title first, evidence before commentary where appropriate, and captions/sources attached to their visual. Do not simply scale a complex desktop canvas until the text becomes unreadable.

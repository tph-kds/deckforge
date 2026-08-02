# Catalog Reference

| Catalog | Purpose | Inventory in v3 |
|---|---|---:|
| `template-manifest.json` | Narrative recipes and slide-role sequences | 48 |
| `theme-manifest.json` | Visual tokens, typography, chart palettes, and anti-patterns | 60 |
| `layout-manifest.json` | Semantic 12×8 composition grids and named slots | 36 |
| `block-manifest.json` | Structured editable content types | 33 |
| `animation-manifest.json` | Serializable transitions and build patterns | 24 |
| `interaction-manifest.json` | Audience-facing interaction capabilities | 26 |
| `presenter-control-manifest.json` | Presenter and speaker controls | 20 |
| `export-manifest.json` | Export targets and fidelity contracts | 6 |
| `delivery-profile-manifest.json` | Truthful output profiles and acceptance rules | 4 |
| `presentation-archetype-manifest.json` | Audience- and purpose-aware presentation systems | 12 |
| `motion-profile-manifest.json` | Coherent motion behavior by presentation context | 8 |
| `editor-feature-manifest.json` | Required editor surfaces, commands, and states | product contract |
| `shortcut-help-manifest.json` | Editor and presenter shortcuts plus discoverability | interaction contract |
| `toolbar-manifest.json` | Editor commands, contexts, shortcuts, and status | 46+ commands |
| `quality-rubric.json` | Blocking checks and weighted quality dimensions | pass threshold 88 |

Agents must select from these catalogs before inventing one-off behavior. New catalog items require a stable ID, explicit behavior, content and accessibility constraints, reference validation, and a representative example.

## Layout contract

Every layout composition contains:

- a 12×8 grid
- named slots with non-overlapping geometry
- required and optional slots
- allowed block types
- content budgets
- responsive reading order
- collision and whitespace policies

The layout ID is executable composition metadata, not a decorative label.

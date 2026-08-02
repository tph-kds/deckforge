# Catalog Reference

| Catalog | Purpose | Minimum inventory in v2 |
|---|---|---:|
| `template-manifest.json` | Narrative recipes and slide-role sequences | 48 |
| `theme-manifest.json` | Visual tokens, typography, chart palettes, anti-patterns | 60 |
| `layout-manifest.json` | Semantic slide-region recipes | 36 |
| `block-manifest.json` | Structured editable content types | 33 |
| `animation-manifest.json` | Serializable transitions and build patterns | 24 |
| `interaction-manifest.json` | Audience-facing interaction capabilities | 26 |
| `presenter-control-manifest.json` | Presenter and speaker controls | 20 |
| `export-manifest.json` | Export targets and fidelity contracts | 6 |
| `toolbar-manifest.json` | Editor commands, contexts, shortcuts, and status | 46+ commands |
| `quality-rubric.json` | Blocking checks, weighted quality dimensions, anti-slop detection | 9 dimensions |

Agents should select from these catalogs first. A new catalog item requires a stable ID, clear behavior, accessibility and security rules, and validation of all references.

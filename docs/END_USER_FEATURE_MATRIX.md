# End-User Feature Matrix

This matrix defines what a generated DeckForge product should expose to a real presentation author and presenter. Capabilities must not be advertised when only placeholder UI exists.

## Authoring workspace

| Capability | Minimum behavior | Completion evidence |
|---|---|---|
| Slide rail | Select, add, duplicate, delete, and reorder slides | state changes and rerender are visible |
| Canvas | Stable 16:9 composition with semantic layout slots | no clipping or collision at canonical viewport |
| Toolbar | Insert and format supported block types | commands mutate DeckProject data |
| Inspector | Edit selected slide or block properties | changes update immediately and persist |
| Theme picker | Change typography, colors, and tokens coherently | entire deck updates through theme tokens |
| Layout picker | Rebind content into a compatible semantic layout | blocks remain readable after switch |
| Text tools | Add and edit title, body, labels, and captions | content budgets and overflow handling apply |
| Media tools | Upload, replace, crop/fit, caption, and add alt text | asset data persists and renders safely |
| Notes | Edit speaker notes per slide | presenter or speaker view can consume notes |
| History | Undo and redo command-level changes | history excludes ephemeral selection state |
| Save state | Show saving, saved, offline, and error states | reload restores the last successful state |
| Shortcut help | Open from toolbar and `?` | searchable or grouped shortcut list appears |

## Presenter workspace

| Capability | Minimum behavior |
|---|---|
| Clean audience surface | no editing chrome or private notes |
| Navigation | next, previous, first, last, and direct slide selection |
| Fullscreen | enter and exit without losing current slide |
| Overview | visual slide grid with keyboard selection |
| Build steps | advance fragments or staged reveals before changing slide |
| Progress | current slide and deck progress are visible but unobtrusive |
| Blackout | temporary blank screen during discussion |
| Speaker support | notes, timer, next-slide preview when implemented |
| Deep links | route or URL can restore the intended slide |
| Reduced motion | transitions collapse to accessible alternatives |
| Shortcut guidance | `?` or visible help control explains controls |

## Content and visual systems

| System | Required characteristics |
|---|---|
| Layouts | semantic slots, clear hierarchy, responsive order, density limits |
| Themes | tokenized typography, palette, surfaces, charts, and contrast rules |
| Templates | archetype-aware narrative sequences, not only isolated slide screenshots |
| Blocks | typed data model and renderer contract for text, media, charts, diagrams, tables, code, and citations |
| Motion | named profiles, restrained defaults, editor preview, reduced-motion fallback |
| Assets | provenance, alt text, fit/crop rules, loading/error states |
| Accessibility | keyboard access, focus visibility, semantic labels, contrast, zoom resilience |

## Delivery profiles

| Profile | Intended output |
|---|---|
| `editable-deck` | full editor and separate presenter; default for ordinary creation requests |
| `presenter-only` | polished read-only presentation runtime with no false editor claims |
| `embedded-deck` | presentation optimized for host-page embedding and constrained navigation |
| `design-system-package` | reusable templates, themes, components, and schema integration for an existing product |

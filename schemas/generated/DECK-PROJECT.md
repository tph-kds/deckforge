# DeckProject 2.1 — Generated Reference

> GENERATED FILE — do not edit by hand. Derived from `schemas/deck-project.schema.json`.

This reference is produced by `scripts/generate/generate_schema_artifacts.py` from the canonical JSON Schema.

## Root document

- `schemaVersion`: 2.1
- Required properties: `schemaVersion`, `meta`, `canvas`, `theme`, `presentation`, `editor`, `slides`, `publish`, `experience`

| Property | Type | Required |
|---|---|---|
| `assets` | `…` | no |
| `canvas` | `object` | yes |
| `editor` | `object` | yes |
| `experience` | `object` | yes |
| `meta` | `object` | yes |
| `presentation` | `object` | yes |
| `publish` | `object` | yes |
| `schemaVersion` | `…` | yes |
| `shortcuts` | `object` | no |
| `slides` | `…` | yes |
| `sources` | `…` | no |
| `theme` | `object` | yes |

## Defined types

### `Animation`
- Schema type: `object`
- Properties:
  - `delayMs` (required: no)
  - `durationMs` (required: no)
  - `easing` (required: no)
  - `id` (required: yes)
  - `order` (required: no)
  - `reducedMotionFallback` (required: no)
  - `trigger` (required: no)

### `Asset`
- Schema type: `object`
- Properties:
  - `alt` (required: no)
  - `credit` (required: no)
  - `durationMs` (required: no)
  - `focalPoint` (required: no)
  - `height` (required: no)
  - `id` (required: yes)
  - `integrity` (required: no)
  - `kind` (required: yes)
  - `license` (required: no)
  - `mimeType` (required: no)
  - `posterSrc` (required: no)
  - `src` (required: yes)
  - `transcriptSrc` (required: no)
  - `width` (required: no)

### `Autoplay`
- Schema type: `object`
- Properties:
  - `enabled` (required: yes)
  - `intervalMs` (required: no)
  - `loop` (required: no)
  - `pauseOnInteraction` (required: no)

### `Block`
- Schema type: `object`
- Properties:
  - `allowOverlap` (required: no)
  - `alt` (required: no)
  - `animation` (required: no)
  - `ariaLabel` (required: no)
  - `content` (required: no)
  - `data` (required: no)
  - `decorative` (required: no)
  - `fitPolicy` (required: no)
  - `frame` (required: no)
  - `groupId` (required: no)
  - `hidden` (required: no)
  - `id` (required: yes)
  - `locked` (required: no)
  - `positionMode` (required: no)
  - `resolvedFrame` (required: no)
  - `role` (required: no)
  - `slot` (required: no)
  - `sourceIds` (required: no)
  - `style` (required: no)
  - `type` (required: yes)

### `Canvas`
- Schema type: `object`
- Properties:
  - `aspectRatio` (required: yes)
  - `background` (required: no)
  - `grid` (required: no)
  - `height` (required: yes)
  - `layoutMode` (required: no)
  - `responsiveMode` (required: no)
  - `safeMargin` (required: no)
  - `width` (required: yes)

### `Editor`
- Schema type: `object`
- Properties:
  - `allowedBlockTypes` (required: no)
  - `assetLibrary` (required: no)
  - `autosave` (required: no)
  - `collaboration` (required: no)
  - `commandPalette` (required: no)
  - `comments` (required: no)
  - `enabled` (required: yes)
  - `guides` (required: no)
  - `history` (required: yes)
  - `layoutPicker` (required: no)
  - `notes` (required: no)
  - `persistence` (required: no)
  - `requiredZones` (required: no)
  - `routes` (required: no)
  - `saveStatus` (required: no)
  - `shortcutHelp` (required: no)
  - `sidePanel` (required: no)
  - `snapToGrid` (required: no)
  - `themePicker` (required: no)
  - `toolbar` (required: yes)

### `Embed`
- Schema type: `object`
- Properties:
  - `allow` (required: no)
  - `allowedOrigins` (required: no)
  - `enabled` (required: yes)
  - `messageProtocolVersion` (required: no)
  - `referrerPolicy` (required: no)
  - `responsive` (required: no)
  - `sandbox` (required: no)
  - `title` (required: no)

### `Experience`
- Schema type: `object`
- Properties:
  - `capabilities` (required: no)
  - `profile` (required: yes)
  - `routes` (required: no)
  - `surfaces` (required: yes)

### `Frame`
- Schema type: `object`
- Properties:
  - `h` (required: yes)
  - `rotation` (required: no)
  - `w` (required: yes)
  - `x` (required: yes)
  - `y` (required: yes)
  - `z` (required: no)

### `Id`
- Schema type: `string`

### `Interaction`
- Schema type: `object`
- Properties:
  - `action` (required: yes)
  - `ariaLabel` (required: no)
  - `audienceVisible` (required: no)
  - `fallback` (required: no)
  - `id` (required: yes)
  - `payload` (required: no)
  - `requiresNetwork` (required: no)
  - `targetId` (required: no)
  - `trigger` (required: yes)
  - `type` (required: yes)

### `LayoutBinding`
- Schema type: `object`
- Properties:
  - `blockIds` (required: yes)
  - `flow` (required: no)
  - `gap` (required: no)
  - `slot` (required: yes)

### `Meta`
- Schema type: `object`
- Properties:
  - `audience` (required: no)
  - `authors` (required: no)
  - `createdAt` (required: no)
  - `description` (required: no)
  - `id` (required: yes)
  - `language` (required: yes)
  - `objective` (required: no)
  - `slug` (required: yes)
  - `tags` (required: no)
  - `templateId` (required: no)
  - `title` (required: yes)
  - `updatedAt` (required: no)

### `NonEmptyString`
- Schema type: `string`

### `Presentation`
- Schema type: `object`
- Properties:
  - `autoplay` (required: no)
  - `controls` (required: no)
  - `deepLinks` (required: no)
  - `defaultBuilds` (required: no)
  - `keyboard` (required: yes)
  - `mode` (required: yes)
  - `motionProfileId` (required: yes)
  - `overview` (required: no)
  - `progress` (required: no)
  - `reducedMotion` (required: yes)
  - `speakerView` (required: no)
  - `touch` (required: no)
  - `transition` (required: yes)

### `Publish`
- Schema type: `object`
- Properties:
  - `allowDownload` (required: no)
  - `analytics` (required: no)
  - `customDomain` (required: no)
  - `embed` (required: yes)
  - `indexing` (required: no)
  - `slug` (required: no)
  - `versionPolicy` (required: no)
  - `visibility` (required: yes)

### `ScrollbarOverride`
- Schema type: `object`
- Properties:
  - `app-page` (required: no)
  - `asset-library` (required: no)
  - `default` (required: no)
  - `grid` (required: no)
  - `inspector` (required: no)
  - `modal` (required: no)
  - `presenter` (required: no)
  - `slide-list` (required: no)
  - `slide-stage` (required: no)
  - `speaker-notes` (required: no)
  - `theme-library` (required: no)

### `Shortcuts`
- Schema type: `object`
- Properties:
  - `editorPreset` (required: no)
  - `helpEnabled` (required: no)
  - `helpKey` (required: no)
  - `overrides` (required: no)
  - `presenterPreset` (required: no)

### `Slide`
- Schema type: `object`
- Properties:
  - `background` (required: no)
  - `blocks` (required: yes)
  - `density` (required: no)
  - `durationMs` (required: no)
  - `focalBlockId` (required: no)
  - `hidden` (required: no)
  - `id` (required: yes)
  - `interactions` (required: no)
  - `layout` (required: yes)
  - `layoutBindings` (required: no)
  - `layoutVariant` (required: no)
  - `section` (required: no)
  - `sources` (required: no)
  - `speakerNotes` (required: no)
  - `tags` (required: no)
  - `title` (required: yes)
  - `transition` (required: no)

### `Slug`
- Schema type: `string`

### `Source`
- Schema type: `object`
- Properties:
  - `accessedAt` (required: no)
  - `authors` (required: no)
  - `id` (required: yes)
  - `license` (required: no)
  - `note` (required: no)
  - `publishedAt` (required: no)
  - `publisher` (required: no)
  - `title` (required: yes)
  - `url` (required: yes)

### `Theme`
- Schema type: `object`
- Properties:
  - `designSystemRef` (required: no)
  - `id` (required: yes)
  - `mode` (required: no)
  - `overrides` (required: no)

# DeckForge “Polished Modern v2”
## Comprehensive Implementation Plan for a Professional Web-Based Slide Generation Agent Skill

**Document type:** Final implementation specification  
**Project:** DeckForge Web Slide Agent Skills  
**Primary objective:** Upgrade the current slide-generation project into a reliable, editable, visually consistent, production-grade system that can generate professional presentations from diverse end-user prompts.

---

## 1. Executive Summary

The current DeckForge implementation already demonstrates the ability to generate and render web-based presentations, but the screenshots and observed behavior reveal several systemic issues:

- Text and visual blocks overlap.
- Slide layouts do not consistently respect alignment, padding, spacing, or content capacity.
- Grid thumbnails render poorly and leak full slide content.
- Images may fail to load, crop incorrectly, or appear in unsuitable positions.
- Presentation controls occupy slide space and create scrolling.
- Timer behavior is unstable and lacks explicit reset controls.
- Generated decks sometimes contain duplicated, contradictory, or poorly ordered content.
- Presenter mode includes unnecessary editor and debugging metadata.
- Themes lack a governed visual system for gradients, depth, hierarchy, and motion.
- Validation scripts focus mainly on schema compliance rather than the final rendered result.
- The system lacks an automated repair cycle when a generated slide fails layout or visual-quality checks.

The recommended direction is an expanded **Approach C+**, delivered in this order:

> **Content correctness → layout integrity → rendering reliability → editing and presenting → visual polish → motion.**

Gradients, transitions, and other decorative improvements should be implemented only after the underlying composition, measurement, asset, and validation layers are stable.

---

## 2. Product Vision

DeckForge should become a web-native presentation generation system that can:

1. Interpret an end-user prompt.
2. Build a clear presentation brief and storyline.
3. Select suitable slide structures based on content semantics.
4. Generate well-sized content that respects layout capacity.
5. Resolve and validate images and other assets.
6. Render every slide inside a stable 16:9 logical canvas.
7. Measure actual DOM output before accepting a slide.
8. Automatically repair overflow, collision, broken assets, and unsuitable layouts.
9. Provide professional editor, grid, presenter, and speaker modes.
10. Support controlled themes, gradients, motion, accessibility, and export.
11. Remain extensible through schemas, manifests, Agent Skills workflows, and reusable component contracts.

The final experience should feel closer to a polished modern presentation application than a generic HTML renderer.

---

## 3. Target End-to-End Architecture

DeckForge should not generate a `deck.json` file and immediately render it. It should use a staged, typed, and validated pipeline.

```text
User Prompt
    ↓
Deck Brief
    ↓
Storyline Planner
    ↓
Slide Blueprints
    ↓
Content Normalization
    ↓
Layout Selection and Capacity Validation
    ↓
Asset Resolution
    ↓
Off-Screen Measurement Pass
    ↓
Final Rendering
    ↓
Schema + Semantic + Runtime + Visual Validation
    ↓
Automatic Repair Loop
    ↓
Editor / Grid / Presenter / Speaker View / Export
```

Each stage must produce a validated artifact. A later stage must not silently compensate for invalid output from an earlier stage.

For example:

- The renderer should not decide whether a paragraph must be shortened.
- The animation runtime should not repair a bad layout.
- The presenter should not carry editor metadata.
- The thumbnail view should not reuse the complete presenter DOM.
- The layout engine should not accept blocks that exceed a slot’s capacity.

---

# 4. Implementation Priorities

## 4.1 Priority P0 — Structural Reliability

These items must be completed before visual polish:

1. Storyline and content hierarchy.
2. Content budgets and slide-density limits.
3. Layout contracts and slot capacity.
4. Text measurement and overflow prevention.
5. Stable slide-stage scaling.
6. Renderer isolation.
7. Image resolution and fallback handling.
8. Thumbnail rendering isolation.
9. Runtime and screenshot validation.
10. Automatic layout-repair loop.

## 4.2 Priority P1 — Product Usability

1. Clean presenter mode.
2. Timer reset, pause, resume, and shortcuts.
3. Editor side panel.
4. Layout replacement.
5. Theme switching.
6. Media editing.
7. Motion configuration.
8. Undo and redo.
9. Autosave and version snapshots.

## 4.3 Priority P2 — Visual Polish

1. Semantic theme tokens.
2. Curated gradients.
3. Shadows and elevation.
4. Highlight treatments.
5. Motion profiles.
6. Slide transitions.
7. Additional presentation themes.
8. Advanced visual components.

---

# 5. Workstream A — Semantic Planning and Content Correctness

## 5.1 Introduce a `DeckBrief`

Before slide generation, transform the user prompt into a normalized brief.

```ts
interface DeckBrief {
  topic: string;
  objective:
    | "inform"
    | "persuade"
    | "teach"
    | "report"
    | "pitch";

  audience: string;
  presentationDurationMinutes: number;
  targetSlideCount: number;
  language: string;
  tone: string;
  visualDirection: string;

  requiredSections: string[];
  excludedContent: string[];

  evidenceRequirements?: string[];
  preferredThemeFamily?: string;
  preferredMotionProfile?: string;
}
```

The brief must be validated before the system creates slide content.

## 5.2 Build the Storyline Before Slide Content

Each slide should begin as a semantic blueprint.

```ts
interface SlideBlueprint {
  id: string;

  purpose:
    | "cover"
    | "context"
    | "problem"
    | "evidence"
    | "comparison"
    | "process"
    | "solution"
    | "summary"
    | "call-to-action";

  keyMessage: string;
  supportingPoints: string[];

  preferredVisual:
    | "none"
    | "image"
    | "chart"
    | "diagram"
    | "timeline"
    | "cards"
    | "metric";

  density: "minimal" | "standard" | "dense";
  estimatedSpeakingSeconds: number;
}
```

### Required generation rules

- One slide communicates one principal message.
- The title should express a conclusion, not merely name a topic.
- Supporting points must directly explain the title.
- A slide should contain no more than three independent ideas.
- Repeated claims across slides must be rejected or merged.
- Contradictory values must be resolved before rendering.
- Slides should be split before typography falls below the minimum size.
- The final slide should close the narrative rather than introduce new evidence.
- The order of slides should create a logical progression for the target audience.

## 5.3 Add a Deck-Level Claim Registry

Create one canonical registry containing:

- Facts.
- Numbers.
- Definitions.
- Claims.
- Source references.
- Calculated values.
- Approved terminology.

All slides should refer to the same claim registry so that values remain consistent across the deck.

```ts
interface ClaimRegistryItem {
  id: string;
  canonicalText: string;
  numericValue?: number;
  unit?: string;
  sourceId?: string;
  confidence?: number;
  usedBySlideIds: string[];
}
```

## 5.4 Add Content Budgets

Each block type should have strict generation limits.

| Block type | Recommended limit |
|---|---:|
| Slide title | 8–12 words |
| Subtitle | 18–24 words |
| Body paragraph | 35–55 words |
| Bullet list | 3–5 items |
| Bullet item | 8–16 words |
| Metric card | One value and one short label |
| Comparison column | 3–4 points |
| Caption | 8–18 words |
| Timeline stage | 1 title and 1 short explanation |
| Callout | 15–25 words |

These limits should be enforced during content generation, not only reported by the renderer.

## 5.5 Add Semantic Validation

The system should flag:

- Duplicate slide titles.
- Generic titles such as “Overview” without context.
- Contradictory numbers.
- Repeated claims.
- Empty supporting points.
- Slides without a clear narrative purpose.
- Excessive content density.
- Incomplete data stories.
- Unexplained charts.
- Conclusions unsupported by earlier evidence.

---

# 6. Workstream B — Layout Contracts and Composition Engine

## 6.1 Expand the Layout Manifest

Layouts should become enforceable contracts rather than loose coordinate presets.

```ts
interface LayoutDefinition {
  id: string;
  categories: string[];

  supportedPurposes: SlideBlueprint["purpose"][];
  supportedDensity: Array<"minimal" | "standard" | "dense">;

  slots: SlotDefinition[];
  readingOrder: string[];

  visualBalance:
    | "left-heavy"
    | "right-heavy"
    | "centered"
    | "balanced";

  dominancePolicy:
    | "required"
    | "optional"
    | "forbidden";

  fallbackLayoutId?: string;
}

interface SlotDefinition {
  id: string;

  role:
    | "title"
    | "subtitle"
    | "body"
    | "visual"
    | "metric"
    | "caption"
    | "footer";

  allowedBlockTypes: string[];

  minItems: number;
  maxItems: number;

  paddingToken: string;
  gapToken?: string;

  alignX:
    | "start"
    | "center"
    | "end"
    | "stretch";

  alignY:
    | "start"
    | "center"
    | "end"
    | "stretch";

  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;

  maxLines?: number;
  maxCharacters?: number;

  overflowPolicy:
    | "reject"
    | "shrink-once"
    | "replace-layout"
    | "split-slide";

  priority: number;
  dominant?: boolean;
}
```

## 6.2 Dominant-Slot Rules

A single dominant slot works for many content slides, but not every slide.

### Dominance required

- Problem slides.
- Solution slides.
- Evidence slides.
- Metric slides.
- Visual explanation slides.

### Dominance optional

- Cover slides.
- Section dividers.
- Summary slides.
- Closing slides.

### Dominance forbidden

- Symmetrical comparisons.
- Equal-card grids.
- Balanced dashboards.
- Multi-column reference slides.

## 6.3 Deterministic Grid Layouts

Avoid unpredictable presentation layouts based on:

```css
repeat(auto-fill, minmax(...))
```

For fixed slides, determine the grid explicitly.

```text
1 item    → 1 column
2 items   → 2 columns
3 items   → 3 columns
4 items   → 2 × 2
5–6 items → 3 × 2
More than 6 → split into another slide
```

```css
.card-grid {
  display: grid;
  grid-template-columns:
    repeat(var(--column-count), minmax(0, 1fr));
  gap: var(--space-lg);
  align-items: stretch;
}
```

Cards should have:

- Equal height.
- Consistent padding.
- Consistent border treatment.
- Controlled title length.
- Controlled body length.
- A defined empty state.
- A clear visual hierarchy.

## 6.4 Layout Suitability Scoring

The model may suggest a layout, but deterministic code must verify it.

```text
layoutScore =
    purposeCompatibility
  + blockTypeCompatibility
  + densityCompatibility
  + itemCountCompatibility
  + mediaAspectCompatibility
  + visualBalanceCompatibility
  - estimatedOverflowRisk
```

The layout with the highest valid score should be selected.

## 6.5 Controlled Freeform Layouts

Do not allow arbitrary agent-generated pixel coordinates. Permit controlled editorial positioning through named anchors.

```ts
type LayoutAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center-stage"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";
```

```ts
interface AnchoredPlacement {
  anchor: LayoutAnchor;
  offsetToken?: "xs" | "sm" | "md";
}
```

Freeform placement should only exist in registered layouts.

---

# 7. Workstream C — Measurement-Aware Typography and Overflow Prevention

## 7.1 Establish a Fixed Logical Canvas

Use one slide coordinate system.

```text
Logical width: 1920 px
Logical height: 1080 px
Aspect ratio: 16:9
```

All slide content renders inside this logical canvas.

```tsx
const stageScale = Math.min(
  availableWidth / 1920,
  availableHeight / 1080
);
```

```css
.slide-stage {
  position: relative;
  width: 1920px;
  height: 1080px;
  overflow: hidden;
  transform: scale(var(--stage-scale));
  transform-origin: top left;
}
```

This eliminates inconsistent viewport-relative rendering, cropping, and uncontrolled browser scrolling.

## 7.2 Avoid Viewport Units Inside Slide Components

Do not use `vw` or `vh` inside slide content.

```css
/* Avoid */
.slide-title {
  font-size: 4vw;
}
```

Use theme typography tokens.

```css
.slide-title {
  font-size: var(--type-display);
  line-height: var(--line-display);
}
```

## 7.3 Add an Off-Screen Measurement Pass

Before a slide is shown:

1. Render it in a hidden measurement stage.
2. Wait for fonts.
3. Wait for image metadata.
4. Measure every slot.
5. Check text overflow.
6. Check stage boundaries.
7. Check element collisions.
8. Apply a deterministic repair strategy.
9. Accept or reject the slide.

```ts
const horizontallyValid =
  element.scrollWidth <= element.clientWidth + 1;

const verticallyValid =
  element.scrollHeight <= element.clientHeight + 1;
```

## 7.4 Controlled Repair Order

When content does not fit, DeckForge should apply repairs in the following order:

1. Remove unnecessary decorative spacing.
2. Replace the layout with a denser compatible layout.
3. Remove optional supporting text.
4. Convert a paragraph into concise bullets.
5. Split the slide into two slides.
6. Reduce font size by one approved typography step.
7. Reject the slide when it remains invalid.

Never repeatedly shrink content until it becomes unreadable.

## 7.5 Minimum Typography Thresholds

Recommended minimums on the 1920 × 1080 logical canvas:

| Type | Minimum size |
|---|---:|
| Display title | 64 px |
| Standard title | 52 px |
| Section title | 44 px |
| Body | 28 px |
| Supporting text | 24 px |
| Caption | 20 px |
| Source footer | 18 px |

## 7.6 Line and Orphan Controls

- Avoid one-word final title lines.
- Avoid headings above three lines.
- Avoid bullets that wrap into visually unbalanced fragments.
- Use `text-wrap: balance` for large headings.
- Use `overflow-wrap: break-word` for long tokens.
- Handle code, URLs, and file names through special rendering rules.
- Avoid manual `<br>` elements generated by the agent unless the layout explicitly allows them.

## 7.7 Multilingual Validation

Test typography with:

- English.
- Vietnamese.
- Long German-style compound words.
- Chinese, Japanese, and Korean.
- Mixed numbers and symbols.
- Right-to-left content if supported.
- Accented characters and punctuation-heavy headings.

---

# 8. Workstream D — Renderer Isolation and Component Contracts

## 8.1 Create Three Rendering Contexts

Create separate renderers instead of one renderer with many conditional branches.

```tsx
<EditorSlideRenderer />
<PresenterSlideRenderer />
<ThumbnailSlideRenderer />
```

They may share visual blocks but must own separate wrappers, metadata, scaling, and interactions.

## 8.2 Editor Renderer

May contain:

- Selection states.
- Block identifiers.
- Drag handles.
- Resize handles.
- Editing labels.
- Layout guides.
- Inspector integration.
- Debug information in development mode.

## 8.3 Presenter Renderer

Must contain only:

- Final visible slide content.
- Theme output.
- Animation state.
- Build state.
- Accessibility semantics required for presentation.

It must not contain:

- `data-block-id`.
- Selection classes.
- Resize handles.
- Editor labels.
- Debug identifiers.
- Hover editing hints.
- Authoring-only styles.

## 8.4 Thumbnail Renderer

Must contain:

- Static accepted slide state.
- No animations.
- No editor metadata.
- No presenter controls.
- Strict clipping.
- Reduced visual detail when necessary.
- Stable 16:9 sizing.

## 8.5 Pure Block Renderers

Block components should not make slide-level layout decisions.

```tsx
<TitleBlock />
<SubtitleBlock />
<TextBlock />
<BulletListBlock />
<ImageBlock />
<ChartBlock />
<MetricBlock />
<CardGridBlock />
<TimelineBlock />
<ProcessBlock />
<ComparisonBlock />
<QuoteBlock />
<CalloutBlock />
```

The slot wrapper should control:

- Position.
- Dimensions.
- Padding.
- Alignment.
- Gap.
- Overflow.
- Reading order.

## 8.6 Component Manifest

Every component should declare:

```ts
interface ComponentDefinition {
  id: string;
  supportedDensities: Array<"minimal" | "standard" | "dense">;

  minWidth: number;
  minHeight: number;

  maxItems?: number;
  supportedAlignments: string[];

  canBeDominant: boolean;
  supportsAnimation: boolean;
  supportsThumbnail: boolean;

  fallbackComponentId?: string;
}
```

---

# 9. Workstream E — Media and Asset Pipeline

## 9.1 Do Not Hotlink Runtime Presentation Assets

During deck generation:

1. Resolve the requested media.
2. Download it into the project.
3. Validate the content type.
4. Read intrinsic dimensions.
5. Calculate aspect ratio.
6. Generate an asset manifest.
7. Render from a stable local path.
8. Cache or optimize the asset for presentation.

```ts
interface AssetManifestItem {
  id: string;
  localPath: string;
  sourceUrl?: string;

  mimeType: string;
  width: number;
  height: number;
  aspectRatio: number;

  alt: string;
  decorative: boolean;
  attribution?: string;

  status:
    | "ready"
    | "failed"
    | "placeholder";
}
```

## 9.2 Image Block Requirements

```ts
interface ImageBlockData {
  assetId: string;

  fit:
    | "cover"
    | "contain";

  focalPoint: {
    x: number;
    y: number;
  };

  alt: string;
  decorative: boolean;

  caption?: string;
  attribution?: string;
}
```

The image renderer should support:

- `cover`.
- `contain`.
- Focal-point positioning.
- Crop masks.
- Optional rounded frames.
- Captions.
- Attribution.
- Skeleton loading.
- Graceful error replacement.
- Decorative-image semantics.

A failed image must never show a browser broken-image icon or raw fallback text inside a designed slide.

## 9.3 Slot-to-Media Compatibility

The composition engine should verify:

- Slot aspect ratio.
- Image aspect ratio.
- Minimum image resolution.
- Minimum visible subject area.
- Text-overlay contrast.
- Focal-point crop safety.
- Caption height.
- Attribution requirements.

Images must not be inserted into text-only slots.

## 9.4 Asset Validation

A deck cannot be marked ready when:

- An asset is remote-only.
- The browser reports an image error.
- Intrinsic dimensions are unknown.
- A meaningful image has no alt text.
- Required attribution is missing.
- The asset aspect ratio is incompatible with its slot.
- The placeholder is not visually integrated with the theme.

---

# 10. Workstream F — Theme, Gradient, Depth, and Visual Tokens

## 10.1 Introduce Semantic Theme Tokens

```ts
interface ThemeTokens {
  colors: {
    canvas: string;
    surface: string;
    surfaceElevated: string;

    textPrimary: string;
    textSecondary: string;

    accent: string;
    accentSecondary: string;

    positive: string;
    warning: string;
    danger: string;

    divider: string;
  };

  gradients: {
    hero: GradientToken;
    accent: GradientToken;
    highlight: GradientToken;
  };

  typography: {
    displayFamily: string;
    bodyFamily: string;

    displayWeight: number;
    bodyWeight: number;

    scale: string;
  };

  radius: {
    sm: number;
    md: number;
    lg: number;
  };

  shadows: {
    soft: string;
    elevated: string;
  };

  spacing: Record<string, number>;
}
```

```ts
interface GradientToken {
  from: string;
  to: string;
  angle: number;
}
```

## 10.2 CSS Variables

```css
:root {
  --theme-canvas: #ffffff;
  --theme-surface: #f7f7f7;
  --theme-text-primary: #111111;
  --theme-text-secondary: #5d6470;

  --theme-gradient-hero:
    linear-gradient(
      var(--theme-gradient-angle),
      var(--theme-gradient-primary),
      var(--theme-gradient-secondary)
    );

  --theme-shadow-soft:
    0 12px 32px rgb(0 0 0 / 0.08);
}
```

## 10.3 Approved Gradient Uses

Gradients may be used for:

- Hero backgrounds.
- Small emphasis surfaces.
- Progress bars.
- Selected words in large titles.
- Highlight sweeps.
- Decorative visual accents.
- Section dividers.

Do not use gradients on:

- Body paragraphs.
- Long bullet lists.
- Data tables.
- Every card on the same slide.
- More than two large decorative surfaces per slide.
- Low-contrast combinations that reduce readability.

A theme may support gradients without requiring every slide to use them.

## 10.4 Contrast Validation

Validate:

- Body text against its background.
- Heading text against gradient endpoints.
- Accent elements against surfaces.
- Chart series visibility.
- Active and inactive presenter controls.
- Light and dark theme consistency.

## 10.5 Curated Theme Families

Start with a smaller, high-quality catalog:

1. Editorial Warm.
2. Midnight Product.
3. Clean Technical.
4. Soft Gradient Modern.
5. Executive Neutral.
6. Data Story.
7. Minimal Academic.

Each theme should define compatible:

- Typography.
- Chart styling.
- Card treatment.
- Icon treatment.
- Image treatment.
- Motion profile.
- Gradient intensity.
- Shadow intensity.

Avoid mixing unrelated theme fragments.

---

# 11. Workstream G — Grid and Thumbnail UX

## 11.1 Dedicated Thumbnail Stage

```css
.thumbnail-viewport {
  position: relative;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  contain: layout paint size;
}

.thumbnail-slide {
  width: 1920px;
  height: 1080px;
  transform-origin: top left;
  pointer-events: none;
}
```

The scale should be calculated from the measured thumbnail width.

## 11.2 Cached Preview Strategy

For large decks:

1. Render a PNG or WebP after slide validation.
2. Use the cached image in grid mode.
3. Re-render only after the slide changes.
4. Keep a live DOM thumbnail only for selected or recently edited slides.

This reduces:

- Repeated font loading.
- Animation collisions.
- Duplicate element IDs.
- Layout measurement overhead.
- Browser memory usage.
- Thumbnail overflow.

## 11.3 Grid Mode Design

Grid mode should include:

- Consistent 16:9 cards.
- Slide number.
- Short slide title.
- Validation status.
- Selected-state border.
- Optional drag reorder.
- Clean spacing.
- No repeated full-slide text below the thumbnail.
- No presenter toolbar behind the overlay.
- No animations.
- No content outside cards.

## 11.4 Grid Keyboard Behavior

- Arrow keys move selection.
- Enter opens the selected slide.
- Escape closes grid.
- Delete requires confirmation.
- Drag-and-drop updates slide order.
- Reordering must also update storyline numbering and presenter navigation.

---

# 12. Workstream H — Presenter Mode and Timer

## 12.1 Stable Presenter Shell

```css
.presenter-shell {
  width: 100vw;
  height: 100dvh;

  overflow: hidden;

  display: grid;
  place-items: center;
}
```

Presenter controls must not push the slide down or modify slide dimensions.

Controls should be:

- Overlayed.
- Auto-hidden after inactivity.
- Moved into speaker view.
- Restored on pointer movement or keyboard interaction.

## 12.2 Timer State Machine

```ts
type TimerStatus =
  | "idle"
  | "running"
  | "paused";

interface TimerState {
  status: TimerStatus;
  elapsedBeforeStart: number;
  startedAt: number | null;
}
```

Supported actions:

- Start.
- Pause.
- Resume.
- Reset.
- Restart presentation.
- Optional countdown mode.
- Optional slide-level elapsed time.

The timer must not reset when:

- Blackout is toggled.
- Speaker view opens.
- Notes open.
- Grid mode opens.
- The browser loses focus.
- A visual overlay appears.

## 12.3 Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Advance build or slide |
| `ArrowRight` | Next build or slide |
| `ArrowLeft` | Previous slide |
| `T` | Show or hide timer |
| `P` | Pause or resume timer |
| `R` | Reset timer |
| `B` | Blackout |
| `G` | Grid |
| `N` | Notes |
| `F` | Full screen |
| `Esc` | Close overlays |

## 12.4 Audience-Clean Presenter Chrome

The audience view should not display:

- “T to show timer”.
- Grid labels.
- Edit button.
- Notes button.
- Debug metadata.
- Slide identifiers.
- Technical hints.
- Permanent toolbar chrome.

## 12.5 Progress Indicator

Support:

- Thin progress bar.
- Optional restrained gradient.
- Current slide number.
- Total slide count.
- Optional build-level progress.

The progress indicator must overlay the viewport rather than consume slide height.

---

# 13. Workstream I — Editor Side Panel

## 13.1 Editor Shell

```text
┌──────────────┬───────────────────────────┬────────────────────┐
│ Slide list   │ Main slide canvas         │ Inspector panel    │
│              │                           │                    │
│ thumbnails   │ zoom / guides / selection │ Layout             │
│ reorder      │                           │ Content            │
│ add/delete   │                           │ Design             │
│              │                           │ Media              │
│              │                           │ Motion             │
└──────────────┴───────────────────────────┴────────────────────┘
```

## 13.2 Layout Inspector

Allow users to:

- Replace the layout.
- Change alignment.
- Change approved spacing tokens.
- Change column ratios.
- Swap media and text positions.
- Reset the slide to layout defaults.
- Move content to another compatible slot.
- Split a crowded slide.

## 13.3 Content Inspector

Allow users to:

- Edit text.
- Regenerate a selected block.
- Shorten content.
- Expand speaker notes.
- Convert a paragraph into bullets.
- Convert bullets into cards.
- Split a slide.
- Merge compatible slides.
- Lock approved content from regeneration.

## 13.4 Design Inspector

Allow users to:

- Select a theme.
- Change background.
- Change accent.
- Apply a gradient treatment.
- Select a typography pairing.
- Change card style.
- Change radius and depth presets.
- Reset the slide or deck design.

## 13.5 Media Inspector

Allow users to:

- Replace an image.
- Crop an image.
- Choose `cover` or `contain`.
- Set a focal point.
- Edit alt text.
- Add attribution.
- Toggle decorative status.
- Remove the media block.
- Request an alternative visual.

## 13.6 Motion Inspector

Allow users to:

- Select an entrance animation.
- Change build order.
- Change duration.
- Change easing.
- Select a slide transition.
- Preview motion.
- Disable motion.
- Apply a motion profile to the full deck.

## 13.7 Editing Architecture

All editor actions should update the typed deck model.

```text
Inspector action
    ↓
Deck command
    ↓
Immutable state update
    ↓
Validation
    ↓
Renderer update
    ↓
Autosave
```

Add:

- Undo and redo.
- Autosave.
- Dirty-state indicator.
- Version snapshots.
- Reset block.
- Reset slide.
- Reset theme.
- Validation feedback.
- Repair suggestions.

---

# 14. Workstream J — Motion and Transformations

## 14.1 Motion Profiles

Create curated profiles:

- None.
- Subtle.
- Editorial.
- Product.
- Energetic.
- Data Story.

```ts
interface MotionProfile {
  id: string;
  slideTransition: string;

  entranceDuration: number;
  emphasisDuration: number;
  staggerDelay: number;

  easing: string;
  reducedMotionFallback: string;
}
```

## 14.2 Initial Animation Set

- Fade in.
- Slide up.
- Slide from side.
- Scale emphasis.
- Wipe reveal.
- Mask reveal.
- Number count-up.
- Chart draw.
- Highlight sweep.
- Staggered card entrance.

## 14.3 Prohibited or Discouraged Motion

Avoid:

- Continuous floating.
- Infinite pulsing.
- Random rotations.
- Bouncing body text.
- Animating every bullet by default.
- Layout-changing transitions.
- Motion that delays reading without adding meaning.
- Excessive animation on dense slides.

## 14.4 Stable Layout During Motion

Prefer:

- `opacity`.
- `transform`.
- `clip-path`.

Avoid animating:

- Width.
- Height.
- Margins.
- Padding.
- Font size.
- Grid-template properties.

## 14.5 Reduced Motion

When `prefers-reduced-motion` is enabled:

- Remove movement.
- Use instant or short opacity changes.
- Preserve content order.
- Reveal the same informational state.
- Disable automatic continuous motion.

---

# 15. Workstream K — Validation and Automated Repair

## 15.1 Validation Layers

### Layer 1 — Schema Validation

Check:

- Valid slide types.
- Valid block types.
- Required fields.
- Valid tokens.
- Slot compatibility.
- Asset references.
- Animation references.
- Theme overrides.

### Layer 2 — Semantic Validation

Check:

- Duplicate claims.
- Contradictory values.
- Missing storyline purpose.
- Excessive word count.
- Generic titles.
- Duplicate titles.
- Unsupported conclusions.
- Missing chart explanation.

### Layer 3 — Layout Contract Validation

Check:

- Maximum items.
- Allowed block types.
- Reading order.
- Alignment.
- Padding tokens.
- Dominance policy.
- Density compatibility.
- Aspect ratio compatibility.
- Overflow policy.

### Layer 4 — Runtime DOM Validation

Use Playwright to detect:

- Text overflow.
- Stage overflow.
- Horizontal browser scrolling.
- Broken images.
- Missing fonts.
- Unexpected element overlap.
- Presenter metadata leakage.
- Invalid thumbnail dimensions.
- Controls changing slide geometry.
- Animation-induced layout shift.

### Layer 5 — Visual Validation

Capture screenshots at:

- 1366 × 768.
- 1440 × 900.
- 1920 × 1080.
- 2560 × 1440.

Test:

- Presenter mode.
- Grid mode.
- Editor mode.
- Speaker view.
- Reduced-motion mode.
- Long text.
- Missing image.
- Light theme.
- Dark theme.
- Dense slide.
- Multiple languages.

## 15.2 Collision Detection

```ts
function overlaps(
  a: DOMRect,
  b: DOMRect
): boolean {
  return !(
    a.right <= b.left ||
    a.left >= b.right ||
    a.bottom <= b.top ||
    a.top >= b.bottom
  );
}
```

Intentional overlap must be explicitly declared.

```ts
interface BlockMetadata {
  allowOverlap?: boolean;
}
```

## 15.3 Automated Repair Loop

```text
Render
  ↓
Validate
  ↓
Pass?
  ├── Yes → Accept slide
  └── No
       ↓
   Classify failure
       ↓
   Apply targeted repair
       ↓
   Render again
```

Maximum recommended attempts: **three**.

## 15.4 Targeted Repair Rules

| Failure | Repair |
|---|---|
| Title overflow | Rewrite title or replace layout |
| Body overflow | Shorten content or split slide |
| Grid overcrowding | Reduce cards or create another slide |
| Image crop failure | Change fit or focal point |
| Low contrast | Change text or surface token |
| Slot mismatch | Move block or replace layout |
| Missing asset | Resolve again or use designed placeholder |
| Thumbnail overflow | Regenerate cached preview |
| Collision | Adjust layout or move optional decoration |
| Dense slide | Replace with a denser layout or split |

Slides that remain invalid after the repair limit should fail the build rather than silently ship.

---

# 16. Recommended Agent Skills Architecture

```text
skills/
└── deckforge/
    ├── SKILL.md
    │
    ├── agents/
    │   ├── deck-planner.md
    │   ├── storyline-editor.md
    │   ├── slide-composer.md
    │   ├── layout-selector.md
    │   ├── visual-director.md
    │   ├── asset-resolver.md
    │   ├── motion-director.md
    │   └── quality-reviewer.md
    │
    ├── workflows/
    │   ├── 01-analyze-request.md
    │   ├── 02-build-deck-brief.md
    │   ├── 03-create-storyline.md
    │   ├── 04-compose-slides.md
    │   ├── 05-resolve-assets.md
    │   ├── 06-render-and-measure.md
    │   ├── 07-audit-and-repair.md
    │   ├── 08-present-and-export.md
    │   └── 09-edit-existing-deck.md
    │
    ├── references/
    │   ├── content-design.md
    │   ├── composition-and-layout-engine.md
    │   ├── layout-capacity-rules.md
    │   ├── typography-system.md
    │   ├── asset-and-media-workflow.md
    │   ├── theme-system.md
    │   ├── motion-and-transitions.md
    │   ├── presenter-mode.md
    │   ├── editor-mode.md
    │   └── accessibility.md
    │
    ├── manifests/
    │   ├── layout-manifest.json
    │   ├── component-manifest.json
    │   ├── theme-manifest.json
    │   ├── animation-manifest.json
    │   └── typography-manifest.json
    │
    ├── schemas/
    │   ├── deck-brief.schema.json
    │   ├── storyline.schema.json
    │   ├── deck-project.schema.json
    │   └── asset-manifest.schema.json
    │
    ├── scripts/
    │   ├── validate_schema.py
    │   ├── audit_deck_content.py
    │   ├── audit_deck_layout.py
    │   ├── audit_assets.py
    │   ├── audit_accessibility.py
    │   ├── render_deck.ts
    │   ├── measure_deck.ts
    │   ├── visual_regression.ts
    │   └── repair_deck.ts
    │
    └── templates/
        ├── editorial/
        ├── product/
        ├── educational/
        ├── data-story/
        ├── executive/
        └── pitch/
```

`SKILL.md` should act as the orchestration contract rather than containing every detailed rule inline.

---

# 17. Recommended Runtime Source Structure

```text
src/
└── deck/
    ├── planning/
    │   ├── createDeckBrief.ts
    │   ├── createStoryline.ts
    │   ├── claimRegistry.ts
    │   └── contentBudget.ts
    │
    ├── composition/
    │   ├── selectLayout.ts
    │   ├── layoutScoring.ts
    │   ├── bindBlocksToSlots.ts
    │   ├── splitSlide.ts
    │   └── compositionTypes.ts
    │
    ├── rendering/
    │   ├── EditorSlideRenderer.tsx
    │   ├── PresenterSlideRenderer.tsx
    │   ├── ThumbnailSlideRenderer.tsx
    │   ├── SlotRenderer.tsx
    │   └── blocks/
    │
    ├── measurement/
    │   ├── MeasurementStage.tsx
    │   ├── measureSlide.ts
    │   ├── detectOverflow.ts
    │   ├── detectCollision.ts
    │   └── measurementTypes.ts
    │
    ├── validation/
    │   ├── validateSchema.ts
    │   ├── validateSemantics.ts
    │   ├── validateLayout.ts
    │   ├── validateRuntime.ts
    │   └── validationTypes.ts
    │
    ├── repair/
    │   ├── repairSlide.ts
    │   ├── repairTitle.ts
    │   ├── repairBody.ts
    │   ├── repairLayout.ts
    │   └── repairAsset.ts
    │
    ├── assets/
    │   ├── resolveAsset.ts
    │   ├── assetManifest.ts
    │   ├── imageMetadata.ts
    │   └── placeholderFactory.ts
    │
    ├── themes/
    │   ├── themeTokens.ts
    │   ├── themeRegistry.ts
    │   ├── applyTheme.ts
    │   └── contrastAudit.ts
    │
    ├── motion/
    │   ├── AnimationRuntime.tsx
    │   ├── motionProfiles.ts
    │   ├── transitionRegistry.ts
    │   └── reducedMotion.ts
    │
    ├── editor/
    │   ├── EditorShell.tsx
    │   ├── InspectorPanel.tsx
    │   ├── commands/
    │   └── history/
    │
    ├── presenter/
    │   ├── PresenterApp.tsx
    │   ├── PresenterControls.tsx
    │   ├── TimerMachine.ts
    │   ├── SpeakerView.tsx
    │   └── shortcuts.ts
    │
    ├── thumbnails/
    │   ├── GridView.tsx
    │   ├── ThumbnailCard.tsx
    │   ├── thumbnailCache.ts
    │   └── renderThumbnail.ts
    │
    └── state/
        ├── deckStore.ts
        ├── deckCommands.ts
        ├── autosave.ts
        └── history.ts
```

---

# 18. Required Changes to Existing Files

At minimum, update:

```text
examples/02-example/src/deck/types.ts
examples/02-example/src/deck/themes.ts
examples/02-example/src/deck/SlideRenderer.tsx
examples/02-example/src/deck/BlockRenderer.tsx
examples/02-example/src/deck/AnimationRuntime.tsx
examples/02-example/src/App.tsx
examples/02-example/src/PresenterApp.tsx
examples/02-example/src/styles.css

skills/deckforge/assets/deck-project.schema.json
skills/deckforge/assets/layout-manifest.json
skills/deckforge/assets/component-manifest.json
skills/deckforge/assets/theme-manifest.json
skills/deckforge/assets/animation-manifest.json

skills/deckforge/scripts/audit_deck_layout.py
skills/deckforge/scripts/validate_output_contract.py
```

Add new modules instead of continuing to enlarge the current renderer and application files.

---

# 19. Implementation Milestones

## Milestone 0 — Baseline and Regression Fixtures

### Tasks

- Save screenshots for every known failure.
- Create fixture decks reproducing each issue.
- Add a Playwright test harness.
- Document expected output for each fixture.
- Freeze the current behavior before refactoring.

### Exit condition

Every visible problem has a reproducible automated test.

---

## Milestone 1 — Canvas, Renderer Isolation, and Grid Repair

### Tasks

- Implement the fixed 1920 × 1080 logical stage.
- Add `ResizeObserver` scaling.
- Separate editor, presenter, and thumbnail renderers.
- Add strict stage clipping.
- Repair grid thumbnail scaling.
- Remove browser-level scrolling in presenter mode.
- Ensure controls overlay rather than consume slide space.

### Exit condition

No slide or thumbnail escapes its frame at supported viewport sizes.

---

## Milestone 2 — Semantic Planning and Layout Contracts

### Tasks

- Add `DeckBrief`.
- Add slide blueprints.
- Add content budgets.
- Add the claim registry.
- Expand layout and component manifests.
- Implement deterministic layout scoring.
- Add duplicate and contradiction checks.

### Exit condition

Generated content has a clear storyline and a compatible layout before rendering.

---

## Milestone 3 — Measurement and Automatic Repair

### Tasks

- Add the hidden measurement stage.
- Add text-overflow checks.
- Add stage-boundary checks.
- Add collision detection.
- Add layout replacement.
- Add slide splitting.
- Add the three-pass repair loop.
- Add failure reporting.

### Exit condition

No accepted slide contains unresolved overflow or invalid collision.

---

## Milestone 4 — Asset Pipeline

### Tasks

- Resolve and cache assets.
- Add the asset manifest.
- Implement `cover`, `contain`, and focal points.
- Add designed placeholders.
- Add asset status validation.
- Add alt-text and attribution checks.

### Exit condition

Broken browser image states never appear in accepted slides.

---

## Milestone 5 — Presenter and Editor

### Tasks

- Implement the timer state machine.
- Add reset, pause, and resume.
- Add keyboard shortcuts.
- Clean presenter markup.
- Add the editor side panel.
- Add undo and redo.
- Add autosave.
- Add layout, content, design, media, and motion inspectors.

### Exit condition

Users can safely edit and save a deck without changing source files.

---

## Milestone 6 — Theme and Motion System

### Tasks

- Add semantic theme tokens.
- Add curated gradients.
- Add theme contrast validation.
- Add motion profiles.
- Add reduced-motion behavior.
- Add slide transitions.
- Add animation-manifest implementation references.

### Exit condition

Visual effects never cause layout shifts or reduce readability.

---

## Milestone 7 — Packaging, Examples, and Documentation

### Tasks

- Update `02-example`.
- Update `01-example` where runtime patterns are shared.
- Regenerate embedded `.agents/skills/` copies.
- Add stress-test decks.
- Add theme examples.
- Add component examples.
- Add extension documentation.
- Run complete validation and packaging.

### Exit condition

```bash
npm run validate
npm run test
npm run test:visual
npm run package-skills
```

All commands pass from a clean checkout.

---

# 20. Testing Matrix

## 20.1 Content Tests

- Minimal title slide.
- Dense executive summary.
- Five-item process.
- Six-card grid.
- Long paragraph.
- Long Vietnamese title.
- Duplicate claim.
- Contradictory metric.
- Unsupported conclusion.
- Missing slide purpose.

## 20.2 Layout Tests

- Two-column text and visual.
- Three-column comparison.
- Balanced dashboard.
- Full-bleed image.
- Quote slide.
- Timeline.
- Process flow.
- Metric hero.
- Data chart.
- Empty optional slot.

## 20.3 Media Tests

- Landscape image.
- Portrait image.
- Square image.
- Missing image.
- Corrupted image.
- Low-resolution image.
- Decorative image.
- Image with attribution.
- Image with a focal subject near an edge.

## 20.4 Presenter Tests

- Reset timer.
- Pause timer.
- Resume timer.
- Toggle blackout.
- Open notes.
- Open grid.
- Enter full screen.
- Move between builds.
- Browser resize.
- Loss of browser focus.

## 20.5 Grid Tests

- Seven-slide deck.
- Thirty-slide deck.
- Active slide selection.
- Drag reorder.
- Delete slide.
- Invalid slide status.
- Cached preview regeneration.

## 20.6 Accessibility Tests

- Keyboard-only navigation.
- Reduced motion.
- Alt text.
- Decorative media.
- Color contrast.
- Focus indicators.
- Screen-reader-friendly presenter controls.
- Language metadata.

---

# 21. Definition of Done

A generated deck must not be marked ready unless all of the following are true.

## 21.1 Content

- Every slide has one clear message.
- No duplicated or contradictory claims.
- Titles are meaningful and within budget.
- Text density matches the selected layout.
- Speaker notes do not appear in visible slide content.
- The deck has a coherent opening, development, and conclusion.

## 21.2 Layout

- No text overflow.
- No unapproved overlap.
- No element exceeds the 1920 × 1080 stage.
- Padding and alignment are token-based.
- Grids are deterministic.
- Layout remains stable after fonts and images load.
- No direct arbitrary coordinate adjustments are present.

## 21.3 Media

- No remote-only runtime dependency.
- No broken image icons.
- Every meaningful image has alt text.
- Fit and focal point are explicit.
- Captions remain attached to their images.
- Required attribution is visible or stored correctly.

## 21.4 Presenter

- No editor metadata.
- No browser-level vertical scrolling.
- Timer supports start, pause, resume, and reset.
- Controls do not change slide geometry.
- Grid and notes overlays are isolated.
- Audience view remains visually clean.

## 21.5 Design

- Theme application is consistent across the deck.
- Contrast passes validation.
- No more than two strong decorative treatments appear on one slide.
- Typography hierarchy remains consistent.
- Gradients and shadows remain restrained.
- Components visually belong to the selected theme family.

## 21.6 Motion

- Animations do not create layout shifts.
- Build order follows reading order.
- Reduced-motion mode works.
- No unnecessary continuous animation.
- Motion supports comprehension rather than decoration alone.

## 21.7 Grid

- Every thumbnail uses a correct 16:9 frame.
- No thumbnail content escapes its card.
- Thumbnails contain no animation or editor controls.
- Selection and reordering are stable.
- Large decks remain performant.

---

# 22. Recommended Final Direction

Adopt the existing “Polished Modern” plan, but expand it into a full **DeckForge Polished Modern v2** architecture.

The most important improvements are:

1. Add a semantic storyline and content-budget layer.
2. Add layout-capacity contracts and deterministic layout scoring.
3. Add a DOM measurement and automatic-repair pipeline.
4. Separate editor, presenter, and thumbnail rendering contexts.
5. Resolve and cache assets before runtime.
6. Add a complete editor side panel.
7. Validate rendered screenshots, not only JSON.
8. Move gradients and advanced motion after layout stability.
9. Treat themes, layouts, components, assets, and motion as governed manifests.
10. Reject unresolved rendering failures instead of silently shipping them.

This implementation order directly addresses:

- Overlapping text.
- Chaotic content order.
- Inconsistent padding and margins.
- Broken images.
- Incorrect cropping.
- Slide-stage overflow.
- Weak grid mode.
- Presenter clutter.
- Timer instability.
- Duplicated information.
- Unprofessional theme consistency.
- Missing editability.
- Lack of robust validation.

The final product should be a reliable presentation-generation system rather than only a collection of slide templates and rendering utilities.

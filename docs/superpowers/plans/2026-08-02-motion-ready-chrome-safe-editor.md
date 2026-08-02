# Motion-Ready, Chrome-Safe, App-Shell Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every DeckForge-generated deck motion-ready by default, keep presenter chrome out of the slide area, fix the editor's dead-space layout, and enforce all of it with deterministic checks.

**Architecture:** One coherent pass across all layers. Skill rules and the delivery contract are updated so future agents generate correct output; new validator scripts (`audit_deck_motion.py`, extended `validate_output_contract.py`) block regressions; starter components and both runnable examples (`01-example` vanilla JS, `02-example` React) are fixed to demonstrate the corrected behavior and act as living references. Motion comes from binding a deck's presentation archetype to a motion profile in `motion-profile-manifest.json`, then applying default builds and transitions at runtime.

**Tech Stack:** Python 3 (validators, unittest), TypeScript/React 18 + Vite (`examples/02-example`), vanilla JS (`examples/01-example`), JSON Schema (Draft 2020-12).

## Global Constraints

- `npm run validate` must pass end-to-end at the end (runs `scripts/check_rules.py`, `scripts/lint_skills.py`, `scripts/validate_repository_assets.py`, `scripts/validate_catalogs.py`, `scripts/validate_deck_project.py` on both example decks, `scripts/audit_deck_layout.py`, `scripts/validate_output_contract.py`, `node --check` on `examples/01-example/app.js`, and the unittest suite).
- Schema changes to `skills/deckforge/assets/deck-project.schema.json` MUST be mirrored to `schemas/deck-project.schema.json` (identical files today).
- Motion profile ids come only from `skills/deckforge/assets/motion-profile-manifest.json`: `executive-subtle`, `technical-precise`, `education-guided`, `pitch-dynamic`, `seminar-editorial`, `portfolio-showcase`, `self-guided-calm`, `none-accessible`.
- Presenter chrome (timer, position, controls, progress) must render OUTSIDE the letterboxed slide area; never `position:absolute` over the slide canvas.
- Editor must be a stable app shell: every CSS grid row assigned to a real element; speaker-notes strip is a direct grid child and collapsible.
- Respect `prefers-reduced-motion` everywhere; `none-accessible` profile disables spatial motion.
- On Windows the npm shim is blocked by execution policy — invoke npm as `& npm.cmd <args>`.
- All work happens in the repo root `H:\SideProjects\slides-on-web-skills\deckforge`.

---

### Task 1: Fix broken validation wiring

**Files:**
- Modify: `tests/test_examples.py`
- Modify: `package.json`
- Test: `tests/test_examples.py`

**Interfaces:**
- Consumes: none.
- Produces: a green baseline — `python -m unittest discover -s tests -p "test_*.py"` passes and `package.json` `validate` script points at real paths.

The tests and the `validate` script reference `examples/editable-deck-studio`, which does not exist. The real editable example lives at `examples/02-example`. Also, `node --check` currently targets `examples/editable-deck-studio/app.js` but the editable example is a Vite/React app with no root `app.js`; the vanilla JS file to syntax-check is `examples/01-example/app.js`.

- [x] **Step 1: Fix the test paths**

Edit `tests/test_examples.py`:

```python
ROOT/'examples/editable-deck-studio/deck.json'   ->   ROOT/'examples/02-example/deck.json'
ROOT/'examples/editable-deck-studio'             ->   ROOT/'examples/02-example'
```

(lines 6, 18, 19).

- [x] **Step 2: Run the tests**

Run: `python -m unittest discover -s tests -p "test_*.py" -v`
Expected: all tests PASS, no FileNotFoundError.

- [x] **Step 3: Fix the package.json validate script**

Edit `package.json` line 7. Replace every `examples/editable-deck-studio` with `examples/02-example`, and replace the `node --check` target `examples/editable-deck-studio/app.js` with `examples/01-example/app.js`.

- [x] **Step 4: Verify a component command**

Run: `python scripts/validate_deck_project.py examples/02-example/deck.json`
Expected: `OK: examples\02-example\deck.json (7 slides, 36 blocks, 0 interactions, profile=editable-deck)`

- [x] **Step 5: Commit**

```bash
git add tests/test_examples.py package.json
git commit -m "fix(validate): point tests and validate script at examples/02-example"
```

---

### Task 2: Require and validate `motionProfileId` in the schema and decks

**Files:**
- Modify: `skills/deckforge/assets/deck-project.schema.json`
- Modify: `schemas/deck-project.schema.json`
- Modify: `scripts/validate_deck_project.py`
- Modify: `skills/deckforge/assets/sample-deck-project.json`
- Modify: `examples/ai-product-vision.deck.json`
- Modify: `examples/02-example/deck.json`
- Modify: `examples/01-example/index.html` (embedded deck's `presentation`)
- Test: `scripts/validate_deck_project.py`

**Interfaces:**
- Consumes: `motion-profile-manifest.json` ids.
- Produces: `presentation.motionProfileId` (required string) and `presentation.defaultBuilds` (optional boolean) in the schema and in every validated deck; `validate_deck_project.py` rejects unknown profile ids.

- [x] **Step 1: Add the fields to the canonical schema**

In `skills/deckforge/assets/deck-project.schema.json`, `presentation` definition (around lines 242-295):

Add `"motionProfileId"` to `required`.

Add to `properties`:

```json
"motionProfileId": {
  "enum": [
    "executive-subtle",
    "technical-precise",
    "education-guided",
    "pitch-dynamic",
    "seminar-editorial",
    "portfolio-showcase",
    "self-guided-calm",
    "none-accessible"
  ]
},
"defaultBuilds": {
  "type": "boolean",
  "description": "Runtime applies default entrance/build motion from the motion profile even when individual blocks declare no animation."
}
```

- [x] **Step 2: Mirror the schema**

Run: `Copy-Item skills/deckforge/assets/deck-project.schema.json schemas/deck-project.schema.json`
Verify identical: `python -c "import json;print(json.load(open('schemas/deck-project.schema.json'))==json.load(open('skills/deckforge/assets/deck-project.schema.json')))"` prints `True`.

- [x] **Step 3: Add the validation check**

Edit `scripts/validate_deck_project.py` after the `motion_profiles`/catalog loading lines:

```python
motion_profiles=catalog_ids('motion-profile-manifest.json','id')
mpid=deck.get('presentation',{}).get('motionProfileId')
if not mpid:fail('presentation.motionProfileId is required (pick from motion-profile-manifest.json)')
if mpid not in motion_profiles:fail(f'unknown presentation.motionProfileId: {mpid}')
```

- [x] **Step 4: Run it — expect failure on current decks**

Run: `python scripts/validate_deck_project.py examples/02-example/deck.json`
Expected: `ERROR: presentation.motionProfileId is required ...` and exit 1.

- [x] **Step 5: Add `motionProfileId` to the decks**

`examples/02-example/deck.json` `presentation` (line ~31): add `"motionProfileId": "technical-precise"` (profile `slideTransition` is `push`, matching the deck) and `"defaultBuilds": true`.

`examples/ai-product-vision.deck.json` `presentation`: add `"motionProfileId": "pitch-dynamic"`.

`skills/deckforge/assets/sample-deck-project.json` `presentation`: add `"motionProfileId": "executive-subtle"` and `"defaultBuilds": true`.

`examples/01-example/index.html` embedded deck `presentation` (line ~99): add `"motionProfileId": "education-guided"`.

- [x] **Step 6: Run validation on both example decks**

Run:
```bash
python scripts/validate_deck_project.py examples/ai-product-vision.deck.json
python scripts/validate_deck_project.py examples/02-example/deck.json
```
Expected: both print `OK:` with no ERROR.

- [x] **Step 7: Verify catalog validation still passes**

Run: `python scripts/validate_catalogs.py`
Expected: PASS, exit 0.

- [x] **Step 8: Commit**

```bash
git add skills/deckforge/assets/deck-project.schema.json schemas/deck-project.schema.json scripts/validate_deck_project.py skills/deckforge/assets/sample-deck-project.json examples/ai-product-vision.deck.json examples/02-example/deck.json examples/01-example/index.html
git commit -m "feat(schema): require presentation.motionProfileId and validate it"
```

---

### Task 3: Mandate default motion and chrome discipline in the skill rules

**Files:**
- Modify: `skills/deckforge/built-in-skills/motion-and-transitions.md`
- Modify: `skills/deckforge/built-in-skills/quality-gate.md`
- Modify: `skills/deckforge/system-prompt.md`
- Modify: `skills/deckforge/SKILL.md`
- Modify: `skills/deckforge/references/delivery-acceptance-contract.md`
- Modify: `skills/deckforge/built-in-skills/editor-experience.md`
- Modify: `skills/deckforge/built-in-skills/presenter-experience.md`
- Modify: `skills/deckforge/built-in-skills/layout-and-rendering.md`

**Interfaces:**
- Consumes: `motionProfileId` (Task 2).
- Produces: agent-facing rules that force motion and chrome discipline; consumed by nothing at runtime.

- [x] **Step 1: Update `motion-and-transitions.md`**

Add a section before `## Select a motion profile`:

```markdown
## Default motion is mandatory

A deck whose slides never move is a defect, not a style choice. Every generated
DeckProject MUST declare `presentation.motionProfileId` and bind it to the deck's
presentation archetype using `motion-profile-manifest.json` (each profile lists
the archetypes it is `useFor`). Even when the user does not mention motion, apply
the profile's defaults:

- one slide transition (from the profile's `slideTransition`);
- entrance/build motion on key blocks (heading, lead, primary visual, evidence)
  using the profile's `objectBuilds` and `durationRangeMs`;
- staggered reveals only where they aid sequence or comparison;
- a `reducedMotion` fallback for every animation.

Set `presentation.defaultBuilds: true` so the runtime applies default builds to
blocks that carry no explicit `animation`. Do not ship a deck with a motion
profile of `none-accessible` unless the audience/context requires zero spatial
motion.
```

Also add to `## Smoothness rules`: `- Docked presenter chrome must never animate over the slide canvas.`

- [x] **Step 2: Update `quality-gate.md`**

Add under `## Document-to-product consistency`:

```markdown
- `motionProfileId` requires a runtime slide transition and default builds (or block-level animations); a deck that is fully static is blocking;
- presenter chrome (timer, position, controls, progress) must be docked outside the slide area — floating chrome over slide content is blocking.
```

- [x] **Step 3: Update `system-prompt.md`**

Replace the `## Motion` paragraph (line ~107):

```markdown
## Motion

Motion is required, not optional. Bind `presentation.motionProfileId` to the deck's
archetype and apply the profile's default slide transition and object builds even
when the user does not request them. Use motion to reveal sequence, causality,
hierarchy, comparison, or state change. Limit concurrent motion, keep durations
consistent, and avoid playful physics in executive, research, finance, compliance,
or healthcare contexts unless justified.

Respect reduced motion by replacing spatial transforms with immediate or subtle
fade changes. Presenter chrome must be docked outside the letterboxed slide area.
```

- [x] **Step 4: Update `SKILL.md`**

In section 5 (after archetype reading), add a step binding motion:

```markdown
Read `assets/motion-profile-manifest.json`, select the profile whose `useFor`
matches the presentation archetype, and record it as `presentation.motionProfileId`.
Apply the profile's default slide transition and block builds even when the user
did not request motion.
```

- [x] **Step 5: Update `delivery-acceptance-contract.md`**

Add to `Blocking failures`:

```markdown
- no `motionProfileId` or a fully static presenter (no transition, no builds);
- presenter chrome floating over the slide safe area;
- editor with an unassigned grid row or a non-collapsible notes area.
```

- [x] **Step 6: Update `editor-experience.md`**

Add under `Required workspace anatomy`:

```markdown
The editor is a stable app shell. Every layout row maps to a real element: appbar,
slide rail, canvas, inspector, and a collapsible speaker-notes strip that is a
direct grid child. The canvas row must be `minmax(0,1fr)` with `overflow:auto`;
no reserved-but-empty bands may exist.
```

- [x] **Step 7: Update `presenter-experience.md`**

Add under `Audience view`:

```markdown
All chrome — timer, position, controls, progress — lives in a docked band outside
the letterboxed slide. Never float chrome over the slide canvas. Auto-hide chrome
on idle in fullscreen and reveal on pointer-move.
```

- [x] **Step 8: Update `layout-and-rendering.md`**

Add under `Responsive strategy`:

```markdown
Presenter reserves a docked chrome band outside the letterboxed stage. The slide
canvas must never be covered by chrome at any viewport or fullscreen state.
```

- [x] **Step 9: Commit**

```bash
git add skills/deckforge/built-in-skills/motion-and-transitions.md skills/deckforge/built-in-skills/quality-gate.md skills/deckforge/system-prompt.md skills/deckforge/SKILL.md skills/deckforge/references/delivery-acceptance-contract.md skills/deckforge/built-in-skills/editor-experience.md skills/deckforge/built-in-skills/presenter-experience.md skills/deckforge/built-in-skills/layout-and-rendering.md
git commit -m "docs(skills): mandate default motion and docked presenter chrome"
```

---

### Task 4: Add `audit_deck_motion.py` validator

**Files:**
- Create: `skills/deckforge/scripts/audit_deck_motion.py`
- Create: `scripts/audit_deck_motion.py` (thin wrapper, matching existing pattern)
- Create: `tests/fixtures/static-presenter/deck.json` update (keep fixture valid)
- Modify: `tests/test_examples.py` (add motion audit test)
- Test: `tests/test_examples.py`

**Interfaces:**
- Consumes: `motion-profile-manifest.json`, `animation-manifest.json`, deck JSON.
- Produces: CLI `audit_deck_motion.py <deck.json>` that exits 0 on a motion-ready deck, 1 otherwise. Checks:
  1. `presentation.motionProfileId` present and a known profile id;
  2. `presentation.transition` present and non-empty (or a per-slide transition);
  3. at least one block in the deck declares an `animation` OR `presentation.defaultBuilds === true`;
  4. `presentation.reducedMotion` present.

- [x] **Step 1: Write the failing test**

Add to `tests/test_examples.py`:

```python
 def test_motion_audit_passes_for_editable_example(self):
  subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/audit_deck_motion.py'),str(ROOT/'examples/02-example/deck.json')],check=True)
 def test_motion_audit_fails_for_static_deck(self):
  import tempfile, json, os
  static={'presentation':{'mode':'horizontal','transition':'','reducedMotion':'respect-system'},'slides':[{'id':'s1','title':'t','layout':'title-hero','blocks':[{'id':'b1','type':'text','content':'x'}]}]}
  with tempfile.TemporaryDirectory() as d:
   p=os.path.join(d,'deck.json');open(p,'w',encoding='utf-8').write(json.dumps(static))
   r=subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/audit_deck_motion.py'),p],capture_output=True,text=True)
   self.assertNotEqual(r.returncode,0)
```

- [x] **Step 2: Run to verify it fails**

Run: `python -m unittest tests.test_examples -v`
Expected: `test_motion_audit_*` FAIL (module/script not found).

- [x] **Step 3: Write the validator**

Create `skills/deckforge/scripts/audit_deck_motion.py`:

```python
#!/usr/bin/env python3
"""Audit that a DeckProject is motion-ready: profile, transition, builds, reduced motion."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
ASSETS=HERE.parent/'assets'

def main():
    ap=argparse.ArgumentParser();ap.add_argument('deck',type=Path)
    args=ap.parse_args()
    deck=json.loads(args.deck.read_text(encoding='utf-8'))
    profiles={x['id'] for x in json.loads((ASSETS/'motion-profile-manifest.json').read_text(encoding='utf-8'))}
    errors=[]
    pres=deck.get('presentation',{})
    mpid=pres.get('motionProfileId')
    if not mpid: errors.append('presentation.motionProfileId missing')
    elif mpid not in profiles: errors.append(f'unknown motionProfileId {mpid}')
    if not (pres.get('transition') or any(s.get('transition') for s in deck.get('slides',[]))):
        errors.append('no slide transition declared')
    has_builds=bool(pres.get('defaultBuilds')) or any(b.get('animation') for s in deck.get('slides',[]) for b in s.get('blocks',[]))
    if not has_builds: errors.append('no block builds and defaultBuilds not set')
    if not pres.get('reducedMotion'): errors.append('presentation.reducedMotion missing')
    for e in errors: print('ERROR:',e,file=sys.stderr)
    print(f'MOTION: {len(deck.get("slides",[]))} slides, {len(errors)} errors')
    if errors: raise SystemExit(1)

if __name__=='__main__':main()
```

- [x] **Step 4: Create the root wrapper**

Create `scripts/audit_deck_motion.py`:

```python
#!/usr/bin/env python3
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().parents[1]/'skills/deckforge/scripts/audit_deck_motion.py'),run_name='__main__')
```

- [x] **Step 5: Run the test suite**

Run: `python -m unittest tests.test_examples -v`
Expected: both new tests PASS.

- [x] **Step 6: Verify both example decks pass the motion audit**

Run:
```bash
python skills/deckforge/scripts/audit_deck_motion.py examples/02-example/deck.json
python skills/deckforge/scripts/audit_deck_motion.py examples/ai-product-vision.deck.json
```
Expected: `MOTION: ... 0 errors` exit 0 for both.

- [x] **Step 7: Commit**

```bash
git add skills/deckforge/scripts/audit_deck_motion.py scripts/audit_deck_motion.py tests/test_examples.py
git commit -m "feat(validate): add audit_deck_motion.py for motion-ready decks"
```

---

### Task 5: Extend `validate_output_contract.py` with motion and chrome-safe checks

**Files:**
- Modify: `skills/deckforge/scripts/validate_output_contract.py`
- Modify: `tests/test_examples.py` (or new `tests/test_output_contract_motion.py`)
- Test: the new checks

**Interfaces:**
- Consumes: existing `corpus()`/`check()` helpers.
- Produces: new required checks `default-motion` and `chrome-safe` in the editable-deck profile branch.

- [x] **Step 1: Add the checks**

In `validate_output_contract.py`, in the `editable-deck` profile branch (after `present-current`):

```python
        check('default-motion','Runtime motion (transitions and builds)',[r'motionprofileid',r'slidetype=["\']animation',r'buildindex|buildstep|buildstepindex',r'step-visible|row-visible|build-hidden',r'anim-in|animate-in',r'transition.*(slide|class)|slide.*transition'])
        check('chrome-safe','Presenter chrome docked outside slide area',[r'presenter[-_ ]chrome',r'presenter[-_ ]controls',r'presenter[-_ ]stage',r'deck-controls'],required=False)
        check('reduced-motion','Reduced motion support',[r'prefers-reduced-motion',r'reducedmotion'])
```

Keep the existing `reduced-motion` check (already present as `check('reduced-motion',...)` at line 33) — do not duplicate; only add `default-motion` and the chrome `required=False` informative check. `default-motion` should be `required=True` (default).

- [x] **Step 2: Write the test**

Add to `tests/test_examples.py`:

```python
 def test_editable_example_passes_motion_and_chrome_checks(self):
  result=subprocess.run([sys.executable,str(ROOT/'skills/deckforge/scripts/validate_output_contract.py'),str(ROOT/'examples/02-example'),'--profile','editable-deck'],capture_output=True,text=True)
  self.assertEqual(result.returncode,0,result.stderr)
```

- [x] **Step 3: Run to verify it passes (after Task 6/7 implement motion)**

Note: this test depends on the 02-example presenter having real motion + chrome classes. If it fails before Task 6/7, that is expected. Run: `python -m unittest tests.test_examples -v`
Expected: PASS after Tasks 6 and 7 are complete.

- [x] **Step 4: Commit**

```bash
git add skills/deckforge/scripts/validate_output_contract.py tests/test_examples.py
git commit -m "feat(validate): add default-motion and chrome-safe contract checks"
```

---

### Task 6: Add transition + build motion to 02-example presenter

**Files:**
- Modify: `examples/02-example/src/render/SlideRenderer.tsx`
- Modify: `examples/02-example/src/presenter/PresenterApp.tsx`
- Modify: `examples/02-example/src/styles.css`
- Test: `examples/02-example` build + `npm.cmd run build`

**Interfaces:**
- Consumes: `Block.animation` (types.ts), `presentation.defaultBuilds` from deck.json.
- Produces: presenter navigation consumes build steps before advancing; slide transitions animate; blocks reveal with entrance animation. CSS classes: `slide`, `slide-enter`, `slide-exit`, `build-hidden`, `anim-in`.

- [x] **Step 1: Add build-step model to the presenter**

In `PresenterApp.tsx`, add state and derive the per-slide build count:

```tsx
const [buildIndex, setBuildIndex] = useState(0);

const buildCount = useMemo(() => {
  const animated = slide.blocks.filter((b) => b.animation);
  const click = animated.filter((b) => b.animation?.trigger === 'on-click');
  const withPrev = animated.filter((b) => b.animation?.trigger === 'with-previous' || b.animation?.trigger === 'after-previous');
  return Math.max(1, click.length + (withPrev.length ? 1 : 0) + (deck.presentation.defaultBuilds ? 1 : 0));
}, [slide, deck.presentation.defaultBuilds]);
```

Change `next`/`previous` so build steps are consumed first:

```tsx
const next = useCallback(() => {
  setBlackout(false);
  setIndex((current) => current);  // placeholder replaced below
  setBuildIndex((b) => {
    if (b + 1 < buildCount) return b + 1;
    setIndex((i) => Math.min(i + 1, total - 1));
    return 0;
  });
}, [buildCount, total]);
```

Reset `buildIndex` to 0 when navigating via `goTo`, `first`, `last`, and on `safeIndex` change. Pass `buildIndex` to `<SlideRenderer>`.

- [x] **Step 2: Render reveals and entrances in SlideRenderer**

In `SlideRenderer.tsx`, accept a new prop `buildIndex?: number` (default `Number.MAX_SAFE_INTEGER`) and compute revealed state per block. For each block wrapper add:

```tsx
const revealed = buildIndex >= revealStepFor(block, slide, deck.presentation.defaultBuilds);
className={`deck-block-wrap ${selected ? 'is-selected' : ''} slot-${placement.slotId} ${revealed ? 'anim-in' : 'build-hidden'}`}
style={{ ...frameStyles, animationDelay: `${(block.animation?.order ?? 0) * 120}ms` }}
```

Add helper:

```tsx
function revealStepFor(block: Block, slide: DeckSlide, defaultBuilds: boolean): number {
  const anim = block.animation;
  if (anim) {
    if (anim.trigger === 'on-click') return anim.order ?? 0;
    if (anim.trigger === 'with-previous' || anim.trigger === 'after-previous') return (anim.order ?? 0) + 1;
    return 0;
  }
  return defaultBuilds ? 1 : 0;
}
```

Import `Block`/`DeckSlide` types as needed. Keep `memo` and existing props stable.

- [x] **Step 3: Add transition + build CSS**

In `examples/02-example/src/styles.css`, under `/* ---------- Presenter ---------- */`, add:

```css
.presenter-stage .deck-slide {
  opacity: 0;
}
.presenter-stage .deck-slide.is-current {
  opacity: 1;
}
.presenter-stage .deck-slide.is-current.slide-enter {
  animation: deck-slide-in 380ms ease-out both;
}
@keyframes deck-slide-in {
  from { opacity: 0; transform: translateY(18px); }
  to { opacity: 1; transform: translateY(0); }
}
.deck-block-wrap.build-hidden {
  opacity: 0;
  pointer-events: none;
}
.deck-block-wrap.anim-in {
  animation: deck-block-in 460ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}
@keyframes deck-block-in {
  from { opacity: 0; transform: translateY(14px); }
  to { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  .presenter-stage .deck-slide,
  .deck-block-wrap { animation: none !important; transition: none !important; opacity: 1 !important; }
}
```

- [x] **Step 4: Wire the current-slide class in PresenterApp**

In `PresenterApp.tsx`, give the current slide wrapper `is-current` and a re-triggering `slide-enter` key:

```tsx
<SlideRenderer key={safeIndex} deck={deck} slide={slide} scale={1} buildIndex={buildIndex} />
```

and wrap in a div `className="presenter-stage-slide is-current slide-enter"` so the CSS transition fires on index change. Ensure `.presenter-stage` centers this wrapper (keep flex layout).

- [x] **Step 5: Build and verify**

Run: `& npm.cmd run build` in `examples/02-example`
Expected: `tsc` passes and Vite build succeeds.

- [x] **Step 6: Commit**

```bash
git add examples/02-example/src/render/SlideRenderer.tsx examples/02-example/src/presenter/PresenterApp.tsx examples/02-example/src/styles.css
git commit -m "feat(example): add slide transitions and build-step motion to presenter"
```

---

### Task 7: Dock presenter chrome and fix editor dead space in 02-example

**Files:**
- Modify: `examples/02-example/src/presenter/PresenterApp.tsx`
- Modify: `examples/02-example/src/editor/EditorApp.tsx`
- Modify: `examples/02-example/src/styles.css`
- Test: build + `validate_output_contract.py`

**Interfaces:**
- Consumes: existing presenter/editor components.
- Produces: timer lives in the docked chrome bar (not absolute top-right); chrome auto-hides in fullscreen; notes strip is a direct grid child and collapsible; no empty grid band.

- [x] **Step 1: Move the timer into the chrome bar**

In `PresenterApp.tsx`, remove the standalone `<div className="presenter-timer">` block that sits above `.presenter-controls`; instead render the timer inside the chrome bar on the right:

```tsx
<div className="presenter-chrome">
  <div className="presenter-controls"> ...existing buttons... </div>
  <div className="presenter-timer">
    {timerVisible ? `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}` : 'T: timer'}
  </div>
</div>
```

- [x] **Step 2: Update CSS for docked chrome + fullscreen auto-hide**

Replace the `.presenter-timer` rule:

```css
.presenter-timer {
  margin-left: auto;
  color: #94a3b8;
  font-family: var(--font-code);
  font-size: 13px;
}
```

Add fullscreen auto-hide behavior:

```css
.presenter-shell:fullscreen .presenter-chrome {
  opacity: 0;
  transform: translateY(100%);
  transition: opacity 260ms ease, transform 260ms ease;
}
.presenter-shell:fullscreen.is-chrome-active .presenter-chrome {
  opacity: 1;
  transform: translateY(0);
}
```

- [x] **Step 3: Toggle chrome on pointer-move in fullscreen**

In `PresenterApp.tsx`, add state and effect:

```tsx
const [chromeActive, setChromeActive] = useState(true);
const chromeTimer = useRef<number | undefined>(undefined);
useEffect(() => {
  const onMove = () => {
    setChromeActive(true);
    window.clearTimeout(chromeTimer.current);
    chromeTimer.current = window.setTimeout(() => {
      if (document.fullscreenElement) setChromeActive(false);
    }, 2500);
  };
  window.addEventListener('pointermove', onMove);
  return () => { window.removeEventListener('pointermove', onMove); window.clearTimeout(chromeTimer.current); };
}, []);
```

Add `is-chrome-active` to the shell className when `chromeActive`.

- [x] **Step 4: Fix editor notes as a direct grid child**

In `EditorApp.tsx`, move `<div className="editor-notes-area">...</div>` OUT of `<main className="editor-canvas">` and place it as a sibling of `<main>` and `<aside>` inside `.editor-shell`, immediately after `</main>`.

- [x] **Step 5: Make notes collapsible**

Add state `const [notesOpen, setNotesOpen] = useState(true);` in `EditorApp`. Give `.editor-notes-area` a header with a toggle button and add class `is-collapsed` when closed. In CSS:

```css
.editor-notes-area.is-collapsed { height: 44px; }
.editor-notes-area.is-collapsed textarea { display: none; }
```

- [x] **Step 6: Build and verify**

Run: `& npm.cmd run build` in `examples/02-example`
Expected: passes. Then:
Run: `python skills/deckforge/scripts/validate_output_contract.py examples/02-example --profile editable-deck`
Expected: PASS, no missing required checks.

- [x] **Step 7: Commit**

```bash
git add examples/02-example/src/presenter/PresenterApp.tsx examples/02-example/src/editor/EditorApp.tsx examples/02-example/src/styles.css
git commit -m "fix(example): dock presenter chrome and fix editor notes layout"
```

---

### Task 8: Add default-motion fallback and chrome rules to 01-example

**Files:**
- Modify: `examples/01-example/app.js`
- Modify: `examples/01-example/styles.css`
- Test: `node --check examples/01-example/app.js`

**Interfaces:**
- Consumes: existing build-step model (`computeBuildModel`, `applyState`).
- Produces: blocks without explicit `animation` still animate on first reveal (fade-up) when motion is on; HUD/controls stay out of the slide area and auto-hide in fullscreen.

- [x] **Step 1: Default animation fallback in `applyState`**

In `app.js` `applyState`, the block entrance branch currently requires `block.animation`:

```js
if (block && block.animation && state.motion && !done.has(bid)) {
```

Change to also treat non-animated blocks as default-fade when the deck is motion-ready and `state.motion`:

```js
const anim = block && block.animation;
const useDefault = state.motion && (!anim || anim.trigger === 'on-enter') && !done.has(bid);
if (anim && state.motion && !done.has(bid)) {
  bEl.classList.add('anim-in');
  bEl.style.animationDelay = ((anim.order ?? 0) * 160) + 'ms';
  done.add(bid);
} else if (useDefault) {
  bEl.classList.add('anim-in');
  bEl.style.animationDelay = ((state.defaultAnimOrder ?? 0) * 160) + 'ms';
  done.add(bid);
}
```

Initialize `state.defaultAnimOrder = 0` and increment it per first-run block so blocks stagger.

- [x] **Step 2: Ensure timer chip stays in the HUD and hides in fullscreen**

In `styles.css`, `.deck-hud` and `.deck-controls` are already docked at the bottom. Add:

```css
body:fullscreen .deck-controls { opacity: 0; transform: translateY(10px); }
body:fullscreen:hover .deck-controls { opacity: 1; transform: translateY(0); }
body:fullscreen .deck-hud { opacity: 0; }
body:fullscreen:hover .deck-hud { opacity: 1; }
```

- [x] **Step 3: Syntax-check**

Run: `node --check examples/01-example/app.js`
Expected: no output, exit 0.

- [x] **Step 4: Commit**

```bash
git add examples/01-example/app.js examples/01-example/styles.css
git commit -m "feat(example): default block motion and fullscreen chrome auto-hide"
```

---

### Task 9: Update starter components (motion + chrome + app-shell)

**Files:**
- Modify: `skills/deckforge/starter-components/AnimationRuntime.tsx`
- Modify: `skills/deckforge/starter-components/base.css`
- Modify: `skills/deckforge/starter-components/DeckStage.tsx`
- Modify: `skills/deckforge/starter-components/PresenterView.tsx`
- Modify: `skills/deckforge/starter-components/DeckEditorShell.tsx`
- Modify: `skills/deckforge/starter-components/deck-types.ts`
- Test: `npm.cmd run build` in `examples/02-example` (references the same pattern) and `npm run validate` later

**Interfaces:**
- Consumes: `Block.animation`, `presentation.defaultBuilds`, `presentation.motionProfileId`.
- Produces: reusable motion types/helpers, motion CSS classes, build-aware stage, docked presenter chrome, app-shell editor.

- [x] **Step 1: Add motion types to `deck-types.ts`**

Add `motionProfileId?: string; defaultBuilds?: boolean;` to the `presentation` interface and ensure `BlockAnimation` has `order`/`trigger` (already present).

- [x] **Step 2: Expand `AnimationRuntime.tsx`**

Add a build-step model helper:

```tsx
export type BuildStep = { blockId: string; order: number };

export function buildStepsForSlide(blocks: DeckBlock[], defaultBuilds: boolean): BuildStep[] {
  const steps = blocks
    .filter((b) => b.animation || defaultBuilds)
    .sort((a, b) => (a.animation?.order ?? 0) - (b.animation?.order ?? 0))
    .map((b) => ({ blockId: b.id, order: b.animation?.order ?? 0 }));
  return defaultBuilds ? steps : steps.filter((s) => blocks.find((b) => b.id === s.blockId)?.animation);
}

export function isBlockRevealed(blockId: string, blocks: DeckBlock[], buildIndex: number, defaultBuilds: boolean): boolean {
  const steps = buildStepsForSlide(blocks, defaultBuilds);
  const idx = steps.findIndex((s) => s.blockId === blockId);
  return idx === -1 ? buildIndex >= 1 : buildIndex >= idx;
}
```

- [x] **Step 3: Add motion CSS to `base.css`**

Append:

```css
.deck-block[data-revealed="false"] { opacity: 0; }
.deck-block[data-revealed="true"] { animation: deck-block-in 460ms cubic-bezier(0.22,0.61,0.36,1) both; }
@keyframes deck-block-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
.presenter-view { display:grid; grid-template-rows: minmax(0,1fr) auto; place-items:stretch center; }
.presenter-view .deck-stage { grid-row:1; }
.presenter-chrome { grid-row:2; display:flex; gap:1rem; align-items:center; padding:.6rem 1rem; background:#0b1020; color:#e2e8f0; }
@media (prefers-reduced-motion:reduce) { .deck-block { animation:none !important; opacity:1 !important; } }
```

- [x] **Step 4: Make `DeckStage` build-aware**

Add `buildIndex?: number` and `defaultBuilds?: boolean` props. Wrap each block in `AnimatedBlock` (from `AnimationRuntime`) and compute `revealed` via `isBlockRevealed`:

```tsx
const revealed = isBlockRevealed(block.id, slide.blocks, buildIndex ?? Number.MAX_SAFE_INTEGER, defaultBuilds ?? false);
<div key={block.id} className={`deck-block ${revealed ? '' : 'is-hidden'}`} data-revealed={revealed}>
```

Keep existing layout-slot/freeform/background logic intact; apply the same wrapper in all three render paths (slot blocks, freeform, backgrounds).

- [x] **Step 5: Dock presenter chrome in `PresenterView.tsx`**

Add `buildIndex` state and build-aware navigation; move the position/progress into a docked `.presenter-chrome` bar:

```tsx
export function PresenterView({ deck, renderSlide }: { deck: DeckProject; renderSlide(index: number, buildIndex: number): React.ReactNode }) {
  const visible = useMemo(() => deck.slides.filter((s) => !s.hidden), [deck.slides]);
  const [index, setIndex] = useState(0);
  const [buildIndex, setBuildIndex] = useState(0);
  const slide = visible[index];
  const buildCount = Math.max(1, buildStepsForSlide(slide?.blocks ?? [], !!deck.presentation.defaultBuilds).length);
  const go = (next: number) => { setIndex(Math.min(Math.max(next,0),visible.length-1)); setBuildIndex(0); };
  const next = () => { if (buildIndex + 1 < buildCount) setBuildIndex(buildIndex+1); else go(index+1); };
  const previous = () => { if (buildIndex > 0) setBuildIndex(buildIndex-1); else go(index-1); };
  useDeckHotkeys({ next, previous, first: () => go(0), last: () => go(visible.length-1) });
  return (
    <main className="presenter-view" aria-live="polite">
      <div className="presenter-stage">{renderSlide(index, buildIndex)}</div>
      <div className="presenter-chrome">
        <button onClick={() => go(index-1)} disabled={index===0}>‹</button>
        <span>{index+1} / {visible.length}</span>
        <button onClick={() => go(index+1)} disabled={index===visible.length-1}>›</button>
      </div>
    </main>
  );
}
```

- [x] **Step 6: Verify `DeckEditorShell` grid is complete**

In `base.css`, confirm the editor grid maps every row (`appbar`, `rail/canvas/inspector`, `rail notes inspector`) to real elements and that `.deck-notes-area` is a direct grid child (it already is in `DeckEditorShell.tsx` as `<footer className="deck-notes-area">`). No change needed unless validation reveals a gap.

- [x] **Step 7: Commit**

```bash
git add skills/deckforge/starter-components/AnimationRuntime.tsx skills/deckforge/starter-components/base.css skills/deckforge/starter-components/DeckStage.tsx skills/deckforge/starter-components/PresenterView.tsx skills/deckforge/starter-components/DeckEditorShell.tsx skills/deckforge/starter-components/deck-types.ts
git commit -m "feat(starter): motion-aware stage and docked presenter chrome"
```

---

### Task 10: Focused theme/content guidance

**Files:**
- Modify: `skills/deckforge/built-in-skills/template-and-theme.md`
- Modify: `skills/deckforge/built-in-skills/data-and-diagrams.md`
- Modify: `skills/deckforge/built-in-skills/asset-and-media-workflow.md`
- Modify: `skills/deckforge/built-in-skills/composition-and-layout-engine.md`

**Interfaces:**
- Consumes: nothing at runtime.
- Produces: tightened agent guidance for theme vs template, charts inside slots, image fit/crop, and content budgets.

- [x] **Step 1: `template-and-theme.md`**

Add a rule: a theme must never replace narrative structure; select archetype + template first, then theme; document the theme's `antiPatterns` as blockers.

- [x] **Step 2: `data-and-diagrams.md`**

Add: charts/diagrams must stay inside their assigned slot frame; no decorative charts or invented metrics; every chart has a question, takeaway, units, source, and accessible summary.

- [x] **Step 3: `asset-and-media-workflow.md`**

Add: set `fit` (`cover`/`contain`) and focal point explicitly; never stretch images; respect alt text; lazy-load below-the-fold media.

- [x] **Step 4: `composition-and-layout-engine.md`**

Add: enforce `contentBudget` per slot; when content overflows, shorten/split/change layout, never shrink text below readable size; surface warnings in the editor.

- [x] **Step 5: Commit**

```bash
git add skills/deckforge/built-in-skills/template-and-theme.md skills/deckforge/built-in-skills/data-and-diagrams.md skills/deckforge/built-in-skills/asset-and-media-workflow.md skills/deckforge/built-in-skills/composition-and-layout-engine.md
git commit -m "docs(skills): tighten theme, chart, media, and layout guidance"
```

---

### Task 11: Final validation pass

**Files:**
- Modify: none (verification only) unless a check fails.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: green end-to-end validation.

- [x] **Step 1: Run the full validate suite**

Run: `npm.cmd run validate`
Expected: exit 0, every `PASS`, `OK:`, and unittest PASS, with no ERROR lines.

- [x] **Step 2: Run motion audits on all example decks**

Run:
```bash
python scripts/audit_deck_motion.py examples/02-example/deck.json
python scripts/audit_deck_motion.py examples/ai-product-vision.deck.json
```
Expected: `MOTION: ... 0 errors` both.

- [x] **Step 3: Run the layout audit in strict mode**

Run: `python scripts/audit_deck_layout.py examples/02-example/deck.json --strict`
Expected: exit 0.

- [x] **Step 4: Build the editable example**

Run: `& npm.cmd run build` in `examples/02-example`
Expected: `tsc` + Vite build succeed.

- [x] **Step 5: Confirm schema parity**

Run: `python -c "import json;print(json.load(open('schemas/deck-project.schema.json'))==json.load(open('skills/deckforge/assets/deck-project.schema.json')))"`
Expected: `True`.

- [x] **Step 6: Report results**

Report exact commands, exit codes, and any remaining limitations to the user. Do not claim browser/interaction testing that was not performed.



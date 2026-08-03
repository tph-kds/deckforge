# Task 20: Final Validation and Testing

**Files:**
- All files created in previous tasks

## Steps

- [ ] **Step 1: Run TypeScript type checking**

```bash
cd examples/02-example
npx tsc --noEmit
```

Expected: No type errors in export subsystem

- [ ] **Step 2: Run linting**

```bash
cd examples/02-example
npx eslint src/
```

Expected: No lint errors in export code

- [ ] **Step 3: Test export creates valid PPTX**

Create a test DeckProject and run export:

```typescript
const testDeck = {
  schemaVersion: "2.1",
  meta: { title: "Test Deck" },
  canvas: { width: 13.333, height: 7.5 },
  slides: [
    {
      id: "slide-1",
      blocks: [
        { id: "b1", type: "text", content: "Hello World", x: 1, y: 1, w: 10, h: 1 },
        { id: "b2", type: "shape", shapeType: "rectangle", fill: "#1A73E8", x: 2, y: 3, w: 4, h: 2 },
      ],
    },
  ],
};

const exporter = new PptxExporter(DEFAULT_PPTX_CONFIG);
const blob = await exporter.export(testDeck);
console.assert(blob.size > 0, "PPTX export should produce non-empty blob");
console.assert(blob.type === "application/vnd.openxmlformats-officedocument.presentationml.presentation", "Correct MIME type");
```

- [ ] **Step 4: Test preflight scoring**

```typescript
const result = await runExportPreflight(testDeck, DEFAULT_PPTX_CONFIG);
console.assert(result.score >= 0 && result.score <= 100, "Score in valid range");
console.assert(result.blockCoverage >= 0 && result.blockCoverage <= 1, "Coverage in valid range");
```

- [ ] **Step 5: Test font warnings**

```typescript
const deckWithCustomFont = {
  slides: [{ blocks: [{ type: "text", fontFamily: "CustomFont" }] }],
};
const warnings = collectFontWarnings(deckWithCustomFont);
console.assert(warnings.length === 1, "Should warn about custom font");
```

- [ ] **Step 6: Validate schema**

```bash
python scripts/validate_deck_project.py examples/02-example/deck.json --schema schemas/deck-project.schema.json
```

Expected: Schema validation passes

- [ ] **Step 7: Package skills**

```bash
npm run package-skills
```

Expected: deckforge-export skill packaged successfully

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "feat: complete PPTX export subsystem with Export Center and deckforge-export skill"
```

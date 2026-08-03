# Task 17: Example App Integration

**Files:**
- Modify: `examples/02-example/package.json`
- Modify: `examples/02-example/src/App.tsx`

## Steps

- [ ] **Step 1: Add pptxgenjs dependency**

Add to `examples/02-example/package.json`:

```json
{
  "dependencies": {
    "pptxgenjs": "^3.12.0"
  }
}
```

- [ ] **Step 2: Wire up Export Center in App.tsx**

Add import and state to `examples/02-example/src/App.tsx`:

```tsx
import { ExportDialog } from "../../../starter-components/export/export-dialog";

// Inside component:
const [showExportDialog, setShowExportDialog] = useState(false);

// Add export button to toolbar:
<button onClick={() => setShowExportDialog(true)}>
  Export PPTX
</button>

// Add dialog:
<ExportDialog
  deck={deckProject}
  isOpen={showExportDialog}
  onClose={() => setShowExportDialog(false)}
  onExport={(blob) => console.log("Export complete", blob.size)}
  onError={(err) => console.error("Export failed", err)}
/>
```

- [ ] **Step 3: Commit**

```bash
git add examples/02-example/
git commit -m "feat: wire up Export Center in example app"
```

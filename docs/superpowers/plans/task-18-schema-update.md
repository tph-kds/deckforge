# Task 18: Schema Configuration

**Files:**
- Modify: `schemas/deck-project.schema.json`

## Steps

- [ ] **Step 1: Add delivery.exports.pptx to schema**

Add the following block to `schemas/deck-project.schema.json` under the top-level properties:

```json
{
  "delivery": {
    "type": "object",
    "properties": {
      "exports": {
        "type": "object",
        "properties": {
          "pptx": {
            "type": "object",
            "properties": {
              "enabled": { "type": "boolean", "default": true },
              "defaultMode": { "type": "string", "enum": ["hybrid"], "default": "hybrid" },
              "allowedModes": {
                "type": "array",
                "items": { "type": "string", "enum": ["hybrid"] },
                "default": ["hybrid"]
              },
              "compatibilityTargets": {
                "type": "array",
                "items": { "type": "string" },
                "default": ["powerpoint", "keynote", "libreoffice"]
              },
              "includeSpeakerNotes": { "type": "boolean", "default": true },
              "includeHiddenSlides": { "type": "boolean", "default": false },
              "fontPolicy": { "type": "string", "enum": ["warn-and-substitute", "embed-when-licensed"], "default": "warn-and-substitute" },
              "filenameTemplate": { "type": "string", "default": "{title}-{date}.pptx" }
            }
          }
        }
      }
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add schemas/deck-project.schema.json
git commit -m "feat: add delivery.exports.pptx schema configuration"
```

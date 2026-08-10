# Export Preflight Workflow

## Purpose

Inspect deck before export and report issues.

## Checks

- Font compatibility
- Unsupported block types
- CSS filter effects
- External assets
- Missing speaker notes
- Content outside safe area
- Content-parity estimate (recall, fallback count, missing-block count)

## Scoring

- Start at 100
- Error: -20
- Warning: -5
- Info: -1
- Clamp to 0-100

## Output

- ExportPreflightResult with issues, score, blockCoverage, estimatedRecall, estimatedFallbacks, estimatedMissing

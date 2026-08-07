---
name: deckforge-skill-evaluator
description: Evaluate and improve DeckForge Agent Skills by comparing baseline, current, and candidate conditions on deterministic outcome tests, trigger precision, blind review, context cost, runtime, and cross-agent consistency. Use for skill development and release gates; do not use for end-user deck creation.
version: 1.0.0
user-invocable: false
license: MIT
---

# deckforge-skill-evaluator

Development evaluator. Grade outcomes, not whether the agent mentioned an internal step.

1. Identify the intended outcome.
2. Select three to five high-quality tasks from `evals/core-eval-cases.json`.
3. Create baseline, current, and candidate conditions.
4. Validate automated graders against reference results.
5. Run install, trigger, build, behavior, accessibility, visual, and export assertions.
6. Run across supported agents where applicable.
7. Blind human reviewers to condition labels.
8. Measure quality delta, variance, context cost, runtime, and false claims.
9. Analyze failures and revise.
10. Block release when critical tasks regress.

Read `references/blind-review-protocol.md` and `assets/quality-rubric.json`, plus the
shared contract at `../deckforge/references/skill-evaluation-contract.md`. Write results
per `../../schemas/skill-eval-result.schema.json` and `../../schemas/trigger-eval-result.schema.json`.

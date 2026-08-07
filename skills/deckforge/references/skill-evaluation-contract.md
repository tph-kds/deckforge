# Skill Evaluation Contract

- Outcomes are graded, not whether the agent mentioned an internal step.
- Conditions compared: baseline (no skill), current, and candidate.
- Deterministic assertions: install, trigger, build, behavior, accessibility, visual, export.
- Trigger precision: positive prompts must route to the right skill; negative prompts must not load unrelated guidance.
- Blind reviewers are not told condition labels.
- Track quality delta, variance, context cost, runtime, and false claims.
- A skill change must demonstrate a measurable outcome delta without critical regressions; otherwise it does not ship.

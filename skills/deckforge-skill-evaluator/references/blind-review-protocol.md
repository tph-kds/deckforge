# Blind Review Protocol

- Human reviewers receive outputs labeled only by condition ID (A, B, C); the condition-to-label mapping is secret.
- Review against `assets/quality-rubric.json`: subject specificity, story clarity, hierarchy, typography, composition, controlled diversity, editor usability, presenter confidence, data honesty, overall professionalism.
- A condition passes only when it scores at or above the release threshold on critical dimensions and introduces no critical failures.
- After scoring, reveal labels and record the mapping in the comparison report.

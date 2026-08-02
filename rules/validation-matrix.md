# Validation Matrix

| Change | Checks |
|---|---|
| Skill or reference | `python scripts/lint_skills.py` |
| Catalog, toolbar, interaction, or theme | `python scripts/validate_catalogs.py` |
| JSON or Markdown link | `python scripts/validate_repository_assets.py` |
| Deck schema/example | `python scripts/validate_deck_project.py examples/ai-product-vision.deck.json` |
| Rules or boundaries | `python scripts/check_rules.py` |
| Starter component | unit tests plus TypeScript review in the target project |
| Release package | `npm run validate` and `npm run package-skills` |
| Agent Skills CLI | `bash scripts/check-skills-cli-compat.sh .` in an environment with the public npm registry |

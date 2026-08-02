#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "${1:-.}" && pwd)"

echo "Checking DeckForge skill discovery from: ${REPO_ROOT}"
npx --yes skills@latest add "${REPO_ROOT}" --list

echo "Installing the main skill into a temporary Codex target..."
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT
(
  cd "${TMP_DIR}"
  npx --yes skills@latest add "${REPO_ROOT}" --skill deckforge --agent codex --yes --copy
  test -f .agents/skills/deckforge/SKILL.md
  test -f .agents/skills/deckforge/system-prompt.md
)

echo "Agent Skills CLI compatibility check passed."

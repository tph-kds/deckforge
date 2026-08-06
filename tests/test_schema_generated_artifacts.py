#!/usr/bin/env python3
"""Check the generated schema artifacts compile as TypeScript and validate decks.

This test runs the TypeScript compiler over the generated artifacts to ensure
they stay type-correct, and executes the generated runtime validator against a
real DeckProject fixture to prove the validator behaves.
"""
from __future__ import annotations
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXAMPLE = ROOT / "examples" / "02-example"
TSC = EXAMPLE / "node_modules" / "typescript" / "bin" / "tsc"
GENERATED = ROOT / "schemas" / "generated"
FIXTURE = ROOT / "examples" / "02-example" / "deck.json"

HARNESS = r"""
const { validateDeckProject, isValidDeckProject } = require("./deck-project.validator.js");
const fs = require("fs");
const deck = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const result = validateDeckProject(deck);
if (!result.valid) {
  console.error(JSON.stringify(result.issues, null, 2));
  process.exit(1);
}
if (!isValidDeckProject(deck)) {
  console.error("isValidDeckProject returned false for a valid deck");
  process.exit(1);
}

const clone = (x) => JSON.parse(JSON.stringify(x));

const cases = [
  {
    name: "top-level slide array replaced",
    mutate: (d) => { d.slides = "not-an-array"; },
  },
  {
    name: "nested block type empty string",
    mutate: (d) => { d.slides[0].blocks[0].type = ""; },
  },
  {
    name: "nested block sourceIds duplicate",
    mutate: (d) => { d.slides[0].blocks[0].sourceIds = ["a", "a"]; },
  },
  {
    name: "nested animation durationMs out of range",
    mutate: (d) => { d.slides[0].blocks[0].animation = { id: "a1", durationMs: 999999 }; },
  },
  {
    name: "nested animation missing required id",
    mutate: (d) => { d.slides[0].blocks[0].animation = { trigger: "on-enter" }; },
  },
  {
    name: "nested animation disallowed extra property",
    mutate: (d) => { d.slides[0].blocks[0].animation = { id: "a1", bogus: true }; },
  },
  {
    name: "asset width below minimum",
    mutate: (d) => { d.assets[0].width = 0; },
  },
  {
    name: "canvas aspectRatio not in enum",
    mutate: (d) => { d.canvas.aspectRatio = "13:7"; },
  },
  {
    name: "slide layout empty string",
    mutate: (d) => { d.slides[0].layout = ""; },
  },
  {
    name: "missing required top-level property",
    mutate: (d) => { delete d.editor; },
  },
];

for (const tc of cases) {
  const broken = clone(deck);
  tc.mutate(broken);
  const r = validateDeckProject(broken);
  if (r.valid) {
    console.error("validator accepted invalid deck: " + tc.name);
    process.exit(1);
  }
}

console.log("OK: validator accepted deck.json and rejected 10 invalid decks");
"""


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, capture_output=True, text=True, check=False)


def tsc(*args: str) -> subprocess.CompletedProcess:
    return run(["node", str(TSC), *args])


@unittest.skipUnless(TSC.exists(), "typescript not installed in examples/02-example")
class GeneratedSchemaArtifactsTest(unittest.TestCase):
    def test_types_compile(self) -> None:
        result = tsc(
            "--noEmit", "--strict", "--moduleResolution", "bundler",
            "--module", "esnext", "--target", "es2020",
            str(GENERATED / "deck-project.types.ts"),
            str(GENERATED / "deck-project.validator.ts"),
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    @unittest.skipUnless(FIXTURE.exists(), "deck.json fixture missing")
    def test_validator_runtime_behavior(self) -> None:
        deck = json.loads(FIXTURE.read_text(encoding="utf-8"))
        self.assertIsInstance(deck, dict)

        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            (tmp_path / "generated").mkdir()
            for name in ("deck-project.types.ts", "deck-project.validator.ts"):
                shutil.copy2(GENERATED / name, tmp_path / "generated" / name)

            build = tsc(
                "--outDir", tmp, "--module", "commonjs",
                "--moduleResolution", "node", "--target", "es2020",
                "--skipLibCheck", str(tmp_path / "generated" / "deck-project.validator.ts"),
            )
            self.assertEqual(build.returncode, 0, build.stdout + build.stderr)

            harness_path = tmp_path / "harness.js"
            harness_path.write_text(HARNESS, encoding="utf-8")
            run_js = run(["node", str(harness_path), str(FIXTURE)])
            self.assertEqual(run_js.returncode, 0, run_js.stdout + run_js.stderr)


if __name__ == "__main__":
    unittest.main()

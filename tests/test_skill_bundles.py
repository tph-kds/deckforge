import shutil, subprocess, sys, tempfile, unittest, zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACKAGER = ROOT / 'scripts' / 'package' / 'package_skill_zips.py'
VALIDATOR = ROOT / 'scripts' / 'validate' / 'validate_skill_bundles.py'
SKILLS = ROOT / 'skills'
OUT = ROOT / 'skill-zips'


def run_script(script: Path, *args: str) -> tuple[int, str]:
    proc = subprocess.run([sys.executable, str(script), *args], capture_output=True, text=True)
    return proc.returncode, (proc.stdout + proc.stderr)


class SkillBundlePackagingTests(unittest.TestCase):
    def setUp(self):
        self._zips = OUT if OUT.exists() else None

    def tearDown(self):
        if self._zips is not None:
            shutil.rmtree(self._zips, ignore_errors=True)

    def test_packaging_produces_self_contained_bundles(self):
        code, output = run_script(PACKAGER)
        self.assertEqual(code, 0, output)
        zips = sorted(OUT.glob('*.zip'))
        names = {z.stem for z in zips}
        self.assertEqual(names, {d.name for d in SKILLS.iterdir() if (d / 'SKILL.md').exists()})
        self.assertGreaterEqual(len(zips), 5, output)
        for z in zips:
            with zipfile.ZipFile(z) as archive:
                self.assertTrue(any('SKILL.md' in n for n in archive.namelist()), f'{z.name} missing SKILL.md')

    def test_every_bundle_passes_extraction_validation(self):
        run_script(PACKAGER)
        code, output = run_script(VALIDATOR, str(OUT))
        self.assertEqual(code, 0, output)
        self.assertIn('PASS deckforge.zip', output)

    def test_bundle_without_skill_md_fails(self):
        with tempfile.TemporaryDirectory() as tmp:
            bogus = Path(tmp) / 'empty.zip'
            with zipfile.ZipFile(bogus, 'w'):
                pass
            code, output = run_script(VALIDATOR, tmp)
            self.assertNotEqual(code, 0)
            self.assertIn('missing SKILL.md', output)


if __name__ == '__main__':
    unittest.main()

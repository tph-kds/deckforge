import shutil, subprocess, sys, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DETECTOR = ROOT / 'scripts' / 'tools' / 'detect_duplicates.py'

MIRROR_BYTES = b'{"schemaVersion":"1.0.0","capabilities":[]}'


def run_detector(root: Path, *args: str) -> tuple[int, str]:
    cmd = [sys.executable, str(DETECTOR), str(root), *args]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.returncode, proc.stdout + proc.stderr


def write(root: Path, rel: str, data: bytes) -> Path:
    path = root / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return path


class DuplicateDetectorTests(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix='deckforge-dups-'))

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def test_identical_files_reported_as_cluster(self):
        write(self.tmp, 'a.txt', b'identical content here')
        write(self.tmp, 'b.txt', b'identical content here')
        code, output = run_detector(self.tmp)
        self.assertEqual(code, 0)
        self.assertIn('DUPLICATE CLUSTER', output)
        self.assertIn('a.txt', output)
        self.assertIn('b.txt', output)

    def test_different_content_is_not_a_cluster(self):
        write(self.tmp, 'a.txt', b'alpha content here')
        write(self.tmp, 'b.txt', b'bravo content here')
        code, output = run_detector(self.tmp, '--check')
        self.assertEqual(code, 0, output)
        self.assertIn('OK', output)

    def test_check_exits_nonzero_on_unexpected_duplicate(self):
        write(self.tmp, 'x.txt', b'duplicate me please')
        write(self.tmp, 'y.txt', b'duplicate me please')
        code, output = run_detector(self.tmp, '--check')
        self.assertNotEqual(code, 0)
        self.assertIn('x.txt', output)
        self.assertIn('y.txt', output)
        self.assertIn('ERROR', output)

    def test_check_exits_zero_when_clean(self):
        write(self.tmp, 'x.txt', b'unique first file')
        write(self.tmp, 'y.txt', b'unique second file')
        code, output = run_detector(self.tmp, '--check')
        self.assertEqual(code, 0, output)

    def test_schema_asset_mirror_is_ignored(self):
        write(self.tmp, 'schemas/capability-catalog.json', MIRROR_BYTES)
        write(self.tmp, 'skills/deckforge/assets/capability-catalog.json', MIRROR_BYTES)
        code, output = run_detector(self.tmp, '--check')
        self.assertEqual(code, 0, output)
        self.assertNotIn('capability-catalog.json', output)

    def test_embedded_agent_skill_copy_is_ignored(self):
        write(self.tmp, 'skills/deckforge/assets/capability-catalog.json', MIRROR_BYTES)
        write(self.tmp, 'examples/01-example/.agents/skills/deckforge/assets/capability-catalog.json', MIRROR_BYTES)
        code, output = run_detector(self.tmp, '--check')
        self.assertEqual(code, 0, output)
        self.assertNotIn('capability-catalog.json', output)

    def test_unexpected_copy_inside_ignored_cluster_still_reported(self):
        write(self.tmp, 'schemas/capability-catalog.json', MIRROR_BYTES)
        write(self.tmp, 'skills/deckforge/assets/capability-catalog.json', MIRROR_BYTES)
        write(self.tmp, 'src/copy.json', MIRROR_BYTES)
        code, output = run_detector(self.tmp, '--check')
        self.assertNotEqual(code, 0)
        self.assertIn('copy.json', output)

    def test_min_size_floor_skips_small_files(self):
        write(self.tmp, 'a.txt', b'ab')
        write(self.tmp, 'b.txt', b'ab')
        code, output = run_detector(self.tmp, '--check', '--min-size', '8')
        self.assertEqual(code, 0, output)
        code, output = run_detector(self.tmp, '--check', '--min-size', '1')
        self.assertNotEqual(code, 0)

    def test_min_size_boundary_is_exclusive(self):
        write(self.tmp, 'a.txt', b'12345678')
        write(self.tmp, 'b.txt', b'12345678')
        code, output = run_detector(self.tmp, '--check')
        self.assertEqual(code, 0, 'files of size exactly min-size must not be flagged')

    def test_help_documents_cli_surface(self):
        proc = subprocess.run([sys.executable, str(DETECTOR), '--help'], capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn('--check', proc.stdout)
        self.assertIn('--min-size', proc.stdout)


if __name__ == '__main__':
    unittest.main()

import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class TestScaffoldSync(unittest.TestCase):
    def test_scaffold_deck_and_export_in_sync(self):
        result = subprocess.run(
            [sys.executable, str(ROOT / "scripts/sync/check_scaffold_sync.py"), "--check"],
            capture_output=True,
            text=True,
        )
        self.assertEqual(
            result.returncode, 0,
            msg=f"scaffold drift:\n{result.stdout}\n{result.stderr}",
        )


if __name__ == "__main__":
    unittest.main()

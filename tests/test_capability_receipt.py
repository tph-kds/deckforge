import json, shutil, subprocess, sys, tempfile, unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RECEIPT_VALIDATOR = ROOT / 'scripts' / 'validate' / 'validate_capability_receipt.py'
SAMPLE_RECEIPT = ROOT / 'examples' / '02-example' / 'capability-receipt.json'
CATALOG = ROOT / 'schemas' / 'capability-catalog.json'
RECEIPT_SCHEMA = ROOT / 'schemas' / 'capability-receipt.schema.json'
PROFILES = ROOT / 'skills' / 'deckforge' / 'assets' / 'delivery-profile-manifest.json'


def run_validator(receipt_path: Path, strict: bool = False) -> tuple[int, str]:
    cmd = [sys.executable, str(RECEIPT_VALIDATOR), str(receipt_path)]
    if strict:
        cmd.append('--strict')
    proc = subprocess.run(cmd, capture_output=True, text=True)
    return proc.returncode, (proc.stdout + proc.stderr)


class CapabilityCatalogTests(unittest.TestCase):
    def test_catalog_structure(self):
        catalog = json.loads(CATALOG.read_text(encoding='utf-8'))
        self.assertEqual(catalog['schemaVersion'], '1.0.0')
        ids = [c['id'] for c in catalog['capabilities']]
        self.assertEqual(len(ids), len(set(ids)), 'capability IDs must be unique')
        for cap in catalog['capabilities']:
            self.assertIn('.', cap['id'], 'capability IDs must be dot-namespaced')
            self.assertIn('evidence', cap)
            for key in ('requiresEntryPoints', 'requiresCommands', 'requiresPersistence', 'requiresTests', 'requiresVisual'):
                self.assertIn(key, cap['evidence'])
            for status in ('implemented', 'partial', 'unsupported', 'unverified', 'blocked'):
                self.assertIn(status, catalog['statuses'])

    def test_receipt_schema_is_valid_json_schema(self):
        schema = json.loads(RECEIPT_SCHEMA.read_text(encoding='utf-8'))
        self.assertEqual(schema['type'], 'object')
        self.assertIn('capabilityClaim', schema['$defs'])

    def test_profile_required_ids_exist_in_catalog(self):
        catalog_ids = {c['id'] for c in json.loads(CATALOG.read_text(encoding='utf-8'))['capabilities']}
        profiles = json.loads(PROFILES.read_text(encoding='utf-8'))
        for profile in profiles:
            for cap_id in profile.get('requiredCapabilityIds', []):
                self.assertIn(cap_id, catalog_ids, f"profile {profile['id']} references unknown {cap_id}")

    def test_sample_receipt_validates(self):
        code, output = run_validator(SAMPLE_RECEIPT)
        self.assertEqual(code, 0, output)
        self.assertIn('RECEIPT: PASS', output)


class CapabilityReceiptValidationTests(unittest.TestCase):
    def setUp(self):
        self.receipt = json.loads(SAMPLE_RECEIPT.read_text(encoding='utf-8'))

    def tearDown(self):
        for path in getattr(self, '_tmp_dirs', []):
            shutil.rmtree(path, ignore_errors=True)

    def write_tmp(self, doc: dict) -> Path:
        tmp = Path(tempfile.mkdtemp(prefix='deckforge-receipt-'))
        self._tmp_dirs = getattr(self, '_tmp_dirs', []) + [tmp]
        path = tmp / 'capability-receipt.json'
        path.write_text(json.dumps(doc), encoding='utf-8')
        return path

    def test_unknown_capability_id_fails(self):
        doc = json.loads(json.dumps(self.receipt))
        doc['capabilities'] = {'not.a.real.capability': {'status': 'implemented', 'tests': ['x'], 'evidence': ['x']}}
        code, output = run_validator(self.write_tmp(doc))
        self.assertNotEqual(code, 0)
        self.assertIn('unknown ID', output)

    def test_implemented_without_evidence_fails(self):
        doc = json.loads(json.dumps(self.receipt))
        doc['capabilities'] = {'edit.text': {'status': 'implemented'}}
        code, output = run_validator(self.write_tmp(doc))
        self.assertNotEqual(code, 0)
        self.assertIn('requires at least one referenced test', output)

    def test_missing_evidence_file_fails(self):
        doc = json.loads(json.dumps(self.receipt))
        profile = doc['profile']
        profiles = {p['id']: p for p in json.loads(PROFILES.read_text(encoding='utf-8'))}
        required = profiles[profile]['requiredCapabilityIds']
        doc['capabilities'] = {
            cap_id: {
                'status': 'implemented',
                'entryPoints': ['X'],
                'commands': ['updateBlockContent'],
                'persistence': ['autosave'],
                'tests': ['tests/does-not-exist.test.ts'],
                'evidence': ['tests/does-not-exist.test.ts'],
            }
            for cap_id in required
        }
        code, output = run_validator(self.write_tmp(doc))
        self.assertNotEqual(code, 0)
        self.assertIn('does not exist', output)

    def test_missing_profile_capability_fails(self):
        doc = json.loads(json.dumps(self.receipt))
        del doc['capabilities']['edit.text']
        code, output = run_validator(self.write_tmp(doc))
        self.assertNotEqual(code, 0)
        self.assertIn('profile requires capabilities not claimed', output)

    def test_unknown_profile_fails(self):
        doc = json.loads(json.dumps(self.receipt))
        doc['profile'] = 'does-not-exist'
        code, output = run_validator(self.write_tmp(doc))
        self.assertNotEqual(code, 0)
        self.assertIn('unknown delivery profile', output)

    def test_strict_requires_implemented_profile_capabilities(self):
        doc = json.loads(json.dumps(self.receipt))
        code, output = run_validator(self.write_tmp(doc), strict=True)
        self.assertNotEqual(code, 0)
        self.assertIn('profile-required status must be implemented or partial', output)

    def test_invalid_status_fails(self):
        doc = json.loads(json.dumps(self.receipt))
        doc['capabilities'] = {'edit.text': {'status': 'magic'}}
        code, output = run_validator(self.write_tmp(doc))
        self.assertNotEqual(code, 0)
        self.assertIn('invalid status', output)


if __name__ == '__main__':
    unittest.main()

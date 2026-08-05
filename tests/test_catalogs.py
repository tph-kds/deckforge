import json, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'skills/deckforge/assets'
SCHEMAS=ROOT/'schemas'
class CatalogTests(unittest.TestCase):
 def load(self,name):return json.loads((ASSETS/name).read_text(encoding='utf-8'))
 def test_counts(self):
  expected={'template-manifest.json':30,'theme-manifest.json':30,'layout-manifest.json':20,'block-manifest.json':20,'animation-manifest.json':10,'interaction-manifest.json':20,'presenter-control-manifest.json':15,'export-manifest.json':5,'delivery-profile-manifest.json':4,'presentation-archetype-manifest.json':10}
  for filename,minimum in expected.items():self.assertGreaterEqual(len(self.load(filename)),minimum,filename)
 def test_unique_ids(self):
  keys={'template-manifest.json':'id','theme-manifest.json':'id','layout-manifest.json':'id','block-manifest.json':'type','animation-manifest.json':'id','interaction-manifest.json':'id','presenter-control-manifest.json':'id','export-manifest.json':'id','delivery-profile-manifest.json':'id','presentation-archetype-manifest.json':'id'}
  for filename,key in keys.items():
   ids=[x[key] for x in self.load(filename)];self.assertEqual(len(ids),len(set(ids)),filename)
 def test_layout_contracts(self):
  for layout in self.load('layout-manifest.json'):
   comp=layout['composition'];self.assertEqual(comp['grid']['columns'],12);self.assertEqual(comp['grid']['rows'],8);self.assertTrue(comp['slots'])
 def test_template_layout_references(self):
  layouts={x['id'] for x in self.load('layout-manifest.json')}
  for template in self.load('template-manifest.json'):
   for step in template['slidePlan']:self.assertIn(step['layout'],layouts,template['id'])
 def test_capability_catalog_mirrors(self):
  catalog=json.loads((SCHEMAS/'capability-catalog.json').read_text(encoding='utf-8'))
  mirrored=json.loads((ASSETS/'capability-catalog.json').read_text(encoding='utf-8'))
  self.assertEqual(catalog,mirrored,'capability catalog must be mirrored into the skill asset')
 def test_capability_receipt_schema_mirrors(self):
  schema=json.loads((SCHEMAS/'capability-receipt.schema.json').read_text(encoding='utf-8'))
  mirrored=json.loads((ASSETS/'capability-receipt.schema.json').read_text(encoding='utf-8'))
  self.assertEqual(schema,mirrored,'capability receipt schema must be mirrored into the skill asset')
 def test_profile_capability_ids_reference_catalog(self):
  catalog_ids={c['id'] for c in json.loads((SCHEMAS/'capability-catalog.json').read_text(encoding='utf-8'))['capabilities']}
  for profile in self.load('delivery-profile-manifest.json'):
   for cap_id in profile.get('requiredCapabilityIds',[]):
    self.assertIn(cap_id,catalog_ids,f"profile {profile['id']} references unknown capability {cap_id}")
if __name__=='__main__':unittest.main()

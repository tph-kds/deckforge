#!/usr/bin/env python3
"""Validate DeckForge catalogs, semantic layout contracts, and cross-references."""
from __future__ import annotations
import json, sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/'skills'/'deckforge'/'assets'
LIST_CHECKS={
 'theme-manifest.json':(30,'id'),
 'template-manifest.json':(30,'id'),
 'layout-manifest.json':(20,'id'),
 'block-manifest.json':(20,'type'),
 'animation-manifest.json':(10,'id'),
 'interaction-manifest.json':(20,'id'),
 'presenter-control-manifest.json':(15,'id'),
 'export-manifest.json':(5,'id'),
 'delivery-profile-manifest.json':(4,'id'),
 'presentation-archetype-manifest.json':(10,'id'),
 'motion-profile-manifest.json':(8,'id'),
}

def load(name):return json.loads((BASE/name).read_text(encoding='utf-8'))

def main():
 errors=[];catalogs={}
 for name,(minimum,key) in LIST_CHECKS.items():
  try:data=load(name)
  except Exception as exc:errors.append(f'{name}: invalid JSON: {exc}');continue
  catalogs[name]=data
  if not isinstance(data,list) or len(data)<minimum:errors.append(f'{name}: expected at least {minimum} entries');continue
  ids=[item.get(key) for item in data if isinstance(item,dict)]
  if len(ids)!=len(data) or None in ids or len(ids)!=len(set(ids)):errors.append(f'{name}: missing or duplicate {key}')
 for name in ['toolbar-manifest.json','editor-feature-manifest.json','shortcut-help-manifest.json','quality-rubric.json']:
  try:
   data=load(name)
   if not isinstance(data,dict):errors.append(f'{name}: expected object')
  except Exception as exc:errors.append(f'{name}: invalid JSON: {exc}')
 if not errors:
  layouts={item['id']:item for item in catalogs['layout-manifest.json']}
  themes={item['id'] for item in catalogs['theme-manifest.json']}
  templates={item['id'] for item in catalogs['template-manifest.json']}
  block_types={item['type'] for item in catalogs['block-manifest.json']}
  animation_ids={item['id'] for item in catalogs['animation-manifest.json']}
  for template in catalogs['template-manifest.json']:
   for step in template.get('slidePlan',[]):
    if step.get('layout') not in layouts:errors.append(f"template {template['id']}: unknown layout {step.get('layout')}")
   for theme in template.get('recommendedThemeIds',[]):
    if theme not in themes:errors.append(f"template {template['id']}: unknown theme {theme}")
  for layout_id,layout in layouts.items():
   comp=layout.get('composition')
   if not isinstance(comp,dict):errors.append(f'layout {layout_id}: missing composition contract');continue
   grid=comp.get('grid',{})
   if grid.get('columns')!=12 or grid.get('rows')!=8:errors.append(f'layout {layout_id}: expected 12x8 grid')
   slots=comp.get('slots',[]);slot_ids=[s.get('id') for s in slots]
   if not slots or None in slot_ids or len(slot_ids)!=len(set(slot_ids)):errors.append(f'layout {layout_id}: invalid or duplicate slots')
   for s in slots:
    g=s.get('grid',{});c=g.get('column',0);r=g.get('row',0);cs=g.get('columnSpan',0);rs=g.get('rowSpan',0)
    if c<1 or r<1 or cs<1 or rs<1 or c+cs-1>12 or r+rs-1>8:errors.append(f"layout {layout_id}/{s.get('id')}: slot outside 12x8 grid")
    for bt in s.get('allowedBlocks',[]):
     if bt not in block_types:errors.append(f"layout {layout_id}/{s.get('id')}: unknown block type {bt}")
   for bt in layout.get('recommendedBlocks',[]):
    if bt not in block_types:errors.append(f'layout {layout_id}: unknown block type {bt}')
  for block in catalogs['block-manifest.json']:
   a=block.get('defaultAnimation')
   if a and a not in animation_ids:errors.append(f"block {block['type']}: unknown default animation {a}")
  defaults=[p for p in catalogs['delivery-profile-manifest.json'] if p.get('default')]
  if len(defaults)!=1 or defaults[0].get('id')!='editable-deck':errors.append('delivery profiles: editable-deck must be the single default')
  for archetype in catalogs['presentation-archetype-manifest.json']:
   for tid in archetype.get('recommendedTemplateIds',[]):
    if tid not in templates:errors.append(f"archetype {archetype['id']}: unknown template {tid}")
  toolbar=load('toolbar-manifest.json');actions={a['id'] for a in toolbar.get('actions',[])}
  for group in toolbar.get('groups',[]):
   for aid in group.get('actions',[]):
    if aid not in actions:errors.append(f"toolbar group {group.get('id')}: unknown action {aid}")
  sh=load('shortcut-help-manifest.json')
  for section in ['editor','presenter']:
   ids=[x.get('id') for x in sh.get(section,[])]
   if len(ids)!=len(set(ids)):errors.append(f'shortcut-help {section}: duplicate ids')
  sample=load('sample-deck-project.json')
  if not isinstance(sample,dict) or sample.get('schemaVersion')!='2.1':
   errors.append('sample-deck-project.json: expected schema 2.1 object')
  for slide in sample.get('slides',[]):
   for block in slide.get('blocks',[]):
    if block.get('type') not in block_types:errors.append(f"sample deck {slide.get('id')}: unknown block type {block.get('type')}")
    for sid in block.get('sourceIds',[]):errors.append('sample deck: sourceIds are not allowed in the offline sample')
 if errors:
  print('\n'.join('ERROR: '+e for e in errors),file=sys.stderr);raise SystemExit(1)
 summary=', '.join(f"{n.replace('-manifest.json','')}={len(d)}" for n,d in catalogs.items())
 print(f'OK: catalogs and semantic layout contracts are valid ({summary})')
if __name__=='__main__':main()

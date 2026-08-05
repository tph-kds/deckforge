#!/usr/bin/env python3
"""Validate a DeckProject 2.1 document against schema, catalogs, and semantic slot rules."""
from __future__ import annotations
import json, sys
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker

ROOT=Path(__file__).resolve().parents[2]
ASSETS=ROOT/'skills'/'deckforge'/'assets'
SCHEMA_PATH=ROOT/'schemas'/'deck-project.schema.json'

def fail(message):print(f'ERROR: {message}',file=sys.stderr);raise SystemExit(1)
def load_json(path):
 try:return json.loads(Path(path).read_text(encoding='utf-8'))
 except FileNotFoundError:fail(f'file not found: {path}')
 except json.JSONDecodeError as exc:fail(f'invalid JSON in {path}: line {exc.lineno}, column {exc.colno}: {exc.msg}')
def path_label(error):return '.'.join(str(x) for x in error.absolute_path) or '$'
def catalog_ids(name,key):return {str(x[key]) for x in load_json(ASSETS/name)}

def main():
 if len(sys.argv)!=2:fail('usage: validate_deck_project.py <deck.json>')
 path=Path(sys.argv[1]);deck=load_json(path);schema=load_json(SCHEMA_PATH)
 errors=sorted(Draft202012Validator(schema,format_checker=FormatChecker()).iter_errors(deck),key=lambda e:list(e.absolute_path))
 if errors:
  for e in errors[:40]:print(f'ERROR: {path_label(e)}: {e.message}',file=sys.stderr)
  if len(errors)>40:print(f'ERROR: {len(errors)-40} additional schema errors omitted',file=sys.stderr)
  raise SystemExit(1)
 slide_ids=[s['id'] for s in deck['slides']];block_ids=[b['id'] for s in deck['slides'] for b in s['blocks']];interaction_ids=[i['id'] for s in deck['slides'] for i in s.get('interactions',[])]
 for label,values in [('slide',slide_ids),('block',block_ids),('interaction',interaction_ids)]:
  if len(values)!=len(set(values)):fail(f'duplicate {label} IDs')
 templates=catalog_ids('template-manifest.json','id');themes=catalog_ids('theme-manifest.json','id');blocks=catalog_ids('block-manifest.json','type');animations=catalog_ids('animation-manifest.json','id');interaction_types=catalog_ids('interaction-manifest.json','type')
 motion_profiles=catalog_ids('motion-profile-manifest.json','id')
 mpid=deck.get('presentation',{}).get('motionProfileId')
 if not mpid:fail('presentation.motionProfileId is required (pick from motion-profile-manifest.json)')
 if mpid not in motion_profiles:fail(f'unknown presentation.motionProfileId: {mpid}')
 layout_items=load_json(ASSETS/'layout-manifest.json');layouts={x['id']:x for x in layout_items}
 profile=deck['experience']['profile'];surfaces=set(deck['experience']['surfaces'])
 if profile=='editable-deck':
  if not deck['editor']['enabled']:fail('editable-deck requires editor.enabled=true')
  if not {'editor','presenter'}.issubset(surfaces):fail('editable-deck requires editor and presenter surfaces')
  for key in ['toolbar','history','sidePanel','themePicker','layoutPicker','shortcutHelp','saveStatus']:
   if not deck['editor'].get(key):fail(f'editable-deck requires editor.{key}=true')
  if deck['editor'].get('persistence') in {None,'none'}:fail('editable-deck requires persistence')
 if deck.get('shortcuts',{}).get('helpEnabled') and not deck['editor'].get('shortcutHelp') and profile=='editable-deck':fail('shortcut help declared but editor.shortcutHelp is not enabled')
 tid=deck.get('meta',{}).get('templateId')
 if tid and tid not in templates:fail(f'unknown meta.templateId: {tid}')
 if deck['theme']['id'] not in themes:fail(f"unknown theme.id: {deck['theme']['id']}")
 known_sources={s['id'] for s in deck.get('sources',[])}
 for slide in deck['slides']:
  layout=layouts.get(slide['layout'])
  if not layout:fail(f"slide {slide['id']}: unknown layout {slide['layout']}")
  slots={x['id'] for x in layout.get('composition',{}).get('slots',[])}
  local_ids={b['id'] for b in slide['blocks']}
  if slide.get('focalBlockId') and slide['focalBlockId'] not in local_ids:fail(f"slide {slide['id']}: unknown focalBlockId {slide['focalBlockId']}")
  bound=set()
  for binding in slide.get('layoutBindings',[]):
   if binding['slot'] not in slots:fail(f"slide {slide['id']}: unknown layout binding slot {binding['slot']}")
   for bid in binding['blockIds']:
    if bid not in local_ids:fail(f"slide {slide['id']}: binding references unknown block {bid}")
    if bid in bound:fail(f"slide {slide['id']}: block {bid} appears in multiple layout bindings")
    bound.add(bid)
  for source_id in slide.get('sources',[]):
   if source_id not in known_sources:fail(f"slide {slide['id']}: unknown source ID {source_id}")
  for block in slide['blocks']:
   if block['type'] not in blocks:fail(f"block {block['id']}: unknown block type {block['type']}")
   mode=block.get('positionMode','slot' if block.get('slot') else 'freeform' if block.get('frame') else 'slot')
   if mode in {'slot','flow'}:
    if not block.get('slot'):fail(f"block {block['id']}: slot/flow position requires slot")
    if block['slot'] not in slots:fail(f"block {block['id']}: unknown slot {block['slot']} for layout {slide['layout']}")
   if mode=='freeform' and not block.get('frame'):fail(f"block {block['id']}: freeform position requires frame")
   animation=block.get('animation')
   if animation and animation['id'] not in animations:fail(f"block {block['id']}: unknown animation {animation['id']}")
   for source_id in block.get('sourceIds',[]):
    if source_id not in known_sources:fail(f"block {block['id']}: unknown source ID {source_id}")
  for interaction in slide.get('interactions',[]):
   if interaction['type'] not in interaction_types:fail(f"interaction {interaction['id']}: unknown type {interaction['type']}")
 print(f"OK: {path} ({len(slide_ids)} slides, {len(block_ids)} blocks, {len(interaction_ids)} interactions, profile={profile})")
if __name__=='__main__':main()

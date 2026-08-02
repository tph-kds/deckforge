#!/usr/bin/env python3
from pathlib import Path
import json,sys
root=Path(__file__).resolve().parents[1]/'skills/deckforge/assets'
kind=(sys.argv[1] if len(sys.argv)>1 else 'templates').lower()
map_={'templates':'template-manifest.json','themes':'theme-manifest.json','layouts':'layout-manifest.json','blocks':'block-manifest.json','animations':'animation-manifest.json'}
if kind not in map_: raise SystemExit('choose: '+', '.join(map_))
for item in json.loads((root/map_[kind]).read_text()): print(item.get('id') or item.get('type'),'-',item.get('name') or item.get('description',''))

#!/usr/bin/env python3
"""Audit that a DeckProject is motion-ready: profile, transition, builds, reduced motion."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
ASSETS=HERE.parent/'assets'

def main():
    ap=argparse.ArgumentParser();ap.add_argument('deck',type=Path)
    args=ap.parse_args()
    deck=json.loads(args.deck.read_text(encoding='utf-8'))
    profiles={x['id'] for x in json.loads((ASSETS/'motion-profile-manifest.json').read_text(encoding='utf-8'))}
    errors=[]
    pres=deck.get('presentation',{})
    mpid=pres.get('motionProfileId')
    if not mpid: errors.append('presentation.motionProfileId missing')
    elif mpid not in profiles: errors.append(f'unknown motionProfileId {mpid}')
    if not (pres.get('transition') or any(s.get('transition') for s in deck.get('slides',[]))):
        errors.append('no slide transition declared')
    has_builds=bool(pres.get('defaultBuilds')) or any(b.get('animation') for s in deck.get('slides',[]) for b in s.get('blocks',[]))
    if not has_builds: errors.append('no block builds and defaultBuilds not set')
    if not pres.get('reducedMotion'): errors.append('presentation.reducedMotion missing')
    for e in errors: print('ERROR:',e,file=sys.stderr)
    print(f'MOTION: {len(deck.get("slides",[]))} slides, {len(errors)} errors')
    if errors: raise SystemExit(1)

if __name__=='__main__':main()

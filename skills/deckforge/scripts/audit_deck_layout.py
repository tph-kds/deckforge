#!/usr/bin/env python3
"""Audit DeckProject layout slots, bounds, collisions, and rough content budgets."""
from __future__ import annotations
import argparse, json, math, re, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
ASSETS=HERE.parent/'assets'

def load(path:Path):
    return json.loads(path.read_text(encoding='utf-8'))

def text_content(value)->str:
    if value is None:return ''
    if isinstance(value,str):return re.sub(r'<[^>]+>',' ',value)
    if isinstance(value,list):return ' '.join(text_content(x) for x in value)
    if isinstance(value,dict):return ' '.join(text_content(v) for k,v in value.items() if k not in {'url','src','id','x','y','w','h'})
    return str(value)

def resolve_slot(slot, canvas):
    safe=float(canvas.get('safeMargin',64));w=float(canvas.get('width',1600));h=float(canvas.get('height',900))
    inner_w=w-2*safe;inner_h=h-2*safe
    g=slot['grid'];cg=.35;rg=.3
    # gaps expressed in grid units; use 16 px per 0.1-ish unit for stable audit approximation
    col_gap=16*cg/0.35; row_gap=16*rg/0.3
    unit_w=(inner_w-col_gap*11)/12;unit_h=(inner_h-row_gap*7)/8
    x=safe+(g['column']-1)*(unit_w+col_gap);y=safe+(g['row']-1)*(unit_h+row_gap)
    sw=g['columnSpan']*unit_w+(g['columnSpan']-1)*col_gap
    sh=g['rowSpan']*unit_h+(g['rowSpan']-1)*row_gap
    return {'x':x,'y':y,'w':sw,'h':sh}

def intersection(a,b):
    x=max(a['x'],b['x']);y=max(a['y'],b['y'])
    r=min(a['x']+a['w'],b['x']+b['w']);bt=min(a['y']+a['h'],b['y']+b['h'])
    if r<=x or bt<=y:return 0.0
    return (r-x)*(bt-y)

def area(a):return max(0,a['w'])*max(0,a['h'])

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('deck',type=Path)
    ap.add_argument('--strict',action='store_true',help='Treat warnings as failures')
    ap.add_argument('--json-report',type=Path)
    args=ap.parse_args()
    deck=load(args.deck)
    layouts={x['id']:x for x in load(ASSETS/'layout-manifest.json')}
    errors=[];warnings=[];report={'slides':[]}
    canvas=deck.get('canvas',{});cw=float(canvas.get('width',1600));ch=float(canvas.get('height',900));safe=float(canvas.get('safeMargin',64))
    for si,slide in enumerate(deck.get('slides',[]),1):
        sid=slide.get('id',f'slide-{si}');layout=layouts.get(slide.get('layout'))
        sr={'id':sid,'layout':slide.get('layout'),'resolved':{},'warnings':[],'errors':[]}
        if not layout or 'composition' not in layout:
            errors.append(f'{sid}: layout has no semantic composition contract: {slide.get("layout")}');report['slides'].append(sr);continue
        contract=layout['composition'];slots={s['id']:s for s in contract['slots']}
        used={};free=[]
        ids={b.get('id') for b in slide.get('blocks',[])}
        for binding in slide.get('layoutBindings',[]):
            for bid in binding.get('blockIds',[]):
                if bid not in ids: errors.append(f'{sid}: layout binding references unknown block {bid}')
        for block in slide.get('blocks',[]):
            bid=block.get('id','?');mode=block.get('positionMode') or ('slot' if block.get('slot') else 'freeform' if block.get('frame') else 'slot')
            if mode in {'slot','flow'}:
                slot_id=block.get('slot')
                if not slot_id:
                    errors.append(f'{sid}/{bid}: slot-bound block has no slot');continue
                if slot_id not in slots:
                    errors.append(f'{sid}/{bid}: unknown slot {slot_id} for layout {slide.get("layout")}');continue
                used.setdefault(slot_id,[]).append(block)
            elif mode=='freeform':
                fr=block.get('frame')
                if not fr:errors.append(f'{sid}/{bid}: freeform block requires frame');continue
                free.append((block,fr))
            elif mode=='background':
                continue
        # required slots and budgets
        slot_frames={}
        for slot_id,slot_def in slots.items():
            fr=resolve_slot(slot_def,canvas);slot_frames[slot_id]=fr;sr['resolved'][slot_id]=fr
            blocks=used.get(slot_id,[])
            if slot_def.get('required') and not blocks:
                errors.append(f'{sid}: required slot {slot_id} is empty')
            if len(blocks)>slot_def.get('maxItems',999):
                warnings.append(f'{sid}/{slot_id}: {len(blocks)} blocks exceeds maxItems={slot_def.get("maxItems")}')
            budget=slot_def.get('contentBudget',{})
            chars=sum(len(text_content(b.get('content'))) for b in blocks)
            if budget.get('maxCharacters') and chars>budget['maxCharacters']:
                warnings.append(f'{sid}/{slot_id}: content characters {chars} exceed budget {budget["maxCharacters"]}')
        # contract slot collisions (should be zero except allowed roles)
        active=[(k,slots[k],slot_frames[k]) for k in used]
        allowed=set(contract.get('collisionPolicy',{}).get('allowedOverlapRoles',[]))
        max_ratio=float(contract.get('collisionPolicy',{}).get('maxIncidentalOverlapRatio',0.02))
        for i,(aid,adef,af) in enumerate(active):
            for bid,bdef,bf in active[i+1:]:
                if adef.get('role') in allowed or bdef.get('role') in allowed:continue
                inter=intersection(af,bf)
                if inter:
                    ratio=inter/min(area(af),area(bf))
                    if ratio>max_ratio: errors.append(f'{sid}: slots {aid} and {bid} overlap by {ratio:.1%}')
        # bounds and freeform collisions
        all_regions=[(f'slot:{k}',fr,False) for k,fr in slot_frames.items() if k in used]
        for block,fr in free:
            bid=block.get('id','?')
            if fr.get('w',0)<=0 or fr.get('h',0)<=0:errors.append(f'{sid}/{bid}: non-positive frame')
            if fr.get('x',0)<safe or fr.get('y',0)<safe or fr.get('x',0)+fr.get('w',0)>cw-safe or fr.get('y',0)+fr.get('h',0)>ch-safe:
                errors.append(f'{sid}/{bid}: freeform frame violates safe margins')
            intentional=bool(block.get('allowOverlap') or block.get('decorative'))
            for label,other,_ in all_regions:
                inter=intersection(fr,other)
                if inter and not intentional and inter/min(area(fr),area(other))>max_ratio:
                    errors.append(f'{sid}/{bid}: freeform block overlaps {label}')
            all_regions.append((f'block:{bid}',fr,intentional))
        # whitespace approximation
        occupied=sum(area(fr) for _,fr,_ in all_regions)/(cw*ch) if cw and ch else 0
        target=contract.get('whitespaceTarget',{})
        if occupied<target.get('minOccupiedRatio',0):warnings.append(f'{sid}: occupied ratio {occupied:.1%} below target {target.get("minOccupiedRatio",0):.1%}')
        if occupied>target.get('maxOccupiedRatio',1):warnings.append(f'{sid}: occupied ratio {occupied:.1%} above target {target.get("maxOccupiedRatio",1):.1%}')
        sr['occupiedRatio']=occupied
        report['slides'].append(sr)
    report['errors']=errors;report['warnings']=warnings
    if args.json_report:args.json_report.write_text(json.dumps(report,indent=2),encoding='utf-8')
    for x in errors:print('ERROR:',x,file=sys.stderr)
    for x in warnings:print('WARNING:',x,file=sys.stderr)
    print(f'AUDIT: {len(deck.get("slides",[]))} slides, {len(errors)} errors, {len(warnings)} warnings')
    if errors or (args.strict and warnings):raise SystemExit(1)

if __name__=='__main__':main()

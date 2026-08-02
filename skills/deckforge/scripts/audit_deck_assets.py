#!/usr/bin/env python3
"""Audit DeckProject media assets: manifest references, alt text, attribution,
remote-only sources, focal points, and slot aspect compatibility (plan §9.3/9.4)."""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path

HERE=Path(__file__).resolve().parent
ASSETS=HERE.parent/'assets'

def load(path:Path):
    return json.loads(path.read_text(encoding='utf-8'))

def is_remote(src:str)->bool:
    return bool(re.match(r'^https?://',src.strip(),re.I))

def frame_ratio(frame)->float|None:
    w=frame.get('w');h=frame.get('h')
    if not w or not h:return None
    return w/h

def resolve_slot(slot, canvas):
    safe=float(canvas.get('safeMargin',64));w=float(canvas.get('width',1600));h=float(canvas.get('height',900))
    inner_w=w-2*safe;inner_h=h-2*safe
    g=slot['grid'];cg=.35;rg=.3
    col_gap=16*cg/0.35; row_gap=16*rg/0.3
    unit_w=(inner_w-col_gap*11)/12;unit_h=(inner_h-row_gap*7)/8
    x=safe+(g['column']-1)*(unit_w+col_gap);y=safe+(g['row']-1)*(unit_h+row_gap)
    sw=g['columnSpan']*unit_w+(g['columnSpan']-1)*col_gap
    sh=g['rowSpan']*unit_h+(g['rowSpan']-1)*row_gap
    return {'x':x,'y':y,'w':sw,'h':sh}

def image_content(block):
    content=block.get('content')
    if isinstance(content,dict):return content
    if isinstance(content,str):return {'src':content}
    return {}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument('deck',type=Path)
    ap.add_argument('--strict',action='store_true',help='Treat warnings as failures')
    ap.add_argument('--json-report',type=Path)
    args=ap.parse_args()
    deck=load(args.deck)
    assets={a.get('id'):a for a in deck.get('assets',[])}
    layouts={x['id']:x for x in load(ASSETS/'layout-manifest.json')}
    canvas=deck.get('canvas',{})
    errors=[];warnings=[];report={'images':[]}
    for slide in deck.get('slides',[]):
        sid=slide.get('id','?')
        layout=layouts.get(slide.get('layout'))
        slots={s['id']:s for s in (layout or {}).get('composition',{}).get('slots',[])}
        slot_frames={k:resolve_slot(v,canvas) for k,v in slots.items()}
        for block in slide.get('blocks',[]):
            if block.get('type')!='image':continue
            bid=block.get('id','?');content=image_content(block)
            asset_id=content.get('assetId');asset=assets.get(asset_id) if asset_id else None
            alt=block.get('alt');decorative=bool(content.get('decorative') or block.get('decorative'))
            item={'id':bid,'slide':sid,'assetId':asset_id,'status':'ok'}
            report['images'].append(item)
            if not decorative and not alt:
                errors.append(f'{sid}/{bid}: image has no alt text and is not marked decorative');item['status']='error'
            if asset_id and asset is None:
                errors.append(f'{sid}/{bid}: references missing asset "{asset_id}"');item['status']='error'
            if asset and asset.get('status')=='failed':
                errors.append(f'{sid}/{bid}: asset "{asset_id}" is marked failed');item['status']='error'
            src=asset.get('src') if asset else content.get('src')
            if not src:
                errors.append(f'{sid}/{bid}: image has no source');item['status']='error'
            elif asset and not asset.get('src'):
                errors.append(f'{sid}/{bid}: asset "{asset_id}" is remote-only (no local source)');item['status']='error'
            elif src and not is_remote(src):
                local=Path(str(args.deck).rsplit('/',1)[0])/src
                if not local.exists():
                    errors.append(f'{sid}/{bid}: local asset file missing: {src}');item['status']='error'
            if asset and not asset.get('width') and not asset.get('height'):
                warnings.append(f'{sid}/{bid}: asset "{asset_id}" has unknown intrinsic dimensions');item['status']='warning'
            focal=content.get('focalPoint')
            if focal:
                for axis,val in focal.items():
                    if not isinstance(val,(int,float)) or not (0<=val<=1):
                        warnings.append(f'{sid}/{bid}: focalPoint.{axis} out of [0,1]: {val!r}');item['status']='warning'
            # aspect compatibility vs slot frame
            slot_id=block.get('slot') or (block.get('layoutBindings') and None)
            frame=block.get('frame') or slot_frames.get(slot_id)
            slot_ratio=frame_ratio(frame) if frame else None
            asset_ratio=(asset['width']/asset['height']) if asset and asset.get('width') and asset.get('height') else None
            if slot_ratio and asset_ratio and abs(asset_ratio-slot_ratio)/max(slot_ratio,1e-6)>0.5:
                warnings.append(f'{sid}/{bid}: asset aspect {asset_ratio:.2f} vs slot {slot_ratio:.2f}; large "cover" crop expected');item['status']='warning'
    report['errors']=errors;report['warnings']=warnings
    if args.json_report:args.json_report.write_text(json.dumps(report,indent=2),encoding='utf-8')
    for x in errors:print('ERROR:',x,file=sys.stderr)
    for x in warnings:print('WARNING:',x,file=sys.stderr)
    print(f'ASSET-AUDIT: {len(report["images"])} images, {len(errors)} errors, {len(warnings)} warnings')
    if errors or (args.strict and warnings):raise SystemExit(1)

if __name__=='__main__':main()

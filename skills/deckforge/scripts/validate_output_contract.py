#!/usr/bin/env python3
"""Heuristic validation that a generated project implements the selected DeckForge profile."""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path

TEXT_EXT={'.html','.js','.jsx','.ts','.tsx','.vue','.svelte','.css','.scss','.json','.md'}
SKIP={'node_modules','.git','dist','build','.next','coverage','skill-zips','.agents','.claude','.codex','.grok','.gemini','.cursor','.windsurf','.roo','.cline'}

def corpus(root:Path):
    chunks=[];files=[]
    for p in root.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in TEXT_EXT or any(part in SKIP for part in p.parts):continue
        try:t=p.read_text(encoding='utf-8',errors='ignore')
        except Exception:continue
        if len(t)>2_000_000:continue
        chunks.append(f'\nFILE:{p.relative_to(root)}\n{t}');files.append(p)
    return '\n'.join(chunks).lower(),files

def match_any(text,patterns):return any(re.search(p,text,re.I|re.S) for p in patterns)

def main():
    ap=argparse.ArgumentParser();ap.add_argument('project',type=Path);ap.add_argument('--profile',default='editable-deck',choices=['editable-deck','presentation-runtime','published-story','embedded-deck']);ap.add_argument('--json-report',type=Path)
    a=ap.parse_args();root=a.project.resolve()
    if not root.is_dir():raise SystemExit(f'ERROR: project directory not found: {root}')
    text,files=corpus(root);checks=[]
    def check(id,label,patterns,required=True):
        ok=match_any(text,patterns);checks.append({'id':id,'label':label,'ok':ok,'required':required});return ok
    # Common runtime
    check('deck-document','Structured deck document or typed deck model',[r'schemaversion',r'type\s+deckproject',r'interface\s+deckproject'])
    check('presenter','Presenter/view surface',[r'/present',r'presenter(view|mode|surface)',r'data-mode=["\']present',r'enterpresent'])
    check('navigation','Slide/build navigation',[r'arrowright',r'nextslide',r'goToSlide'.lower(),r'pageDown'.lower()])
    check('reduced-motion','Reduced motion support',[r'prefers-reduced-motion',r'reducedmotion'])
    check('shortcut-help','In-product shortcut help',[r'shortcut(help|dialog|modal)',r'keyboard shortcuts',r'phím tắt',r'\?\s*for\s*shortcuts'])
    if a.profile=='editable-deck':
        check('editor-shell','Real editor workspace',[r'editor[-_ ]?(shell|workspace|layout|route)',r'data-mode=["\']editor',r'/editor'])
        check('slide-rail','Slide rail/thumbnails',[r'slide[-_ ]rail',r'slide thumbnails?',r'thumbnail.*slide'])
        check('toolbar','Editing toolbar',[r'editor[-_ ]toolbar',r'role=["\']toolbar',r'toolbaraction'])
        check('inspector','Right inspector/properties panel',[r'inspector(panel)?',r'properties[-_ ]panel',r'property panel'])
        check('notes','Speaker notes editor',[r'speaker[-_ ]?notes',r'notes[-_ ]?(panel|editor|area)'])
        check('state-mutation','Controls mutate deck state',[r'update(block|slide|deck)',r'executecommand',r'dispatch\(',r'setdeck\(',r'ondocumentchange',r'contenteditable'])
        check('undo-redo','Undo and redo',[r'\bundo\b.*\bredo\b',r'undostack',r'history\.undo'])
        check('persistence','Persistent save/restore',[r'localstorage',r'autosave',r'save(deck|document|project)',r'persist\('])
        check('save-status','Visible save status',[r'save[-_ ]status',r'saving[.….]*saved',r'lastsaved',r'auto[-_ ]?save.*status'])
        check('theme-control','Theme/style control',[r'themepicker',r'theme[-_ ]?(panel|select|control)',r'settheme'])
        check('layout-control','Layout control',[r'layoutpicker',r'layout[-_ ]?(panel|select|control)',r'setlayout'])
        check('media-control','Image/media insertion or replacement',[r'add(image|media)',r'insert(image|media)',r'replace(image|media)',r'assetlibrary',r'fileinput'])
        check('add-text','Text insertion',[r'addtext',r'inserttext',r'createblock.*text'])
        check('present-current','Present from current slide',[r'present.*current',r'current.*present',r'presentfromslide'])
        check('default-motion','Runtime motion (transitions and builds)',[r'motionprofileid',r'slidetype=["\']animation',r'buildindex|buildstep|buildstepindex',r'step-visible|row-visible|build-hidden',r'anim-in|animate-in',r'transition.*(slide|class)|slide.*transition'])
        check('chrome-safe','Presenter chrome docked outside slide area',[r'presenter[-_ ]chrome',r'presenter[-_ ]controls',r'presenter[-_ ]stage',r'deck-controls'],required=False)
    elif a.profile=='published-story':
        check('responsive-viewer','Responsive/self-guided viewer',[r'viewer',r'reflow',r'responsive'])
        check('deep-links','Deep-linked slides',[r'location\.hash',r'router.*slide',r'deeplink'])
        check('citations','Citation/source rendering',[r'citation',r'sources?'])
    elif a.profile=='embedded-deck':
        check('embed','Embed surface',[r'iframe',r'embed[-_ ]?viewer'])
        check('sandbox','Sandbox/origin policy',[r'sandbox',r'allowedorigins?',r'postmessage'])
    missing=[c for c in checks if c['required'] and not c['ok']]
    report={'profile':a.profile,'project':str(root),'scannedFiles':len(files),'checks':checks,'missing':[c['id'] for c in missing]}
    if a.json_report:a.json_report.write_text(json.dumps(report,indent=2),encoding='utf-8')
    for c in checks:print(('PASS' if c['ok'] else 'FAIL')+f": {c['label']}")
    print(f'CONTRACT: {len(checks)-len(missing)}/{len(checks)} required checks passed across {len(files)} files')
    if missing:
        print('ERROR: missing required capabilities: '+', '.join(c['id'] for c in missing),file=sys.stderr);raise SystemExit(1)

if __name__=='__main__':main()

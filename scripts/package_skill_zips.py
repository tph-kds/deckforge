#!/usr/bin/env python3
from pathlib import Path
import shutil, zipfile
root=Path(__file__).resolve().parents[1]; out=root/'skill-zips'
if out.exists(): shutil.rmtree(out)
out.mkdir()
for d in sorted((root/'skills').iterdir()):
    if not d.is_dir() or not (d/'SKILL.md').exists(): continue
    target=out/f'{d.name}.zip'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED) as z:
        for p in d.rglob('*'):
            if p.is_file(): z.write(p,p.relative_to(d.parent))
    print('packed',target.name)

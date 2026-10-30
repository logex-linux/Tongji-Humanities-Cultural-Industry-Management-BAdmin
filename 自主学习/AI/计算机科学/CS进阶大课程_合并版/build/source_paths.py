"""Resolve configured source roots without replacing the original hash baseline."""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
NAMES={'CS个人课程系统':'old','CS_个人课程系统_20261025':'new'}


def source_roots():
    config=json.loads((ROOT/'build/sources.json').read_text())
    return {key:(ROOT/config[key]).resolve() for key in ('old','new')}


def baseline_path(name,roots):
    edition,relative=name.split('/',1)
    return roots[NAMES[edition]]/relative


def check_baseline(before):
    import hashlib
    roots=source_roots()
    missing_roots=[str(p) for p in roots.values() if not p.is_dir()]
    missing,changed=[],[]
    for name,digest in before.items():
        path=baseline_path(name,roots)
        if not path.is_file():missing.append(name)
        elif hashlib.sha256(path.read_bytes()).hexdigest()!=digest:changed.append(name)
    return {'source_roots':{k:str(v) for k,v in roots.items()},'missing_roots':missing_roots,'missing_files':missing,'changed_files':changed,'protected_files':len(before),'status':'PASS' if not (missing_roots or missing or changed) else 'FAIL'}

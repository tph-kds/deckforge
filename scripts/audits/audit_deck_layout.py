#!/usr/bin/env python3
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).resolve().parents[2]/'skills/deckforge/scripts/audit_deck_layout.py'),run_name='__main__')

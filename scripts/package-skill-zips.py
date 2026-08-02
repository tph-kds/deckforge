#!/usr/bin/env python3
"""Compatibility wrapper for the snake_case packaging command."""
from pathlib import Path
import runpy

runpy.run_path(str(Path(__file__).with_name("package_skill_zips.py")), run_name="__main__")

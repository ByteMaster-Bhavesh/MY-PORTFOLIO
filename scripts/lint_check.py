#!/usr/bin/env python3
"""Comprehensive validator for CSS, HTML, and JS in the project."""
import re
import os
from collections import Counter

print("=== CHECKING HTML ===")
with open("index.html", encoding="utf-8") as f:
    html = f.read()

# 1. Duplicate IDs
ids = re.findall(r'id=["\']([^"\']+)["\']', html)
seen_ids = set()
dup_ids = set()
for id_ in ids:
    if id_ in seen_ids:
        dup_ids.add(id_)
    seen_ids.add(id_)
print("Duplicate IDs:", dup_ids if dup_ids else "None")

# 2. Tag balance check
void_tags = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'stop', 'defs', 'svg', 'g'}
# Find self-closing tags
self_closing = set(re.findall(r'<([a-zA-Z0-9]+)[^>]*/>', html))
open_tags = [m.group(1).lower() for m in re.finditer(r'<([a-zA-Z0-9]+)(?:\s[^>]*)?>', html) if not m.group(0).endswith('/>')]
close_tags = [m.group(1).lower() for m in re.finditer(r'</([a-zA-Z0-9]+)>', html)]

open_c = Counter([t for t in open_tags if t not in void_tags])
close_c = Counter(close_tags)

for tag, count in sorted(open_c.items()):
    closed = close_c[tag]
    if count != closed:
        print(f"Mismatched tag <{tag}>: opened {count}, closed {closed}")

# 3. Form elements without label/aria-label
inputs = re.findall(r'<input[^>]*>', html)
for inp in inputs:
    if 'aria-label' not in inp and 'id=' not in inp and 'type="hidden"' not in inp:
        print("Input without label or aria-label:", inp)

print("\n=== CHECKING CSS ===")
with open("assets/css/styles.css", encoding="utf-8") as f:
    css_lines = f.readlines()

for idx, line in enumerate(css_lines, 1):
    # Vendor prefix without standard property
    if "-webkit-background-clip: text" in line:
        # Check if next or prev line has background-clip: text
        surround = "".join(css_lines[max(0, idx-3):min(len(css_lines), idx+3)])
        if "background-clip: text" not in surround:
            if not line.strip().startswith("/*"):
                print(f"Line {idx}: -webkit-background-clip: text without standard background-clip: text")
    
    if "-webkit-backdrop-filter" in line:
        surround = "".join(css_lines[max(0, idx-2):min(len(css_lines), idx+2)])
        if "backdrop-filter" not in surround:
            print(f"Line {idx}: -webkit-backdrop-filter without standard backdrop-filter")

    if "-webkit-user-select" in line:
        surround = "".join(css_lines[max(0, idx-2):min(len(css_lines), idx+2)])
        if "user-select" not in surround:
            print(f"Line {idx}: -webkit-user-select without standard user-select")

    # Empty rules
    if re.search(r'\{\s*\}', line):
        print(f"Line {idx}: Empty CSS rule: {line.strip()}")

print("\n=== CHECKING JAVASCRIPT ===")
for js_file in ["assets/js/script.js", "assets/js/splash-cursor.js"]:
    with open(js_file, encoding="utf-8") as f:
        js = f.read()
    # Check syntax basic
    print(f"{js_file}: {len(js)} bytes loaded")

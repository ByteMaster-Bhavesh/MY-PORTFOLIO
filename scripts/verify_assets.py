#!/usr/bin/env python3
"""Verify all local asset references in index.html exist."""
import re
import os

with open("index.html", encoding="utf-8") as f:
    html = f.read()

refs = re.findall(r'(?:src|href)=["\']([^"\']+)["\']', html)
checked = 0
missing = []

for ref in sorted(set(refs)):
    if ref.startswith(("http://", "https://", "#", "mailto:", "tel:", "data:")):
        continue
    checked += 1
    clean = ref.split("?")[0].split("#")[0]
    exists = os.path.exists(clean)
    print(f"[{'OK' if exists else 'MISSING'}] {clean}")
    if not exists:
        missing.append(clean)

print(f"\nSummary: {checked} local asset references checked, {len(missing)} missing.")
if missing:
    exit(1)

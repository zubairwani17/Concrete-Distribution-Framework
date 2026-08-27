#!/usr/bin/env python3
"""
Bundles the editable files in src/ into a single standalone index.html.

Run this after editing anything in src/:

    python build.py

The generated index.html has no local dependencies and is what gets deployed
to GitHub Pages. Do not edit index.html directly — your changes will be
overwritten the next time this script runs.
"""

from pathlib import Path
import sys

ROOT = Path(__file__).parent
SRC = ROOT / "src"
OUT = ROOT / "index.html"

CDN = [
    "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
    "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.5/babel.min.js",
]

# Order matters: stats defines the fitters, framework uses them, app renders.
JS_FILES = ["stats.js", "framework.js", "app.jsx"]


def read(name):
    path = SRC / name
    if not path.exists():
        sys.exit(f"Missing source file: {path}")
    return path.read_text(encoding="utf-8")


def main():
    css = read("styles.css")
    scripts = "\n".join(f'<script src="{u}"></script>' for u in CDN)
    js = "\n\n".join(read(f) for f in JS_FILES)

    html = f"""<!DOCTYPE html>
<!-- GENERATED FILE — do not edit directly. Edit src/ and run: python build.py -->
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Concrete Distribution Selection Framework</title>
<style>
{css.rstrip()}
</style>
</head>
<body>
<div id="root"></div>
{scripts}
<script type="text/babel">
{js.rstrip()}
</script>
</body>
</html>
"""
    OUT.write_text(html, encoding="utf-8")
    kb = len(html.encode("utf-8")) / 1024
    print(f"Built {OUT.name}  ({kb:.1f} KB, {len(html.splitlines())} lines)")
    for f in JS_FILES + ["styles.css"]:
        n = len(read(f).splitlines())
        print(f"  src/{f:<14} {n:>4} lines")


if __name__ == "__main__":
    main()

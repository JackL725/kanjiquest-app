#!/usr/bin/env python3
"""Build KanjiQuest Primitives font (TTF) from extracted glyph paths."""

import json, os, shutil
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont

EM = 1000
ASCENDER = 880
DESCENDER = -120
ADV_WIDTH = 1000

with open('/tmp/glyph-paths.json') as f:
    glyph_paths = json.load(f)
print(f"Loaded {len(glyph_paths)} glyph path definitions")

def draw_glyph(pen, commands):
    """Draw glyph from opentype.js path commands using TTGlyphPen."""
    for cmd in commands:
        t = cmd['type']
        if t == 'M':
            pen.moveTo((round(cmd['x']), round(cmd['y'])))
        elif t == 'L':
            pen.lineTo((round(cmd['x']), round(cmd['y'])))
        elif t == 'Q':
            pen.qCurveTo(
                (round(cmd['x1']), round(cmd['y1'])),
                (round(cmd['x']), round(cmd['y']))
            )
        elif t == 'C':
            # Convert cubic to quadratic approximation
            # For font accuracy, use cubic directly via TTGlyphPen
            pen.curveTo(
                (round(cmd['x1']), round(cmd['y1'])),
                (round(cmd['x2']), round(cmd['y2'])),
                (round(cmd['x']), round(cmd['y']))
            )
        elif t == 'Z':
            pen.closePath()

# Build glyph order + unicode map
glyph_names = ['.notdef']
cmap = {}
glyph_data = {}

for offset_str in sorted(glyph_paths.keys(), key=int):
    offset = int(offset_str)
    codepoint = 0xE000 + offset
    name = f'pua_{offset:04x}'
    glyph_names.append(name)
    cmap[codepoint] = name
    glyph_data[name] = glyph_paths[offset_str]

print(f"Building {len(glyph_names)} glyphs ({len(glyph_data)} PUA)")

# Draw all glyphs
drawn_glyphs = {}

# .notdef = empty
pen = TTGlyphPen(None)
drawn_glyphs['.notdef'] = pen.glyph()

success = 0
fail = 0
for name, commands in glyph_data.items():
    try:
        pen = TTGlyphPen(None)
        draw_glyph(pen, commands)
        drawn_glyphs[name] = pen.glyph()
        success += 1
    except Exception as e:
        print(f"  FAIL {name}: {e}")
        pen = TTGlyphPen(None)
        drawn_glyphs[name] = pen.glyph()
        fail += 1

print(f"  Drawn: {success} success, {fail} failures")

# Build font
fb = FontBuilder(EM, isTTF=True)
fb.setupGlyphOrder(glyph_names)
fb.setupCharacterMap(cmap)

metrics = {name: (ADV_WIDTH, 0) for name in glyph_names}
fb.setupHorizontalMetrics(metrics)
fb.setupHorizontalHeader(ascent=ASCENDER, descent=DESCENDER)
fb.setupNameTable({
    "familyName": "KanjiQuest Primitives",
    "styleName": "Regular",
})
fb.setupOS2(
    sTypoAscender=ASCENDER,
    sTypoDescender=DESCENDER,
    sTypoLineGap=0,
    usWeightClass=500,
    fsType=0,
)
fb.setupPost()
fb.setupGlyf(drawn_glyphs)

# Set PUA unicode range bit in OS/2
font = fb.font
os2 = font['OS/2']
os2.ulUnicodeRange3 = os2.ulUnicodeRange3 | (1 << (57 - 32))

# Save as .otf (even though it's TTF internally, browsers handle both)
script_dir = os.path.dirname(os.path.abspath(__file__))
out_dir = os.path.join(script_dir, '..', 'src', 'assets', 'fonts')
public_dir = os.path.join(script_dir, '..', 'public', 'fonts')
os.makedirs(out_dir, exist_ok=True)
os.makedirs(public_dir, exist_ok=True)

otf_path = os.path.join(out_dir, 'kanjiquest-primitives.otf')
public_path = os.path.join(public_dir, 'kanjiquest-primitives.otf')

font.save(otf_path)
shutil.copy2(otf_path, public_path)

# Verify
vfont = TTFont(otf_path)
glyf = vfont['glyf']
empty = 0
nonempty = 0
for name in vfont.getGlyphOrder():
    g = glyf[name]
    if g.numberOfContours > 0:
        nonempty += 1
    else:
        empty += 1

size_kb = os.path.getsize(otf_path) / 1024
print(f"\nVerification:")
print(f"  Empty glyphs: {empty}")
print(f"  Non-empty glyphs: {nonempty}")
print(f"  Size: {size_kb:.1f} KB")
print(f"  Written: {otf_path}")
print(f"  Copied:  {public_path}")
print("Done!")

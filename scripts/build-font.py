#!/usr/bin/env python3
"""Build KanjiQuest Primitives font (TTF) from extracted glyph paths.

Reverses contour winding at draw time so all contours are clockwise
(TTF convention for filled shapes).
"""

import json, os, shutil, math
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.areaPen import AreaPen
from fontTools.ttLib import TTFont

EM = 1000
ASCENDER = 880
DESCENDER = -120
ADV_WIDTH = 1000

with open('/tmp/glyph-paths.json') as f:
    glyph_paths = json.load(f)
print(f"Loaded {len(glyph_paths)} glyph path definitions")


def signed_area(contour):
    """Compute signed area of a contour (list of commands from M to Z).
    Positive = clockwise in font coords (TTF filled).
    Negative = counter-clockwise (TTF hole)."""
    area = 0
    pts = []
    for cmd in contour:
        if cmd['type'] in ('M', 'L'):
            pts.append((cmd['x'], cmd['y']))
        elif cmd['type'] == 'Q':
            pts.append((cmd['x1'], cmd['y1']))
            pts.append((cmd['x'], cmd['y']))
        elif cmd['type'] == 'C':
            pts.append((cmd['x1'], cmd['y1']))
            pts.append((cmd['x2'], cmd['y2']))
            pts.append((cmd['x'], cmd['y']))
    # Shoelace formula on the linearized points
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        area += (x1 * y2 - x2 * y1)
    return area / 2


def reverse_contour(contour):
    """Reverse a contour (M ... Z) to flip winding direction."""
    # Extract the M command and the drawing commands (excluding Z)
    move = contour[0]
    draws = [c for c in contour[1:] if c['type'] != 'Z']
    if not draws:
        return contour

    # Collect endpoints in order
    points = [(move['x'], move['y'])]
    for cmd in draws:
        points.append((cmd['x'], cmd['y']))

    # Build reversed commands
    # New start point = last point of original
    result = [{'type': 'M', 'x': points[-1][0], 'y': points[-1][1]}]

    # Walk draws in reverse
    for i in range(len(draws) - 1, -1, -1):
        cmd = draws[i]
        # Target = previous point (or move point if i==0)
        target = points[i]
        if cmd['type'] == 'L':
            result.append({'type': 'L', 'x': target[0], 'y': target[1]})
        elif cmd['type'] == 'Q':
            result.append({
                'type': 'Q',
                'x1': cmd['x1'], 'y1': cmd['y1'],
                'x': target[0], 'y': target[1]
            })
        elif cmd['type'] == 'C':
            # Swap control points
            result.append({
                'type': 'C',
                'x1': cmd['x2'], 'y1': cmd['y2'],
                'x2': cmd['x1'], 'y2': cmd['y1'],
                'x': target[0], 'y': target[1]
            })

    result.append({'type': 'Z'})
    return result


def split_contours(commands):
    """Split a list of commands into individual contours (M...Z blocks)."""
    contours = []
    current = []
    for cmd in commands:
        current.append(cmd)
        if cmd['type'] == 'Z':
            contours.append(current)
            current = []
    return contours


def draw_glyph(pen, commands):
    """Draw glyph commands using TTGlyphPen."""
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
            pen.curveTo(
                (round(cmd['x1']), round(cmd['y1'])),
                (round(cmd['x2']), round(cmd['y2'])),
                (round(cmd['x']), round(cmd['y']))
            )
        elif t == 'Z':
            pen.closePath()


# Build glyph order and unicode map
glyph_names = ['.notdef']
cmap = {}
glyph_data = {}

for offset_str in sorted(glyph_paths.keys(), key=int):
    offset = int(offset_str)
    name = f'pua_{offset:04x}'
    glyph_names.append(name)
    cmap[0xE000 + offset] = name
    glyph_data[name] = glyph_paths[offset_str]

print(f"Building {len(glyph_names)} glyphs ({len(glyph_data)} PUA)")

# Draw all glyphs with correct winding
drawn_glyphs = {}

# .notdef = empty
pen = TTGlyphPen(None)
drawn_glyphs['.notdef'] = pen.glyph()

reversed_count = 0
ok_count = 0

for name, commands in glyph_data.items():
    # Split into contours, check winding, reverse if needed
    contours = split_contours(commands)
    fixed_commands = []

    for contour in contours:
        area = signed_area(contour)
        if area < 0:
            # Counter-clockwise — need to reverse for TTF
            contour = reverse_contour(contour)
            reversed_count += 1
        else:
            ok_count += 1
        fixed_commands.extend(contour)

    pen = TTGlyphPen(None)
    draw_glyph(pen, fixed_commands)
    drawn_glyphs[name] = pen.glyph()

print(f"  Contours reversed: {reversed_count}, already CW: {ok_count}")

# Build font
fb = FontBuilder(EM, isTTF=True)
fb.setupGlyphOrder(glyph_names)
fb.setupCharacterMap(cmap)
fb.setupGlyf(drawn_glyphs)

# Set proper lsb from actual glyph bounds
metrics = {}
glyf_table = fb.font['glyf']
for name in glyph_names:
    g = glyf_table[name]
    lsb = g.xMin if g.numberOfContours > 0 else 0
    metrics[name] = (ADV_WIDTH, lsb)
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

# Set PUA unicode range
os2 = fb.font['OS/2']
os2.ulUnicodeRange3 = os2.ulUnicodeRange3 | (1 << (57 - 32))

# Save
script_dir = os.path.dirname(os.path.abspath(__file__))
out_dir = os.path.join(script_dir, '..', 'src', 'assets', 'fonts')
public_dir = os.path.join(script_dir, '..', 'public', 'fonts')
os.makedirs(out_dir, exist_ok=True)
os.makedirs(public_dir, exist_ok=True)

for d in [out_dir, public_dir]:
    fb.font.save(os.path.join(d, 'kanjiquest-primitives.ttf'))
    shutil.copy2(os.path.join(d, 'kanjiquest-primitives.ttf'),
                 os.path.join(d, 'kanjiquest-primitives.otf'))

# Verify
font = TTFont(os.path.join(out_dir, 'kanjiquest-primitives.ttf'))
gs = font.getGlyphSet()
glyf = font['glyf']
bad = 0
total_nonempty = 0
for name in font.getGlyphOrder():
    g = glyf[name]
    if g.numberOfContours <= 0:
        continue
    total_nonempty += 1
    ap = AreaPen(gs)
    gs[name].draw(ap)
    if ap.value < 0:
        bad += 1
        print(f"  BAD WINDING: {name} area={ap.value:.1f}")

# Spot check coordinates
checks = {'horns': 'pua_000b', 'stretch': 'pua_0038', 'belt': 'pua_003f', 'straightened hook': 'pua_000c'}
print(f"\nSpot checks:")
for label, name in checks.items():
    g = glyf[name]
    print(f"  {label}: bbox=({g.xMin},{g.yMin})-({g.xMax},{g.yMax})")

size_kb = os.path.getsize(os.path.join(out_dir, 'kanjiquest-primitives.ttf')) / 1024
print(f"\nVerification: {total_nonempty} non-empty glyphs, {bad} bad winding")
print(f"Size: {size_kb:.1f} KB")
print("Done!")

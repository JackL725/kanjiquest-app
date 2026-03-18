// ─── KanjiQuest Primitives Font Builder ──────────────────────────────────
// Generates a WOFF2 font with custom glyphs for all Heisig primitives
// that don't exist in standard Unicode.
//
// Usage: node scripts/build-font.js
// Output: src/assets/fonts/kanjiquest-primitives.woff2
//
// Each glyph is mapped to a Private Use Area codepoint (U+E000–E0FF).
// The registry in src/data/primitives/registry.js uses PUA(offset) to
// generate the character, which maps to U+E000 + offset.

const opentype = require('opentype.js')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const EM = 1000
const ASCENDER = 880
const DESCENDER = -120
const ADV_WIDTH = 1000  // monospace CJK advance

// ── Stroke helpers ───────────────────────────────────────────────────────
// All strokes are defined as filled outlines in font coordinates
// where y increases UPWARD, x increases rightward.
// Character box: roughly (100,50) to (900,830)

function p() {
  return new opentype.Path()
}

// Horizontal stroke with slight taper
function hStroke(path, x1, y, x2, t = 70) {
  const half = t / 2
  // Slight bulge in the middle
  const mx = (x1 + x2) / 2
  path.moveTo(x1, y + half * 0.7)
  path.quadraticCurveTo(mx, y + half, x2, y + half * 0.7)
  path.lineTo(x2, y - half * 0.7)
  path.quadraticCurveTo(mx, y - half, x1, y - half * 0.7)
  path.close()
}

// Vertical stroke with slight taper
function vStroke(path, x, y1, y2, t = 70) {
  const half = t / 2
  const my = (y1 + y2) / 2
  path.moveTo(x - half * 0.7, y1)
  path.quadraticCurveTo(x - half, my, x - half * 0.7, y2)
  path.lineTo(x + half * 0.7, y2)
  path.quadraticCurveTo(x + half, my, x + half * 0.7, y1)
  path.close()
}

// Diagonal stroke (generic)
function dStroke(path, x1, y1, x2, y2, t = 65) {
  const dx = x2 - x1, dy = y2 - y1
  const len = Math.sqrt(dx*dx + dy*dy)
  const nx = -dy/len * t/2, ny = dx/len * t/2
  path.moveTo(x1 + nx, y1 + ny)
  path.lineTo(x2 + nx * 0.5, y2 + ny * 0.5)
  path.lineTo(x2 - nx * 0.5, y2 - ny * 0.5)
  path.lineTo(x1 - nx, y1 - ny)
  path.close()
}

// Left-falling stroke (撇) - thins at bottom
function leftFall(path, x1, y1, x2, y2, t1 = 70, t2 = 25) {
  const dx = x2-x1, dy = y2-y1
  const len = Math.sqrt(dx*dx+dy*dy)
  const nx = -dy/len, ny = dx/len
  path.moveTo(x1 + nx*t1/2, y1 + ny*t1/2)
  path.lineTo(x2 + nx*t2/2, y2 + ny*t2/2)
  path.lineTo(x2 - nx*t2/2, y2 - ny*t2/2)
  path.lineTo(x1 - nx*t1/2, y1 - ny*t1/2)
  path.close()
}

// Right-falling stroke (捺) - thickens then thins
function rightFall(path, x1, y1, x2, y2, t = 65) {
  const mx = (x1+x2)/2, my = (y1+y2)/2
  const dx = x2-x1, dy = y2-y1
  const len = Math.sqrt(dx*dx+dy*dy)
  const nx = -dy/len, ny = dx/len
  path.moveTo(x1 + nx*t*0.3, y1 + ny*t*0.3)
  path.quadraticCurveTo(mx + nx*t*0.6, my + ny*t*0.6, x2 + nx*t*0.15, y2 + ny*t*0.15)
  path.lineTo(x2 - nx*t*0.15, y2 - ny*t*0.15)
  path.quadraticCurveTo(mx - nx*t*0.3, my - ny*t*0.3, x1 - nx*t*0.3, y1 - ny*t*0.3)
  path.close()
}

// Dot/drop
function dot(path, x, y, size = 70) {
  path.moveTo(x, y + size * 0.3)
  path.quadraticCurveTo(x + size * 0.5, y + size * 0.2, x + size * 0.4, y - size * 0.4)
  path.quadraticCurveTo(x + size * 0.1, y - size * 0.6, x - size * 0.1, y - size * 0.3)
  path.quadraticCurveTo(x - size * 0.3, y, x, y + size * 0.3)
  path.close()
}

// L-shaped turning stroke
function lTurn(path, x1, y1, x2, y2, x3, y3, t = 65) {
  const half = t / 2
  // Vertical part
  path.moveTo(x1 - half, y1)
  path.lineTo(x1 - half, y2 - half)
  // Turn corner
  path.lineTo(x3, y2 - half)
  path.lineTo(x3, y2 + half)
  path.lineTo(x1 + half, y2 + half)
  path.lineTo(x1 + half, y1)
  path.close()
}

// ── Glyph definitions ────────────────────────────────────────────────────
// Maps PUA offset → glyph path builder function
// Each function returns an opentype.Path

const glyphs = {}

// PUA(10) = bound up small (ク-like, 2 strokes)
glyphs[10] = () => {
  const g = p()
  leftFall(g, 400, 750, 250, 500, 60, 25)
  // Horizontal turning right then down
  g.moveTo(350, 720); g.lineTo(650, 720); g.lineTo(650, 660)
  g.quadraticCurveTo(640, 450, 550, 350)
  g.lineTo(490, 380)
  g.quadraticCurveTo(570, 470, 580, 660)
  g.lineTo(370, 660); g.close()
  return g
}

// PUA(11) = horns (two short angled strokes)
glyphs[11] = () => {
  const g = p()
  dot(g, 350, 700, 80) // left horn - tick going left-down
  dStroke(g, 550, 720, 620, 620, 55) // right horn - short right-falling
  return g
}

// PUA(12) = straightened hook (L-shape)
glyphs[12] = () => {
  const g = p()
  lTurn(g, 250, 750, 250, 200, 750, 200, 70)
  return g
}

// PUA(14) = tool (horizontal + two spreading strokes)
glyphs[14] = () => {
  const g = p()
  hStroke(g, 200, 700, 800, 65)
  leftFall(g, 430, 650, 200, 250, 65, 25)
  rightFall(g, 530, 650, 800, 250, 65)
  return g
}

// PUA(15) = by one's side (ナ shape)
glyphs[15] = () => {
  const g = p()
  hStroke(g, 250, 550, 700, 60)
  dStroke(g, 470, 750, 250, 200, 60)
  return g
}

// PUA(22) = river alt 2 (vertical strokes like 川 variant)
glyphs[22] = () => {
  const g = p()
  vStroke(g, 300, 700, 200, 55)
  vStroke(g, 500, 750, 200, 55)
  vStroke(g, 700, 700, 200, 55)
  return g
}

// PUA(28) = pole (tree 木 without bottom-left stroke)
glyphs[28] = () => {
  const g = p()
  hStroke(g, 200, 500, 800, 65)
  vStroke(g, 500, 800, 150, 65)
  rightFall(g, 500, 500, 750, 200, 60)
  return g
}

// PUA(31) = turtle (vertical with two left ticks)
glyphs[31] = () => {
  const g = p()
  vStroke(g, 550, 800, 150, 65)
  dStroke(g, 500, 700, 350, 600, 50)
  dStroke(g, 500, 500, 350, 400, 50)
  return g
}

// PUA(35) = meeting (top of 会 — umbrella + horizontal)
glyphs[35] = () => {
  const g = p()
  // Umbrella/tent shape
  leftFall(g, 500, 800, 180, 400, 65, 30)
  rightFall(g, 500, 800, 820, 400, 65)
  hStroke(g, 300, 350, 700, 55)
  return g
}

// PUA(41) = whirlwind (亠 on top, 儿 below)
glyphs[41] = () => {
  const g = p()
  hStroke(g, 200, 650, 800, 60)
  dot(g, 500, 770, 70)
  // Two curved legs
  g.moveTo(340, 600); g.quadraticCurveTo(320, 350, 200, 200)
  g.lineTo(260, 180); g.quadraticCurveTo(380, 330, 400, 600); g.close()
  g.moveTo(600, 600); g.quadraticCurveTo(620, 350, 750, 200)
  g.lineTo(690, 180); g.quadraticCurveTo(560, 330, 540, 600); g.close()
  return g
}

// PUA(42) = tall (top-hat with box mouth)
glyphs[42] = () => {
  const g = p()
  dot(g, 500, 800, 65)
  hStroke(g, 200, 680, 800, 60)
  vStroke(g, 250, 620, 350, 60)
  vStroke(g, 750, 620, 350, 60)
  hStroke(g, 250, 350, 750, 60)
  hStroke(g, 200, 200, 800, 60)
  return g
}

// PUA(44) = schoolhouse (⺌ on top + heart-like bottom)
glyphs[44] = () => {
  const g = p()
  // Top: little (⺌)
  vStroke(g, 500, 800, 600, 55)
  dot(g, 350, 730, 55)
  dot(g, 650, 730, 55)
  // Bottom: heart variant
  vStroke(g, 350, 550, 200, 50)
  dot(g, 500, 400, 60)
  vStroke(g, 650, 550, 200, 50)
  return g
}

// PUA(46) = brush alt (variant of 聿)
glyphs[46] = () => {
  const g = p()
  hStroke(g, 250, 750, 750, 55)
  hStroke(g, 250, 580, 750, 55)
  hStroke(g, 250, 410, 750, 55)
  hStroke(g, 200, 240, 800, 60)
  vStroke(g, 500, 800, 150, 60)
  return g
}

// PUA(49) = quiver (arrow 弋 with extra stroke)
glyphs[49] = () => {
  const g = p()
  hStroke(g, 200, 600, 800, 60)
  dStroke(g, 550, 600, 350, 200, 55)
  vStroke(g, 700, 750, 200, 55)
  dot(g, 350, 750, 60)
  return g
}

// PUA(52) = thanksgiving (我 variant with fiesta)
glyphs[52] = () => {
  const g = p()
  hStroke(g, 150, 650, 550, 55)
  hStroke(g, 150, 450, 550, 55)
  vStroke(g, 350, 800, 200, 55)
  leftFall(g, 350, 650, 150, 200, 55, 20)
  // Right: fiesta (戈) strokes
  hStroke(g, 550, 700, 850, 55)
  dStroke(g, 700, 700, 550, 200, 55)
  vStroke(g, 800, 800, 350, 50)
  dot(g, 750, 550, 50)
  return g
}

// PUA(54) = float (麦 variant)
glyphs[54] = () => {
  const g = p()
  hStroke(g, 200, 750, 800, 55)
  hStroke(g, 250, 600, 750, 55)
  vStroke(g, 500, 750, 450, 55)
  leftFall(g, 500, 450, 200, 150, 60, 25)
  rightFall(g, 500, 450, 800, 150, 60)
  hStroke(g, 200, 300, 800, 55)
  return g
}

// PUA(55) = mending (正 variant)
glyphs[55] = () => {
  const g = p()
  hStroke(g, 200, 750, 800, 60)
  vStroke(g, 250, 750, 200, 55)
  hStroke(g, 250, 480, 650, 55)
  vStroke(g, 650, 750, 200, 55)
  hStroke(g, 150, 200, 850, 65)
  return g
}

// PUA(56) = stretch (3 strokes, like 又 but more angular)
glyphs[56] = () => {
  const g = p()
  hStroke(g, 300, 700, 700, 55)
  leftFall(g, 500, 700, 250, 250, 60, 25)
  rightFall(g, 500, 700, 750, 250, 60)
  return g
}

// PUA(57) = zoo (疋-like)
glyphs[57] = () => {
  const g = p()
  hStroke(g, 200, 750, 700, 55)
  vStroke(g, 250, 750, 450, 55)
  hStroke(g, 250, 450, 700, 55)
  vStroke(g, 700, 750, 200, 55)
  hStroke(g, 200, 200, 800, 60)
  return g
}

// PUA(58) = zoo alt (正-like variant)
glyphs[58] = () => {
  const g = p()
  hStroke(g, 200, 750, 800, 55)
  vStroke(g, 300, 750, 450, 55)
  hStroke(g, 300, 450, 700, 55)
  vStroke(g, 700, 450, 200, 55)
  hStroke(g, 200, 200, 800, 60)
  return g
}

// PUA(59) = scarf (亻+ something)
glyphs[59] = () => {
  const g = p()
  dStroke(g, 350, 750, 250, 550, 55)
  vStroke(g, 350, 600, 200, 55)
  hStroke(g, 400, 550, 700, 55)
  dStroke(g, 550, 550, 650, 250, 50)
  return g
}

// PUA(61) = top hat and scarf (亠 + scarf combination)
glyphs[61] = () => {
  const g = p()
  dot(g, 500, 800, 60)
  hStroke(g, 200, 700, 800, 55)
  dStroke(g, 350, 650, 250, 450, 50)
  vStroke(g, 350, 500, 200, 50)
  hStroke(g, 400, 450, 700, 50)
  dStroke(g, 550, 450, 650, 200, 50)
  return g
}

// PUA(63) = belt (two vertical strokes in a gate-like shape)
glyphs[63] = () => {
  const g = p()
  vStroke(g, 400, 700, 300, 60)
  vStroke(g, 600, 700, 300, 60)
  return g
}

// PUA(68) = ice alternate (two dots horizontal)
glyphs[68] = () => {
  const g = p()
  dot(g, 350, 550, 75)
  dot(g, 600, 450, 75)
  return g
}

// PUA(69) = witch (矢 top-like, 4 strokes)
glyphs[69] = () => {
  const g = p()
  hStroke(g, 250, 700, 750, 55)
  leftFall(g, 500, 800, 200, 500, 65, 25)
  hStroke(g, 200, 500, 800, 60)
  vStroke(g, 500, 500, 200, 55)
  return g
}

// PUA(72) = siesta (日+勹 variant, 8 strokes)
glyphs[72] = () => {
  const g = p()
  // Box part
  vStroke(g, 250, 750, 400, 55)
  vStroke(g, 650, 750, 400, 55)
  hStroke(g, 250, 750, 650, 55)
  hStroke(g, 250, 570, 650, 55)
  hStroke(g, 250, 400, 650, 55)
  // Bottom wrapping
  g.moveTo(200, 370); g.lineTo(750, 370); g.lineTo(750, 310)
  g.quadraticCurveTo(740, 180, 600, 150)
  g.lineTo(580, 210)
  g.quadraticCurveTo(690, 240, 690, 310)
  g.lineTo(200, 310); g.close()
  return g
}

// PUA(73) = reclining (person lying down — 2 strokes)
glyphs[73] = () => {
  const g = p()
  dStroke(g, 300, 650, 400, 500, 55)
  hStroke(g, 400, 500, 700, 55)
  return g
}

// PUA(75) = muzzle (8 strokes — like 音 variant)
glyphs[75] = () => {
  const g = p()
  hStroke(g, 250, 780, 750, 55)
  dot(g, 500, 830, 50)
  hStroke(g, 300, 650, 700, 50)
  // Box
  vStroke(g, 280, 550, 300, 50)
  vStroke(g, 720, 550, 300, 50)
  hStroke(g, 280, 550, 720, 50)
  hStroke(g, 280, 420, 720, 50)
  hStroke(g, 280, 300, 720, 50)
  return g
}

// PUA(76) = kazoo (12 strokes — 音+欠 like)
glyphs[76] = () => {
  const g = p()
  // Left: muzzle variant
  hStroke(g, 150, 780, 550, 50)
  hStroke(g, 200, 650, 500, 45)
  vStroke(g, 180, 550, 300, 45)
  vStroke(g, 500, 550, 300, 45)
  hStroke(g, 180, 550, 500, 45)
  hStroke(g, 180, 420, 500, 45)
  hStroke(g, 180, 300, 500, 45)
  // Right: 欠 component
  dStroke(g, 600, 700, 700, 550, 50)
  dStroke(g, 650, 600, 550, 450, 50)
  leftFall(g, 650, 450, 550, 200, 50, 20)
  rightFall(g, 650, 450, 850, 200, 50)
  return g
}

// PUA(81) = gnats (虫 variant, 7 strokes)
glyphs[81] = () => {
  const g = p()
  vStroke(g, 250, 750, 500, 55)
  hStroke(g, 250, 750, 700, 55)
  vStroke(g, 700, 750, 500, 55)
  hStroke(g, 250, 620, 700, 50)
  hStroke(g, 250, 500, 700, 55)
  vStroke(g, 475, 500, 250, 50)
  hStroke(g, 200, 250, 750, 55)
  return g
}

// PUA(82) = eel (電 top variant, 5 strokes)
glyphs[82] = () => {
  const g = p()
  vStroke(g, 500, 750, 200, 55)
  hStroke(g, 250, 600, 750, 55)
  hStroke(g, 250, 450, 750, 55)
  vStroke(g, 250, 600, 200, 50)
  g.moveTo(500, 250); g.quadraticCurveTo(600, 200, 700, 250)
  g.lineTo(690, 310); g.quadraticCurveTo(600, 270, 510, 310); g.close()
  return g
}

// PUA(83) = sow (豕 variant, 7 strokes)
glyphs[83] = () => {
  const g = p()
  hStroke(g, 250, 700, 750, 55)
  vStroke(g, 500, 700, 200, 55)
  dot(g, 350, 620, 50)
  dot(g, 650, 620, 50)
  leftFall(g, 450, 550, 200, 250, 55, 20)
  rightFall(g, 550, 550, 800, 250, 55)
  dStroke(g, 300, 400, 200, 200, 45)
  return g
}

// PUA(84) = piglet (5 strokes — simplified pig form)
glyphs[84] = () => {
  const g = p()
  hStroke(g, 250, 700, 750, 55)
  leftFall(g, 500, 700, 250, 350, 55, 20)
  g.moveTo(500, 700); g.lineTo(700, 700)
  g.quadraticCurveTo(750, 500, 700, 300)
  g.lineTo(640, 310); g.quadraticCurveTo(690, 500, 650, 660)
  g.lineTo(500, 660); g.close()
  dot(g, 350, 550, 55)
  dStroke(g, 300, 400, 200, 250, 45)
  return g
}

// PUA(87) = wool (sheep 羊 + extra at bottom)
glyphs[87] = () => {
  const g = p()
  dot(g, 350, 800, 55)
  dot(g, 650, 800, 55)
  hStroke(g, 250, 680, 750, 50)
  hStroke(g, 200, 530, 800, 55)
  vStroke(g, 500, 800, 200, 55)
  leftFall(g, 500, 350, 250, 150, 55, 20)
  rightFall(g, 500, 350, 750, 150, 55)
  return g
}

// PUA(89) = pegasus (大 on top of 隹)
glyphs[89] = () => {
  const g = p()
  // Top: 大
  hStroke(g, 250, 750, 750, 50)
  vStroke(g, 500, 800, 600, 50)
  leftFall(g, 500, 700, 250, 550, 50, 20)
  rightFall(g, 500, 700, 750, 550, 50)
  // Bottom: 隹 simplified
  hStroke(g, 300, 500, 700, 45)
  hStroke(g, 300, 380, 700, 45)
  hStroke(g, 300, 260, 700, 45)
  vStroke(g, 450, 500, 150, 45)
  dStroke(g, 600, 380, 700, 200, 40)
  return g
}

// PUA(94) = valentine (心 bottom form — 㣺)
glyphs[94] = () => {
  const g = p()
  dot(g, 250, 550, 65)
  dot(g, 450, 650, 55)
  dot(g, 650, 550, 65)
  // Hook stroke at bottom
  g.moveTo(200, 350); g.quadraticCurveTo(400, 200, 600, 300)
  g.quadraticCurveTo(750, 380, 800, 500)
  g.lineTo(740, 510)
  g.quadraticCurveTo(700, 400, 580, 340)
  g.quadraticCurveTo(400, 260, 220, 400); g.close()
  return g
}

// PUA(97) = genius (3 strokes unique form)
glyphs[97] = () => {
  const g = p()
  hStroke(g, 250, 650, 750, 60)
  dStroke(g, 450, 800, 350, 650, 55)
  vStroke(g, 500, 650, 200, 55)
  return g
}

// PUA(99) = missile (4 strokes)
glyphs[99] = () => {
  const g = p()
  leftFall(g, 500, 750, 250, 500, 60, 25)
  hStroke(g, 300, 500, 700, 55)
  dStroke(g, 500, 500, 300, 250, 50)
  dStroke(g, 500, 500, 700, 250, 50)
  return g
}

// PUA(100) = spool (5 strokes)
glyphs[100] = () => {
  const g = p()
  hStroke(g, 200, 750, 800, 55)
  leftFall(g, 500, 750, 250, 500, 55, 20)
  rightFall(g, 500, 750, 750, 500, 55)
  vStroke(g, 500, 500, 200, 55)
  hStroke(g, 200, 200, 800, 60)
  return g
}

// PUA(101) = vulture (4 strokes — ⺍ variant)
glyphs[101] = () => {
  const g = p()
  dot(g, 350, 750, 65)
  dot(g, 650, 750, 65)
  leftFall(g, 500, 600, 250, 250, 60, 25)
  rightFall(g, 500, 600, 750, 250, 60)
  return g
}

// PUA(103) = elbow (ム shape — 2 strokes)
glyphs[103] = () => {
  const g = p()
  dStroke(g, 250, 700, 550, 300, 55)
  hStroke(g, 250, 300, 550, 55)
  return g
}

// PUA(104) = birdhouse (6 strokes)
glyphs[104] = () => {
  const g = p()
  dStroke(g, 250, 700, 550, 300, 50)
  hStroke(g, 250, 300, 550, 50)
  vStroke(g, 400, 650, 350, 45)
  hStroke(g, 250, 550, 550, 45)
  // Small enclosed area
  hStroke(g, 300, 450, 500, 40)
  vStroke(g, 500, 550, 300, 45)
  return g
}

// PUA(105) = wall (3 strokes — 云 simplified)
glyphs[105] = () => {
  const g = p()
  hStroke(g, 200, 700, 800, 60)
  hStroke(g, 250, 500, 700, 55)
  g.moveTo(350, 500); g.quadraticCurveTo(400, 250, 700, 200)
  g.lineTo(690, 270); g.quadraticCurveTo(420, 310, 380, 500); g.close()
  return g
}

// PUA(106) = infant (4 strokes)
glyphs[106] = () => {
  const g = p()
  hStroke(g, 200, 700, 800, 55)
  vStroke(g, 500, 700, 350, 55)
  leftFall(g, 500, 350, 200, 150, 60, 20)
  rightFall(g, 500, 350, 800, 150, 60)
  return g
}

// PUA(107) = gully (5 strokes — 合 variant)
glyphs[107] = () => {
  const g = p()
  leftFall(g, 500, 800, 250, 550, 55, 25)
  rightFall(g, 500, 800, 750, 550, 55)
  vStroke(g, 300, 500, 200, 50)
  vStroke(g, 700, 500, 200, 50)
  hStroke(g, 300, 200, 700, 55)
  return g
}

// PUA(108) = outhouse (8 strokes)
glyphs[108] = () => {
  const g = p()
  // Top hat
  dot(g, 500, 830, 55)
  hStroke(g, 200, 730, 800, 50)
  // Box with contents
  vStroke(g, 250, 680, 350, 50)
  vStroke(g, 750, 680, 350, 50)
  hStroke(g, 250, 680, 750, 50)
  hStroke(g, 250, 510, 750, 50)
  hStroke(g, 250, 350, 750, 50)
  // Bottom
  hStroke(g, 200, 200, 800, 55)
  return g
}

// PUA(109) = bone (4 strokes — 夕 variant)
glyphs[109] = () => {
  const g = p()
  leftFall(g, 600, 750, 250, 350, 60, 25)
  g.moveTo(350, 700); g.lineTo(650, 700); g.lineTo(650, 640)
  g.quadraticCurveTo(640, 400, 550, 250)
  g.lineTo(490, 280)
  g.quadraticCurveTo(580, 420, 590, 640)
  g.lineTo(370, 640); g.close()
  hStroke(g, 350, 500, 600, 45)
  return g
}

// PUA(110) = sunglasses (7 strokes)
glyphs[110] = () => {
  const g = p()
  hStroke(g, 200, 750, 800, 55)
  vStroke(g, 500, 750, 550, 50)
  hStroke(g, 250, 550, 750, 50)
  vStroke(g, 250, 550, 300, 50)
  vStroke(g, 750, 550, 300, 50)
  hStroke(g, 250, 300, 750, 55)
  dot(g, 500, 200, 60)
  return g
}

// PUA(112) = chapel (4 strokes)
glyphs[112] = () => {
  const g = p()
  dot(g, 500, 800, 65)
  hStroke(g, 200, 650, 800, 55)
  vStroke(g, 500, 650, 250, 55)
  hStroke(g, 250, 250, 750, 55)
  return g
}

// PUA(115) = grains of rice (米 variant, 5 strokes)
glyphs[115] = () => {
  const g = p()
  hStroke(g, 200, 500, 800, 55)
  vStroke(g, 500, 800, 200, 55)
  dStroke(g, 250, 750, 500, 500, 45)
  dStroke(g, 750, 750, 500, 500, 45)
  dStroke(g, 500, 500, 300, 250, 40)
  return g
}

// PUA(118) = plow (2 strokes — short diagonal + vertical)
glyphs[118] = () => {
  const g = p()
  dStroke(g, 350, 700, 500, 500, 55)
  vStroke(g, 500, 500, 200, 55)
  return g
}

// PUA(120) = sunglasses one lens popped (4 strokes)
glyphs[120] = () => {
  const g = p()
  hStroke(g, 200, 650, 500, 55)
  vStroke(g, 500, 650, 350, 50)
  hStroke(g, 200, 350, 800, 55)
  vStroke(g, 200, 650, 200, 50)
  return g
}

// For brevity, define remaining PUA glyphs as simple placeholder rectangles
// that will be refined in subsequent sessions. These are visually distinct
// so they don't just show as empty boxes.

function placeholder(offset, strokes) {
  const g = p()
  // Draw a small glyph with the stroke count indicated
  hStroke(g, 200, 750, 800, 50)
  hStroke(g, 200, 200, 800, 50)
  vStroke(g, 200, 750, 200, 50)
  vStroke(g, 800, 750, 200, 50)
  // Center dot
  dot(g, 500, 480, 80)
  return g
}

// Fill in all remaining PUA slots with either defined or placeholder glyphs
const ALL_PUA_OFFSETS = [
  10, 11, 12, 14, 15, 22, 28, 31, 35, 41, 42, 44, 46, 49, 52, 54, 55, 56, 57, 58,
  59, 61, 63, 68, 69, 72, 73, 75, 76, 81, 82, 83, 84, 87, 89, 94, 97, 99, 100, 101,
  103, 104, 105, 106, 107, 108, 109, 110, 112, 115, 118, 120,
  121, 122, 123, 126, 127, 128, 129, 130, 135, 137, 138, 139, 140, 142,
  146, 148, 149, 150, 151, 153, 154, 155, 157, 158, 159, 161, 164, 167, 168,
  169, 170, 171, 172, 173, 174, 176, 177, 178, 179, 180, 181, 182, 184, 185,
  188, 192, 193, 195, 196, 200, 202, 204, 207, 209, 210, 211, 212, 215, 216,
  218, 219, 220, 221, 222, 223, 224, 226, 227,
]

// Fill in placeholders for undefined glyphs
for (const offset of ALL_PUA_OFFSETS) {
  if (!glyphs[offset]) {
    glyphs[offset] = () => placeholder(offset)
  }
}

// ── Build the font ───────────────────────────────────────────────────────
console.log('Building KanjiQuest Primitives font...')
console.log(`  Defined glyphs: ${Object.keys(glyphs).filter(k => glyphs[k] !== placeholder).length} custom`)
console.log(`  Placeholder glyphs: ${ALL_PUA_OFFSETS.length - Object.keys(glyphs).filter(k => glyphs[k].toString() !== placeholder.toString()).length}`)

const notdefGlyph = new opentype.Glyph({
  name: '.notdef',
  unicode: 0,
  advanceWidth: ADV_WIDTH,
  path: new opentype.Path(),
})

const spaceGlyph = new opentype.Glyph({
  name: 'space',
  unicode: 32,
  advanceWidth: ADV_WIDTH / 2,
  path: new opentype.Path(),
})

const fontGlyphs = [notdefGlyph, spaceGlyph]

for (const offset of ALL_PUA_OFFSETS) {
  const codepoint = 0xE000 + offset
  const builder = glyphs[offset]
  if (!builder) continue

  const glyphPath = builder()
  
  const glyph = new opentype.Glyph({
    name: `pua_${offset.toString(16).padStart(4, '0')}`,
    unicode: codepoint,
    advanceWidth: ADV_WIDTH,
    path: glyphPath,
  })
  fontGlyphs.push(glyph)
}

console.log(`  Total glyphs in font: ${fontGlyphs.length}`)

const font = new opentype.Font({
  familyName: 'KanjiQuest Primitives',
  styleName: 'Regular',
  unitsPerEm: EM,
  ascender: ASCENDER,
  descender: DESCENDER,
  glyphs: fontGlyphs,
})

// Write OTF (opentype.js outputs OTF natively)
const outDir = path.join(__dirname, '..', 'src', 'assets', 'fonts')
fs.mkdirSync(outDir, { recursive: true })

const otfPath = path.join(outDir, 'kanjiquest-primitives.otf')
font.download && typeof font.download
const buffer = font.toArrayBuffer()
fs.writeFileSync(otfPath, Buffer.from(buffer))
console.log(`  Written: ${otfPath} (${(buffer.byteLength / 1024).toFixed(1)} KB)`)

// Convert to WOFF2 if possible
try {
  execSync(`which woff2_compress`, { stdio: 'ignore' })
  execSync(`woff2_compress ${otfPath}`)
  console.log('  Converted to WOFF2')
} catch {
  console.log('  (woff2_compress not available — using OTF directly)')
}

console.log('Done!')

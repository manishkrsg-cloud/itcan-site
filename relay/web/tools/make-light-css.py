#!/usr/bin/env python3
"""Generate css/theme-light.auto.css from the dark stylesheets.

Every declaration that carries a colour is re-emitted under :root[data-theme="light"]
with the colour flipped for a light page: white tints become ink tints, dark neutrals
become light neutrals, grey text is inverted, brand reds and blues stay. Hand-tuned
fixes live in css/theme-light.css, which loads after this file.
Run: python3 tools/make-light-css.py   (from relay/web) after changing any colour.
"""
import re, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent / "css"
ORDER = ["base", "components", "hero", "practices", "services", "sectors", "statement", "offices",
         "awards", "proof", "about", "engage", "contact", "footer", "perf"]
PROPS = re.compile(r"^(color|background(-color|-image)?|border(-(top|right|bottom|left))?(-color)?|outline(-color)?|"
                   r"box-shadow|text-shadow|fill|stroke|filter|caret-color|--[\w-]+)$")
# parts of the page that stay dark or brand-coloured in both themes
SKIP = re.compile(r"\.sp-(card|inner|media|img|shade|sheen|top|num|kind|body|name|desc|tags|mark|id)|"
                  r"\.st-|\.statement\b|\.logo-open|\.of-band|\.of-mapsvg|\.of-sea|\.of-land|\.of-near|\.of-pin|\.of-code|\.of-when|\.of-state|\.of-clock|\.of-badge|\.pf-col\b|\.pf-ico|\.pf-av|"
                  r"\.cta\b|\.cta-|\.lb\b|\.lb-|\.vm\b|\.vm-|dialog|\.pl-|\.preloader|\.mark\b|\.mark--|"
                  r"\.globe-hq|\.aw-card|\.aw-lb|\.skip\b|\.ss-(face|name|ico|card)|\.fwrap|\.fglow")
KEEP_VARS = re.compile(r"^--(glow|halo|accent|raw-color-red|raw-color-blue|card-|persp|u$|hero-|nav-h|page-width|ease|sp-ease|stream-|on-accent)")
COLOR = re.compile(r"rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*[\d.]+\s*)?\)|#[0-9a-fA-F]{8}\b|#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b|(?<![-\w])white(?![-\w])|(?<![-\w])black(?![-\w])")
INK = (11, 18, 51)   # ITCAN navy ink for light pages
BLUE = (31, 63, 214) # ITCAN blue: what white hover/selected states become on light pages
STATE = re.compile(r":hover|:focus|:active|is-rel\b|is-on\b|aria-pressed=\"true\"|aria-selected=\"true\"|aria-current")

def parse(c):
    c = c.strip()
    if c == "white": return (255, 255, 255, None)
    if c == "black": return (0, 0, 0, None)
    if c.startswith("#"):
        h = c[1:]
        if len(h) == 3: h = "".join(x * 2 for x in h)
        a = None
        if len(h) == 8: a = round(int(h[6:8], 16) / 255, 3); h = h[:6]
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
    n = [float(x) for x in re.findall(r"[\d.]+", c)]
    return (int(n[0]), int(n[1]), int(n[2]), n[3] if len(n) > 3 else None)

def fmt(r, g, b, a):
    r, g, b = (max(0, min(255, int(round(v)))) for v in (r, g, b))
    return f"rgba({r}, {g}, {b}, {a:g})" if a is not None else f"#{r:02x}{g:02x}{b:02x}"

def flip(c, shadow=False, state=False):
    r, g, b, a = parse(c)
    chroma, avg = max(r, g, b) - min(r, g, b), (r + g + b) / 3
    if shadow and avg < 60 and chroma < 30:           # drop shadows stay dark but softer
        return fmt(r, g, b, round((a if a is not None else 1) * 0.35, 3))
    if chroma < 40:                                    # neutrals
        if avg >= 200: return fmt(*(BLUE if state else INK), a)  # white: ink (blue on hover/selected)
        if avg < 90:                                   # dark surfaces: light surfaces
            v = 255 - avg * 0.55
            return fmt(v - 3, v - 2, v, a)
        v = 255 - avg                                  # grey text: inverted grey with a cool tint
        return fmt(v - 6, v - 3, v + 6, a)
    if avg > 185:                                      # pale tints made for dark pages
        return fmt(192, 24, 42, a) if r >= max(g, b) else fmt(50, 73, 201, a)
    return c                                           # brand colours stay

def flip_value(prop, val, state=False):
    shadow = prop in ("box-shadow", "text-shadow") or "drop-shadow" in val or (prop.startswith("--") and re.search(r"shadow|elevation", prop) is not None)
    return COLOR.sub(lambda m: flip(m.group(0), shadow, state), val)

def scope(sel):
    out = []
    for s in sel.split(","):
        s = s.strip()
        if not s: continue
        if s in (":root", "html"): out.append(':root[data-theme="light"]'); continue
        m = re.match(r"^(\.motion|\.lenis|html)(.*)$", s)
        if m and m.group(1) != "html": out.append(':root[data-theme="light"]' + s); continue
        if s.startswith("html"): out.append(':root[data-theme="light"]' + s[4:]); continue
        if s.startswith(":root"): out.append(':root[data-theme="light"]' + s[5:]); continue
        out.append(':root[data-theme="light"] ' + s)
    return ", ".join(out)

def blocks(text):
    """Yield (prelude, body) for top-level blocks."""
    i, n = 0, len(text)
    while i < n:
        j = text.find("{", i)
        if j < 0: break
        prelude = text[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            if text[k] == "{": depth += 1
            elif text[k] == "}": depth -= 1
            k += 1
        yield prelude, text[j + 1:k - 1]
        i = k

def rules(text):
    out = []
    for prelude, body in blocks(text):
        if prelude.startswith("@media") or prelude.startswith("@supports"):
            inner = rules(body)
            if inner: out.append(prelude + " {\n" + "\n".join("  " + r for r in inner) + "\n}")
            continue
        if prelude.startswith("@"): continue        # keyframes, font-face, imports
        if SKIP.search(prelude): continue
        decls = []
        for d in re.split(r";(?![^(]*\))", body):
            if ":" not in d: continue
            prop, val = d.split(":", 1)
            prop, val = prop.strip(), val.strip()
            if not PROPS.match(prop) or (prop.startswith("--") and KEEP_VARS.match(prop)): continue
            if not COLOR.search(val): continue
            nv = flip_value(prop, val, bool(STATE.search(prelude)))
            if nv != val:
                # a bare colour in the shorthand would reset size, position and repeat set elsewhere
                if prop == "background" and COLOR.fullmatch(nv.strip()): prop = "background-color"
                decls.append(f"{prop}: {nv}")
        if decls and re.search(r"background-clip:\s*text", body) and any(d.startswith("background") for d in decls):
            decls += ["-webkit-background-clip: text", "background-clip: text"]   # the shorthand resets the clip
        if decls: out.append(f"{scope(prelude)} {{ {'; '.join(decls)}; }}")
    return out

parts = ["/* generated by tools/make-light-css.py: do not edit, change the dark CSS or theme-light.css */"]
for name in ORDER:
    src = re.sub(r"/\*.*?\*/", "", (ROOT / f"{name}.css").read_text(), flags=re.S)
    r = rules(src)
    if r: parts.append(f"/* {name} */\n" + "\n".join(r))
(ROOT / "theme-light.auto.css").write_text("\n".join(parts) + "\n")
print("rules:", sum(p.count("{") for p in parts))

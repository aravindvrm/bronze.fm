#!/usr/bin/env python3
"""Generates one .dc.html artboard per direction.

Same markup and the same real values lifted from the app; only the palette,
the starfield tint and the accent stance change. Generated rather than
hand-copied so the four stay honestly comparable — a difference you see is a
difference in the direction, not a typo in one of four transcriptions.
"""
import json, random, pathlib

OUT = pathlib.Path(__file__).parent

DIRECTIONS = [
    dict(
        file="Main.dc.html", name="Strict Mono", label="A",
        bg="#0b0b0b", surf="#151515", line="rgba(255,255,255,0.14)",
        text="#ededed", accent="#ffffff", star="#ffffff", starA=0.85,
        glow="rgba(255,255,255,0.05)",
        motive="No hue anywhere. Contrast, weight and spacing carry the whole hierarchy.",
        tradeoff="Nothing signals “this is bronze.fm” but the wordmark — the least ownable of the four.",
    ),
    dict(
        file="CoolAsh.dc.html", name="Cool Ash", label="B",
        bg="#0b0d11", surf="#14171d", line="rgba(190,205,225,0.14)",
        text="#e4e9f1", accent="#9db4cc", star="#cfe0f5", starA=0.9,
        glow="rgba(120,150,190,0.07)",
        motive="The holding page's night-sky cast, kept desaturated. Steel blue does the accent work.",
        tradeoff="Reads cold and a little corporate-tech; furthest from the warmth the name implies.",
    ),
    dict(
        file="MonoBronze.dc.html", name="Mono + Bronze", label="C",
        bg="#0b0b0b", surf="#151515", line="rgba(255,255,255,0.14)",
        text="#ededed", accent="#cd7f32", star="#ffffff", starA=0.85,
        glow="rgba(205,127,50,0.06)",
        motive="Neutral everywhere, bronze reserved for state only — active row, play, live link.",
        tradeoff="Keeps a colour the brief asked to drop; the accent must stay disciplined or it drifts back to today's look.",
    ),
    dict(
        file="BoneGraphite.dc.html", name="Bone & Graphite", label="D",
        bg="#0d0c0a", surf="#161512", line="rgba(240,235,225,0.13)",
        text="#efeae0", accent="#e8dcc8", star="#fff6e8", starA=0.85,
        glow="rgba(200,180,150,0.06)",
        motive="Warm neutrals with no blue. Bone against graphite — monochrome that still feels like paper and metal.",
        tradeoff="Warmth without bronze can read as “off-white” rather than deliberate; the narrowest gap between good and muddy.",
    ),
]

# One deterministic starfield reused across directions, so the only thing that
# changes between them is the tint. Plausible in CSS: each star is a
# radial-gradient stop, which is exactly how it would be drawn in the app.
rng = random.Random(7)
STARS = [(round(rng.uniform(0, 100), 2), round(rng.uniform(0, 100), 2),
          round(rng.uniform(0.6, 1.6), 2), round(rng.uniform(0.25, 1.0), 2))
         for _ in range(70)]


def starfield(colour, alpha, glow):
    layers = []
    for x, y, r, a in STARS:
        layers.append(
            f"radial-gradient(circle {r}px at {x}% {y}%, "
            f"rgba(255,255,255,0) 0, {colour} 0) "
        )
    # Cheap depth: two broad glows under the stars, no blur filters.
    base = (f"radial-gradient(ellipse 120% 70% at 50% 8%, {glow} 0%, rgba(0,0,0,0) 60%), "
            f"radial-gradient(ellipse 90% 50% at 20% 95%, {glow} 0%, rgba(0,0,0,0) 55%)")
    dots = ", ".join(
        f"radial-gradient(circle {r}px at {x}% {y}%, {colour} 0 100%, rgba(0,0,0,0) 100%)"
        for x, y, r, a in STARS
    )
    return base + ", " + dots


def stars_html(colour):
    """Individually positioned dots so opacity varies per star."""
    out = []
    for x, y, r, a in STARS:
        out.append(
            f'<span style="position:absolute;left:{x}%;top:{y}%;width:{r*2}px;height:{r*2}px;'
            f'border-radius:50%;background:{colour};opacity:{a}"></span>'
        )
    return "".join(out)


def icon(kind, colour, size=16):
    s = f'width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{colour}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"'
    paths = {
        "play": f'<svg {s} fill="{colour}" stroke="none"><path d="M8 5.14v13.72a1 1 0 0 0 1.54.84l10.3-6.86a1 1 0 0 0 0-1.68L9.54 4.3A1 1 0 0 0 8 5.14Z"/></svg>',
        "pause": f'<svg {s} fill="{colour}" stroke="none"><rect x="6" y="4.5" width="4" height="15" rx="1.2"/><rect x="14" y="4.5" width="4" height="15" rx="1.2"/></svg>',
        "book": f'<svg {s}><path d="M3 5.5A1.5 1.5 0 0 1 4.5 4H10a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4.5A1.5 1.5 0 0 1 3 15.5Z"/><path d="M21 5.5A1.5 1.5 0 0 0 19.5 4H14a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h5.5a1.5 1.5 0 0 0 1.5-1.5Z"/></svg>',
        "chev": f'<svg {s}><path d="m6 9 6 6 6-6"/></svg>',
        "queue": f'<svg {s}><path d="M4 6h11M4 12h11M4 18h7"/><path d="M18 10v8.5"/><circle cx="16.4" cy="18.6" r="1.9" fill="{colour}" stroke="none"/></svg>',
        "prev": f'<svg {s} fill="{colour}" stroke="none"><path d="M18 5.2v13.6a1 1 0 0 1-1.53.85l-9-6.8a1 1 0 0 1 0-1.7l9-6.8A1 1 0 0 1 18 5.2Z"/><rect x="4" y="4.6" width="2.6" height="14.8" rx="1.1"/></svg>',
        "next": f'<svg {s} fill="{colour}" stroke="none"><path d="M6 5.2v13.6a1 1 0 0 0 1.53.85l9-6.8a1 1 0 0 0 0-1.7l-9-6.8A1 1 0 0 0 6 5.2Z"/><rect x="17.4" y="4.6" width="2.6" height="14.8" rx="1.1"/></svg>',
        "vol": f'<svg {s}><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" fill="{colour}"/><path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4"/><path d="M18.5 6.2a8.5 8.5 0 0 1 0 11.6"/></svg>',
        "cart": f'<svg {s}><circle cx="9" cy="20" r="1.4" fill="{colour}" stroke="none"/><circle cx="18" cy="20" r="1.4" fill="{colour}" stroke="none"/><path d="M2 3h3l2.6 11.2a1.6 1.6 0 0 0 1.6 1.3h7.7a1.6 1.6 0 0 0 1.6-1.2L21 7H6"/></svg>',
        "ticket": f'<svg {s}><path d="M4 9V6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5V9a3 3 0 0 0 0 6v2.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5V15a3 3 0 0 0 0-6Z"/></svg>',
        "li": f'<svg {s}><rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5v6"/><circle cx="8" cy="7.6" r="0.9" fill="{colour}" stroke="none"/><path d="M12 16.5v-3.4a2.4 2.4 0 0 1 4.8 0v3.4"/></svg>',
        "x": f'<svg {s}><path d="M5 5l14 14M19 5 5 19"/></svg>',
        "ig": f'<svg {s}><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17" cy="7" r="0.9" fill="{colour}" stroke="none"/></svg>',
        "sp": f'<svg {s}><circle cx="12" cy="12" r="9"/><path d="M7 10c3.5-1 6.5-1 10 .8"/><path d="M7.5 13c2.8-.8 5.2-.8 8 .6"/><path d="M8 16c2.2-.6 4-.6 6 .4"/></svg>',
        "music": f'<svg {s}><circle cx="7" cy="17.5" r="2.5"/><circle cx="17" cy="15.5" r="2.5"/><path d="M9.5 17.5V6l10-2v11.5"/></svg>',
        "search": f'<svg {s}><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    }
    return paths[kind]


def art(seed, d, w="100%", h="100%", radius="6px"):
    """Stand-in for procedural cover art — same role as lib/art.ts."""
    r = random.Random(seed)
    h1, h2 = r.uniform(0, 360), r.uniform(0, 360)
    if d["name"] == "Mono + Bronze":
        c1, c2 = "#3a2a17", "#7d5122"
    elif d["name"] == "Cool Ash":
        c1, c2 = "#1b2029", "#3d4757"
    elif d["name"] == "Bone & Graphite":
        c1, c2 = "#221f19", "#4a4337"
    else:
        c1, c2 = "#1c1c1c", "#414141"
    return (f'<div style="width:{w};height:{h};border-radius:{radius};'
            f'background:radial-gradient(circle at 32% 28%, {c2} 0%, {c1} 62%, {d["bg"]} 100%);'
            f'border:1px solid {d["line"]}"></div>')


def phone(inner, d, caption):
    return f'''<div style="display:flex;flex-direction:column;gap:10px">
  <div style="width:390px;height:844px;border-radius:22px;overflow:hidden;position:relative;background:{d['bg']};border:1px solid {d['line']}">{inner}</div>
  <div style="font:400 11px/1.4 Georgia,serif;letter-spacing:0.14em;text-transform:uppercase;color:{d['text']}88;text-align:center">{caption}</div>
</div>'''


def label(txt, d):
    return (f'<div style="font:400 10px/1 Georgia,serif;letter-spacing:0.25em;'
            f'text-transform:uppercase;color:{d["text"]}66">{txt}</div>')


def splash(d):
    return f'''<div style="position:absolute;inset:0;background:{d['bg']}">
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 120% 70% at 50% 10%, {d['glow']} 0%, rgba(0,0,0,0) 62%)"></div>
  <div style="position:absolute;inset:0">{stars_html(d['star'])}</div>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px">
    <div style="width:74px;height:74px;border-radius:16px;border:1px solid {d['line']};display:flex;align-items:center;justify-content:center;background:{d['surf']}">
      {icon('music', d['accent'], 30)}
    </div>
    <div style="font:400 26px/1 Georgia,serif;letter-spacing:0.42em;text-transform:uppercase;color:{d['text']};padding-left:0.42em">bronze.fm</div>
  </div>
</div>'''


def feed(d):
    projects = [("Bronze", "dean", 11), ("Atonomos", "dean", 12)]
    cards = "".join(f'''<div style="position:relative;aspect-ratio:1/1;border-radius:6px;overflow:hidden;border:1px solid {d['line']}">
      {art(s, d)}
      <div style="position:absolute;inset:0;background:linear-gradient(to top, {d['bg']}e6 0%, {d['bg']}44 40%, rgba(0,0,0,0) 100%)"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;padding:14px">
        <div style="font:400 19px/1.1 'Abhaya Libre',Georgia,serif;color:{d['text']}">{t}</div>
        <div style="font:400 11px/1.4 system-ui,sans-serif;color:{d['text']}80;margin-top:2px">{o}</div>
      </div>
    </div>''' for t, o, s in projects)

    return f'''<div style="position:absolute;inset:0;padding:44px 20px 0;display:flex;flex-direction:column;gap:0">
  <div style="font:400 27px/1 Georgia,serif;letter-spacing:-0.01em;color:{d['text']}">bronze<span style="color:{d['accent']}">.fm</span></div>
  <div style="margin-top:20px;display:flex;align-items:center;gap:10px;border:1px solid {d['line']};border-radius:6px;background:{d['surf']};padding:10px 14px">
    {icon('search', d['text'] + '55', 15)}
    <div style="font:400 14px/1 system-ui,sans-serif;color:{d['text']}4d">Search creators and work</div>
  </div>
  <div style="margin-top:30px">{label('Creators', d)}</div>
  <div style="margin-top:14px;display:flex;align-items:center;gap:12px;border:1px solid {d['line']};border-radius:6px;background:{d['surf']}99;padding:12px">
    <div style="width:48px;height:48px;border-radius:50%;overflow:hidden;flex:0 0 auto">{art(3, d, radius='50%')}</div>
    <div style="display:flex;flex-direction:column;gap:2px">
      <div style="font:400 18px/1.1 Georgia,serif;color:{d['text']}">Dean</div>
      <div style="font:400 11px/1.3 system-ui,sans-serif;color:{d['text']}66">2 projects</div>
    </div>
  </div>
  <div style="margin-top:34px">{label('Work', d)}</div>
  <div style="margin-top:14px;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:14px">{cards}</div>
</div>'''


def profile(d):
    socials = [("li", True), ("x", False), ("ig", False), ("sp", False)]
    soc = "".join(
        f'''<div style="width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1px solid {d['accent'] + '66' if on else d['line']}">
        {icon(k, d['accent'] if on else d['text'] + '40', 15)}</div>'''
        for k, on in socials)

    pins = [("Bronze", "Bronze", "play", 21), ("Summer Flame", "Bronze", "play", 22),
            ("Autonomous: The Agentic Enterprise", "Atonomos", "book", 23)]
    pinrows = "".join(f'''<div style="display:flex;align-items:center;gap:12px;border:1px solid {d['line']};border-radius:6px;background:{d['surf']}66;padding:10px">
      <div style="width:48px;height:48px;flex:0 0 auto">{art(s, d)}</div>
      <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:2px">
        <div style="font:400 14px/1.25 'Abhaya Libre',Georgia,serif;color:{d['text']};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{t}</div>
        <div style="font:400 11px/1.3 system-ui,sans-serif;color:{d['text']}66">{sub}</div>
      </div>
      <div style="flex:0 0 auto;padding-right:4px">{icon(ic, d['accent'], 18)}</div>
    </div>''' for t, sub, ic, s in pins)

    projects = "".join(f'''<div style="position:relative;aspect-ratio:1/1;border-radius:6px;overflow:hidden;border:1px solid {d['line']}">
      {art(s, d)}
      <div style="position:absolute;inset:0;background:linear-gradient(to top, {d['bg']}e6 0%, {d['bg']}4d 45%, rgba(0,0,0,0) 100%)"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;padding:14px">
        <div style="font:400 19px/1.1 'Abhaya Libre',Georgia,serif;color:{d['text']}">{t}</div>
        <div style="font:400 11px/1.4 system-ui,sans-serif;color:{d['text']}80;margin-top:2px">{sub}</div>
      </div>
    </div>''' for t, sub, s in [("Bronze", "Music", 11), ("Atonomos", "Whitepaper", 12)])

    stubs = "".join(f'''<div style="display:flex;align-items:center;gap:12px;border:1px solid {d['line']};border-radius:6px;background:{d['surf']}66;padding:13px 16px">
      {icon(ic, d['accent'] + 'cc', 18)}
      <div style="font:400 16px/1 Georgia,serif;color:{d['text']}">{t}</div>
      <div style="margin-left:auto;border:1px solid {d['accent']}40;border-radius:999px;padding:3px 9px;font:400 9px/1 system-ui,sans-serif;letter-spacing:0.15em;text-transform:uppercase;color:{d['accent']}b3">Soon</div>
    </div>''' for t, ic in [("Merch", "cart"), ("Events", "ticket")])

    return f'''<div style="position:absolute;inset:0;overflow:hidden">
  <div style="position:absolute;inset:0">{art(3, d, radius='0')}</div>
  <div style="position:absolute;inset:0;background:linear-gradient(to bottom, {d['bg']}66 0%, {d['bg']}cc 38%, {d['bg']} 72%)"></div>
  <div style="position:absolute;inset:0;padding:40px 20px 0;display:flex;flex-direction:column">
    <div style="width:92px;height:92px;border-radius:50%;border:2px solid {d['bg']};overflow:hidden;position:relative;z-index:2;margin-left:2px">{art(3, d, radius='50%')}</div>
    <div style="margin-top:-14px;border:1px solid {d['line']};border-radius:6px;background:{d['surf']}d9;padding:30px 18px 16px">
      <div style="font:400 34px/1 Georgia,serif;letter-spacing:-0.01em;color:{d['text']}">Dean</div>
      <div style="margin-top:12px;font:400 14px/1.6 system-ui,sans-serif;color:{d['text']}80;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">Technology executive, venture investor, and strategic advisor with 15+ years leading enterprise transformation, AI innovation, and technology-enabled value creation across Fortune 500 enterprises.</div>
      <div style="margin-top:8px;font:400 10px/1 system-ui,sans-serif;letter-spacing:0.15em;text-transform:uppercase;color:{d['accent']}cc">More</div>
      <div style="margin-top:16px;padding-top:16px;border-top:1px solid {d['line']};display:flex;align-items:center;gap:10px">{soc}</div>
    </div>
    <div style="margin-top:26px">{label('Pinned', d)}</div>
    <div style="margin-top:14px;display:flex;flex-direction:column;gap:10px">{pinrows}</div>
    <div style="margin-top:28px">{label('Projects', d)}</div>
    <div style="margin-top:14px;display:grid;grid-template-columns:repeat(2, minmax(0, 1fr));gap:14px">{projects}</div>
    <div style="margin-top:22px;display:flex;flex-direction:column;gap:10px">{stubs}</div>
  </div>
</div>'''


def player(d):
    return f'''<div style="position:absolute;inset:0;background:{d['bg']};overflow:hidden">
  <div style="position:absolute;inset:0;opacity:0.5">{art(22, d, radius='0')}</div>
  <div style="position:absolute;inset:0;background:linear-gradient(to bottom, {d['bg']}b3 0%, {d['bg']}e6 45%, {d['bg']} 78%)"></div>
  <div style="position:absolute;inset:0;padding:44px 24px 34px;display:flex;flex-direction:column">
    <div style="display:flex;align-items:center;justify-content:space-between">
      {icon('chev', d['text'] + 'b3', 22)}
      <div style="font:400 10px/1 'Abhaya Libre',Georgia,serif;letter-spacing:0.22em;text-transform:uppercase;color:{d['text']}66">Bronze</div>
      {icon('queue', d['text'] + 'b3', 22)}
    </div>
    <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:22px 0">
      <div style="width:298px;height:298px;box-shadow:0 24px 60px rgba(0,0,0,0.7)">{art(22, d)}</div>
    </div>
    <div>
      <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px">
        <div style="min-width:0">
          <div style="font:400 28px/1.15 'Abhaya Libre',Georgia,serif;color:{d['text']}">Summer Flame</div>
          <div style="margin-top:4px;font:400 14px/1 system-ui,sans-serif;color:{d['text']}80">Dean</div>
        </div>
        <div style="flex:0 0 auto;font:400 11px/1 system-ui,sans-serif;color:{d['text']}59;padding-bottom:3px">6 / 14</div>
      </div>
      <div style="height:3px;border-radius:999px;background:{d['text']}26;position:relative">
        <div style="position:absolute;left:0;top:0;bottom:0;width:34%;border-radius:999px;background:{d['accent']}"></div>
      </div>
      <div style="margin-top:8px;display:flex;justify-content:space-between;font:400 11px/1 system-ui,sans-serif;color:{d['text']}59">
        <span>0:52</span><span>2:32</span>
      </div>
      <div style="margin-top:24px;display:flex;align-items:center;justify-content:center;gap:34px">
        {icon('prev', d['text'] + 'e6', 26)}
        <div style="width:72px;height:72px;border-radius:50%;background:{d['text']};display:flex;align-items:center;justify-content:center">{icon('pause', d['bg'], 26)}</div>
        {icon('next', d['text'] + 'e6', 26)}
      </div>
      <div style="margin-top:26px;display:flex;align-items:center;gap:12px">
        {icon('vol', d['text'] + '66', 16)}
        <div style="flex:1;height:3px;border-radius:999px;background:{d['text']}26;position:relative">
          <div style="position:absolute;left:0;top:0;bottom:0;width:78%;border-radius:999px;background:{d['text']}80"></div>
          <div style="position:absolute;left:78%;top:50%;transform:translate(-50%,-50%);width:11px;height:11px;border-radius:50%;background:{d['accent']}"></div>
        </div>
      </div>
    </div>
  </div>
</div>'''


TEMPLATE = '''<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Abhaya+Libre:wght@400;500;600&display=swap">
  <style>
    body {{ margin: 0; background: #08080a; }}
    a {{ color: {accent}; }} a:hover {{ color: {text}; }}
  </style>
</helmet>
<div style="width:1752px;padding:44px 48px 52px;box-sizing:border-box;background:#08080a;font-family:system-ui,sans-serif">
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:40px;margin-bottom:34px">
    <div style="max-width:900px">
      <div style="display:flex;align-items:baseline;gap:14px">
        <div style="font:400 13px/1 Georgia,serif;letter-spacing:0.3em;color:{text}59">OPTION {optlabel}</div>
        <div style="font:400 34px/1.1 Georgia,serif;color:{text}">{name}</div>
      </div>
      <div style="margin-top:12px;font:400 15px/1.6 system-ui,sans-serif;color:{text}99">{motive}</div>
      <div style="margin-top:8px;font:400 14px/1.6 system-ui,sans-serif;color:{text}66"><span style="color:{text}99">Tradeoff — </span>{tradeoff}</div>
    </div>
    <div style="display:flex;gap:10px;flex:0 0 auto">{swatches}</div>
  </div>
  <div style="display:flex;gap:32px">{phones}</div>
</div>
</x-dc>
<script data-dc-script data-props='{{}}'>
class Component extends DCLogic {{
  renderVals() {{ return {{}}; }}
}}
</script>
</body>
</html>
'''


def swatch(hex_, name, d):
    return (f'<div style="display:flex;flex-direction:column;align-items:center;gap:7px">'
            f'<div style="width:44px;height:44px;border-radius:6px;background:{hex_};border:1px solid {d["line"]}"></div>'
            f'<div style="font:400 9px/1 system-ui,sans-serif;letter-spacing:0.08em;text-transform:uppercase;color:{d["text"]}59">{name}</div>'
            f'</div>')


for d in DIRECTIONS:
    phones = "".join([
        phone(splash(d), d, "Splash"),
        phone(feed(d), d, "Feed  /"),
        phone(profile(d), d, "Creator  /@dean"),
        phone(player(d), d, "Player"),
    ])
    sw = "".join([
        swatch(d["bg"], "base", d), swatch(d["surf"], "surface", d),
        swatch(d["text"], "text", d), swatch(d["accent"], "accent", d),
    ])
    html = TEMPLATE.format(
        name=d["name"], optlabel=d["label"], motive=d["motive"], tradeoff=d["tradeoff"],
        text=d["text"], accent=d["accent"], phones=phones, swatches=sw,
    )
    (OUT / d["file"]).write_text(html)
    print(f"  {d['file']:24} {len(html)/1024:6.1f} KB  {d['name']}")

canvas = {
    "artboards": [
        {"file": "Main.dc.html", "x": 0, "y": 0, "w": 1752, "h": 1120, "title": "A — Strict Mono"},
        {"file": "CoolAsh.dc.html", "x": 1840, "y": 0, "w": 1752, "h": 1120, "title": "B — Cool Ash"},
        {"file": "MonoBronze.dc.html", "x": 0, "y": 1220, "w": 1752, "h": 1120, "title": "C — Mono + Bronze"},
        {"file": "BoneGraphite.dc.html", "x": 1840, "y": 1220, "w": 1752, "h": 1120, "title": "D — Bone & Graphite"},
    ],
    "annotations": [
        {"id": "axis", "x": 0, "y": -210, "w": 760,
         "text": "One question, four answers: how much colour survives.\n\nSame screens, same values lifted from the shipped app — only palette, starfield tint and accent stance change. Type stays Georgia + Abhaya Libre in all four so the comparison is about colour, not typefaces.\n\nThe starfields are CSS-drawable (positioned dots + two broad glows), not the holding page's stock video."},
        {"id": "bg-note", "x": 820, "y": -210, "w": 620,
         "text": "The domain's holding page is a GoDaddy builder template and its background is GoDaddy stock video — not reusable here. These starfields are ours: a few KB, animate in canvas/CSS, work offline, tint to any palette."},
    ],
    "launch": {"view": "canvas"},
}
(OUT / "canvas.json").write_text(json.dumps(canvas, indent=2))
print("  canvas.json")

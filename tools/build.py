"""
Builds every page of the site from content/*.md and the templates below.

  python3 tools/build.py

Copy lives in content/. Front matter is `key: value` lines between --- fences.
Case studies: `## Section` headings, blank lines split paragraphs, `1.` starts a
numbered list, `[compare before | after | caption]` makes a before/after slider.
Fun Zone and recommendations: one `## Title` per item with `key: value` fields.
Any `todo:` line is printed here and never shown on the page.
"""
import html, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'content')
E = html.escape

SITE = {
    'email': 'graybrendan15@gmail.com',
    'linkedin': 'https://www.linkedin.com/in/brendansgray/',
    'x': 'https://x.com/its_grayscale',
    'resume': '/assets/Brendan-Gray-Resume.pdf',
}
ARROW_OUT = '<svg class="ico" viewBox="0 0 12 12" aria-hidden="true"><path d="M3.5 8.5l5-5M4.5 3.5h4v4"/></svg>'
ARROW_R = '<svg class="ico" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 6h8M7 3l3 3-3 3"/></svg>'


# ---------- parsing ----------
def read_md(path):
    text = open(path, encoding='utf-8').read()
    m = re.match(r'---\n(.*?)\n---\n(.*)', text, re.S)
    meta, body = {}, text
    if m:
        for line in m.group(1).splitlines():
            if ':' in line:
                k, v = line.split(':', 1)
                meta[k.strip()] = v.strip()
        body = m.group(2)
    sections = []
    for chunk in re.split(r'^## ', body, flags=re.M)[1:]:
        title, _, rest = chunk.partition('\n')
        sections.append((title.strip(), rest.strip()))
    return meta, sections


def fields(block):
    """Leading `key: value` lines, then the rest as free text."""
    f, rest, done = {}, [], False
    for line in block.splitlines():
        m = re.match(r'([a-z]+): (.*)$', line)
        if m and not done:
            f[m.group(1)] = m.group(2).strip()
        else:
            if line.strip() or rest:
                done = True
                rest.append(line)
    f['_body'] = '\n'.join(rest).strip()
    return f


def inline(s):
    s = E(s, quote=False)
    s = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', s)
    s = re.sub(r'\[(.+?)\]\((https?://[^)]+)\)', r'<a href="\2" target="_blank" rel="noopener">\1</a>', s)
    return s.replace("'", '’')


def paras(text):
    return ''.join(f'<p>{inline(p.strip())}</p>' for p in re.split(r'\n\s*\n', text) if p.strip())


def blocks(text):
    out, para, items = [], [], []
    def flush():
        nonlocal para, items
        if para:
            out.append(f'<p>{inline(" ".join(para))}</p>'); para = []
        if items:
            out.append('<ol>' + ''.join(f'<li><span class="n num">{i + 1:02d}</span><span>{inline(t)}</span></li>' for i, t in enumerate(items)) + '</ol>'); items = []
    for line in text.splitlines() + ['']:
        line = line.strip()
        vm = re.match(r'\[video (.+)\]$', line)
        if vm:
            parts = [x.strip() for x in vm.group(1).split('|')]
            src, cap, size = parts[0], parts[1], (parts[2] if len(parts) > 2 else 'wide')
            poster = src.rsplit('.', 1)[0] + '.jpg'
            flush(); out.append(f'<figure class="clip {size}" data-reveal><div class="clip-frame"><video src="/assets/video/{src}" poster="/assets/video/{poster}" muted loop playsinline preload="metadata" aria-label="{E(cap)}"></video></div><figcaption>{E(cap)}</figcaption></figure>'); continue
        im = re.match(r'\[image (.+)\]$', line)
        if im:
            src, cap = [x.strip() for x in im.group(1).split('|')]
            flush(); out.append(f'<figure class="still" data-reveal><img src="/assets/img/{src}" alt="{E(cap)}" loading="lazy"><figcaption>{E(cap)}</figcaption></figure>'); continue
        cm = re.match(r'\[compare (.+)\]$', line)
        if cm:
            flush(); out.append(compare(*[x.strip() for x in cm.group(1).split('|')])); continue
        if not line:
            flush(); continue
        lm = re.match(r'\d+\. (.*)', line)
        if lm:
            if para: flush()
            items.append(lm.group(1)); continue
        if items: flush()
        para.append(line)
    return '\n'.join(out)


def compare(before, after, caption='', lb='Before', la='After'):
    cap = f'<figcaption>{E(caption)}<span class="hint"> · Drag to compare</span></figcaption>' if caption else ''
    return f'''<figure class="compare" data-reveal>
  <div class="frame" data-compare style="--pos:50%">
    <img src="/assets/img/{before}" alt="{E(caption or lb)}: {E(lb.lower())}" loading="lazy">
    <div class="after"><img src="/assets/img/{after}" alt="{E(caption or la)}: {E(la.lower())}" loading="lazy"></div>
    <span class="tag b">{E(lb)}</span><span class="tag a">{E(la)}</span>
    <span class="bar"></span><span class="knob" aria-hidden="true"><svg viewBox="0 0 16 16"><path d="M6 4L2 8l4 4M10 4l4 4-4 4"/></svg></span>
  </div>{cap}
</figure>'''


# ---------- chrome ----------
NAV = [('/work.html', 'Work'), ('/fun-zone.html', 'Fun Zone'), ('/about.html', 'About')]


def page(title, desc, body, active='', scripts='', head_extra=''):
    cur = ' aria-current="page"'
    links = ''.join(f'<a href="{h}"{cur if active == h else ""}>{t}</a>' for h, t in NAV)
    brand_cur = cur if active == '/' else ''
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(desc)}">
<meta name="theme-color" content="#ffffff">
<link rel="icon" href="/assets/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400..800&family=Instrument+Sans:wght@400..600&display=swap">
<link rel="stylesheet" href="/css/site.css">
<script>document.documentElement.classList.add('js')</script>{head_extra}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<nav class="nav" aria-label="Main">
  <a href="/"{brand_cur}>Home</a>
  {links}
  <span class="nav-dot" aria-hidden="true"></span>
</nav>
<main id="main">
{body}
</main>
<div class="page"><footer class="footer">
  <span>Brendan Gray, product designer in Salt Lake City</span>
  <nav aria-label="Elsewhere"><a href="mailto:{SITE['email']}">Email</a><a href="{SITE['linkedin']}" target="_blank" rel="noopener">LinkedIn</a><a href="{SITE['x']}" target="_blank" rel="noopener">X</a><a href="{SITE['resume']}" target="_blank" rel="noopener">Resume</a></nav>
</footer></div>
<script type="importmap">{{ "imports": {{ "three": "https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js" }} }}</script>
<script type="module" src="/js/site.js"></script>
{scripts}
</body>
</html>
'''


def write(rel, text):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'w', encoding='utf-8').write(text)
    print('wrote', rel)


def initials(name):
    return ''.join(w[0] for w in name.split()[:2]).upper()


# ---------- load ----------
projects = []
for f in sorted(os.listdir(CONTENT)):
    if f.endswith('.md') and f not in ('fun-zone.md', 'recommendations.md'):
        meta, sections = read_md(os.path.join(CONTENT, f))
        meta['slug'], meta['sections'] = f[:-3], sections
        projects.append(meta)
        if meta.get('todo'):
            print(f'  TODO {f}: {meta["todo"]}')
projects.sort(key=lambda p: int(p.get('order', 99)))
_, rec_sections = read_md(os.path.join(CONTENT, 'recommendations.md'))
recs = [(name, fields(b)) for name, b in rec_sections]


# ---------- recommendations (home) ----------
def rec_card(i, name, f):
    return f'''<article class="rec" data-reveal style="--i:{i % 2}">
    <blockquote class="pull"><p>&ldquo;{inline(f['pull'])}&rdquo;</p></blockquote>
    <p class="who"><strong>{E(name)}</strong><span>{E(f['title'])} @ {E(f['company'])}</span></p>
    <div class="more" id="rec-{i}"><div class="inner">{paras(f['_body'])}</div></div>
    <button class="toggle" type="button" aria-expanded="false" aria-controls="rec-{i}"><svg viewBox="0 0 12 12" aria-hidden="true"><path class="h" d="M2.5 6h7"/><path class="v" d="M6 2.5v7"/></svg><span class="lbl">Read the full recommendation</span></button>
  </article>'''


recs_html = f'''
  <section class="recs" aria-labelledby="recs-title">
    <header class="section-head"><h2 id="recs-title" data-reveal>What people say</h2></header>
    <div class="rec-grid"><div class="rec-col">{''.join(rec_card(i, n, f) for i, (n, f) in enumerate(recs) if i % 2 == 0)}</div><div class="rec-col">{''.join(rec_card(i, n, f) for i, (n, f) in enumerate(recs) if i % 2 == 1)}</div></div>
  </section>'''


# ---------- project cards ----------
def card_sheet(p):
    """The real UI behind a project's illustration: its case study video, or a still (card_media)."""
    m = p.get('card_media') or p.get('hero_video')
    if not m:
        return ''
    if m.endswith('.mp4'):
        poster = m.rsplit('.', 1)[0] + '.jpg'
        return f'<div class="sheet" aria-hidden="true"><video data-src="/assets/video/{m}" poster="/assets/video/{poster}" muted loop playsinline preload="none"></video></div>'
    return f'<div class="sheet" aria-hidden="true"><img src="/assets/img/{m}" alt="" loading="lazy" decoding="async"></div>'


def no_orphan(text):
    """Join the last two words with a non-breaking space, so a caption never ends on one word alone."""
    head, sep, last = text.rpartition(' ')
    return f'{head}&nbsp;{last}' if sep and '<' not in last else text


def card_text(p, tag, title=True, company=True):
    head = f'<{tag}>{E(p["title"])} <span class="arr" aria-hidden="true">{ARROW_R}</span></{tag}>' if title else ''
    co = f', {E(p["company"])}' if company else ''
    return f'''<div class="txt">
      {head}
      <p class="cap">{no_orphan(inline(p['caption']))}</p>
      <p class="role"><span>Role</span> {E(p['role'].split(',')[0])}{co}</p>
    </div>'''


def project_card(p, i, tag='h2'):
    """Work page tile. The illustration plays once when it scrolls into view; hover or focus (or, on
    touch, the end of the story) crossfades to the real UI. See js/project-cards.js."""
    return f'''<a class="pcard pcard--tile" href="/work/{p['slug']}.html" data-card data-autoplay data-pcard data-reveal style="--i:{i}">
    <div class="ill">{card_sheet(p)}<div class="face"><canvas data-illustration="{p['illustration']}" aria-hidden="true"></canvas></div></div>
    {card_text(p, tag)}
  </a>'''


LOGOS = {'BambooHR': 'bamboohr.svg', 'Graphite Connect': 'graphite-connect.svg'}   # assets/img/logos, drawn as a mask in --ink-2


def folder_card(p, i):
    """Home: a folder of real screenshots. The first one stands up out of the folder; hover (or, on
    touch, scrolling it into view) fans the others out. The front pocket holds the title and never moves.
    The company is the logo on the tab only (and the hidden heading, for screen readers)."""
    shots = [s.strip() for s in p['folder'].split('|')]
    lead, rest = shots[0], shots[1:]
    papers = ''.join(f'<span class="paper paper--{k + 1}"><img src="/assets/{E(s)}" alt="" loading="lazy" decoding="async"></span>' for k, s in reversed(list(enumerate(rest))))
    papers += f'<span class="paper paper--lead"><img src="/assets/{E(lead)}" alt="" loading="lazy" decoding="async"></span>'
    return f'''<a class="fcard" href="/work/{p['slug']}.html" data-folder data-reveal style="--i:{i}">
    <div class="folder" aria-hidden="true">
      <span class="back"></span>{f'<span class="tab-logo" style="--logo:url(/assets/img/logos/{LOGOS[p["company"]]})"></span>' if p['company'] in LOGOS else ''}
      {papers}
      <span class="front"><span class="front-title">{E(p['title'])}</span></span>
    </div>
    <h3 class="sr-only">{E(p['title'])}, {E(p['company'])}</h3>
    {card_text(p, 'h3', title=False, company=False)}
  </a>'''


featured = sorted((p for p in projects if p.get('featured')), key=lambda p: int(p['featured']))
featured_html = f'''
  <section class="featured" aria-labelledby="featured-title">
    <header class="section-head featured-head"><h2 id="featured-title" data-reveal>Selected work</h2>
      <a class="cta" href="/work.html" data-reveal>See all {len(projects)} projects {ARROW_R}</a></header>
    <div class="featured-grid">{''.join(folder_card(p, i) for i, p in enumerate(featured))}</div>
  </section>'''


# the intro decides before first paint whether to hold the hero (see js/intro.js); same rules, kept tiny.
# It plays when you land on Home from outside the site or reload it, not when you click to Home from another page.
INTRO_HOLD = """<script>(function(){try{var q=location.search,f=/[?&]intro(-lab)?(=|&|$)/.test(q),n=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{},t=n.type,r=document.referrer,inside=false;try{inside=!!r&&new URL(r).origin===location.origin}catch(e){}var fresh=t==='reload'||(t!=='back_forward'&&!inside);if(f||(fresh&&innerWidth>=700&&!matchMedia('(prefers-reduced-motion: reduce)').matches)){document.documentElement.classList.add('intro-hold');history.scrollRestoration='manual';scrollTo(0,0)}}catch(e){}})()</script>"""

# ---------- home ----------
home = f'''
<div class="page">
  <section class="hero">
    <div class="hero-left">
      <div class="hero-title">
        <h1 data-reveal style="--i:0">Brendan<br>Gray</h1>
        <p class="role" data-reveal style="--i:1"><span class="tp" data-tp="builder">Product builder</span></p>
      </div>
      <div class="intro">
        <p data-reveal>I&rsquo;m a <span class="tp" data-tp="designer">product designer</span> who started in <span class="tp" data-tp="graphic">graphic design</span>. Since then I&rsquo;ve taken on <span class="tp" data-tp="pm">product management</span> work, designed B2B software for almost five years, and started prototyping nearly everything in <span class="tp" data-tp="code">code</span>.</p>
        <p data-reveal>I work on complex software with strict requirements, helping them <span class="tp" data-tp="grow">grow</span> and <span class="tp" data-tp="scale">scale</span>: procurement, HR, billing, contracts. My goal is a solution that feels <span class="tp" data-tp="obvious">obvious</span> to the person using it.</p>
        <p data-reveal><span class="tp" data-tp="ai">AI</span> has changed how I work more than anything else in my career. I use it to test ideas in real code within days, and it helps me <span class="tp" data-tp="learn">learn</span> and <span class="tp" data-tp="explore">explore</span> in ways I never could before.</p>
      </div>
    </div>
    <aside class="hero-head" aria-label="Brendan as a point cloud. Move your cursor across the face to scramble it and move him to the next stage of a design project.">
      <section id="view"><div id="loading">Assembling</div>
        <div id="sel"><div class="tag"><span id="sel-name"></span></div><div class="xyz" id="sel-xyz"></div></div>
      </section>
      <div id="mood" aria-live="polite"><div class="pill"><div class="fill"></div>
        <div class="txt dark"><span class="eyebrow">Kickoff:</span><span class="word">Excited</span></div>
        <div class="txt light" aria-hidden="true"><span class="eyebrow"></span><span class="word"></span></div>
      </div></div>
      <div id="dials" hidden></div><div id="stage" hidden></div>
    </aside>
  </section>
  {featured_html}
</div>'''
write('index.html', page('Brendan Gray, product builder', 'Brendan Gray is a product designer who builds: B2B product design, research, and prototypes in code.', home, active='/',
                         scripts='<script type="module" src="/js/intro.js"></script><script type="module" src="/js/head.js"></script><script type="module" src="/js/card-dials.js"></script><script type="module" src="/js/hero-dials.js"></script><script type="module" src="/js/intro-lab.js"></script><script type="module" src="/js/type-play.js"></script><script type="module" src="/js/type-lab.js"></script>',
                         head_extra=INTRO_HOLD))


MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']


def timeline_html(p):
    """Project timeline: thin bars on a month grid, label above each bar. Key projects in accent."""
    r0, r1 = [x.strip() for x in p['projects_range'].split('|')]
    ym = lambda v: (int(v[:4]), int(v[5:7]))
    y0, m0 = ym(r0); y1, m1 = ym(r1)
    span = (y1 - y0) * 12 + (m1 - m0) + 1
    idx = lambda y, m: (y - y0) * 12 + (m - m0)
    short = lambda y, m: f"{MONTHS[m - 1]} &rsquo;{str(y)[2:]}"
    longd = lambda y, m: f"{MONTHS_LONG[m - 1]} {y}"
    items, lanes = [], 0
    for k, raw in enumerate(p['projects'].split(';')):
        parts = [x.strip() for x in raw.split('|')]
        name, a, b, lane = parts[0], parts[1], parts[2], int(parts[3])
        key = len(parts) > 4 and parts[4] == 'key'
        lanes = max(lanes, lane)
        sy, sm = ym(a)
        if b == 'now':
            ei, when, spoken = span, f"{short(sy, sm)} onward", f"{longd(sy, sm)} onward"
        else:
            ey, em = ym(b); ei = idx(ey, em) + 1
            when = short(sy, sm) + ('' if (sy, sm) == (ey, em) else f" &ndash; {short(ey, em)}")
            spoken = f"{longd(sy, sm)} to {longd(ey, em)}"
        si = idx(sy, sm)
        items.append(f'''<li class="tl-item{' key' if key else ''}" style="--s:{si / span:.4f};--e:{ei / span:.4f};--lane:{lane};--i:{k}">
          <span class="tl-text"><span class="tl-name">{E(name)}</span><span class="tl-when num" aria-hidden="true">{when}</span><span class="sr">, {spoken}</span></span>
          <span class="tl-bar" aria-hidden="true"></span>
        </li>''')
    ticks = []
    for i in range(0, span + 1, 6):
        y, m = y0 + (m0 - 1 + i) // 12, (m0 - 1 + i) % 12 + 1
        label = str(y) if m == 1 else MONTHS[m - 1]
        ticks.append(f'<span class="tl-tick{" year" if m == 1 else ""}" style="--x:{i / span:.4f}">{label}</span>')
    return f'''<figure class="timeline" data-reveal data-timeline aria-label="{E(p['hero_alt'])}">
      <ol class="tl-lanes" style="--lanes:{lanes}">{''.join(items)}</ol>
      <div class="tl-axis num" aria-hidden="true">{''.join(ticks)}</div>
      <figcaption><span class="tl-key-swatch" aria-hidden="true"></span>The three projects I cover below</figcaption>
    </figure>'''


def hero_media(p):
    alt = E(p['hero_alt'])
    if p.get('projects'):
        return timeline_html(p)
    if p.get('hero_video'):
        v = p['hero_video']; poster = v.rsplit('.', 1)[0] + '.jpg'
        return f'<figure class="shot settle clip-hero" data-reveal><video src="/assets/video/{v}" poster="/assets/video/{poster}" muted loop playsinline preload="auto" aria-label="{alt}"></video></figure>'
    img = p['hero']
    return f'<figure class="shot settle" data-reveal><img src="/assets/img/{img}" alt="{alt}" fetchpriority="high"></figure>'


# ---------- work ----------
work = f'''
<div class="page">
  <header class="page-head">
    <h1 data-reveal>Selected work</h1>
    <p data-reveal style="--i:1">Five B2B projects: two shipped, two that didn&rsquo;t, and one study.</p>
  </header>
  <section class="work-grid">{''.join(project_card(p, i % 2) for i, p in enumerate(projects))}
  </section>
</div>'''
write('work.html', page('Work, Brendan Gray', 'Selected B2B product design work: contract sign-up, supplier experience, research, checkout and an AI trial.', work, active='/work.html'))


# ---------- case studies ----------
for i, p in enumerate(projects):
    prev_p, next_p = projects[i - 1], projects[(i + 1) % len(projects)]
    proto_top = proto_end = ''
    if p.get('prototype'):
        label = p.get('prototype_label', 'Try the prototype')
        btn = f'<a class="btn" href="{E(p["prototype"])}" target="_blank" rel="noopener">{E(label)} {ARROW_OUT}</a>'
        proto_top = f'<div class="cs-actions" data-reveal style="--i:2">{btn}</div>'
        proto_end = f'''<section class="cs-end" data-reveal><p>See it for yourself. The prototype I built and tested is still live.</p>{btn}</section>'''
    secs = ''.join(f'''
    <section class="cs-section" id="{t.lower()}">
      <h2 class="label">{E(t)}</h2>
      <div class="text" data-reveal>{blocks(b)}</div>
    </section>''' for k, (t, b) in enumerate(p['sections']))
    body = f'''
<div class="page">
  <header class="cs-head">
    <div class="cs-title">
      <h1 data-reveal>{E(p['title'])}</h1>
      <p class="hook" data-reveal style="--i:1">{inline(p['hook'])}</p>
      {proto_top}
    </div>
    <div class="cs-ill" data-card data-autoplay data-reveal style="--i:2"><canvas data-illustration="{p['illustration']}" aria-hidden="true"></canvas></div>
    <dl class="meta" data-reveal style="--i:3">
      <div><dt>Company</dt><dd>{E(p['company'])}</dd></div>
      <div><dt>Role</dt><dd>{E(p['role'])}</dd></div>
      <div><dt>Team</dt><dd>{E(p['team'])}</dd></div>
      <div><dt>Timeline</dt><dd class="num">{E(p['timeline'])}</dd></div>
      <div><dt>Status</dt><dd>{E(p['status'])}</dd></div>
    </dl>
  </header>
  {hero_media(p)}
  <article class="cs-body">{secs}
  </article>
  {proto_end}
  <nav class="next" aria-label="More projects">
    <a href="/work/{prev_p['slug']}.html" data-card><div class="mini"><canvas data-illustration="{prev_p['illustration']}" aria-hidden="true"></canvas></div><div><span class="dir">Previous</span><h3>{E(prev_p['title'])}</h3></div></a>
    <a class="fwd" href="/work/{next_p['slug']}.html" data-card><div><span class="dir">Next</span><h3>{E(next_p['title'])}</h3></div><div class="mini"><canvas data-illustration="{next_p['illustration']}" aria-hidden="true"></canvas></div></a>
  </nav>
</div>'''
    write(f"work/{p['slug']}.html", page(f"{p['title']}, Brendan Gray", p['hook'], body, active='/work.html'))


# ---------- fun zone ----------
fz_meta, fz_sections = read_md(os.path.join(CONTENT, 'fun-zone.md'))
items = []
for k, (title, block) in enumerate(fz_sections):
    f = fields(block)
    if 'video' in f:
        media = f'''<div class="media video tilt"><video src="/assets/video/{f['video']}" muted loop playsinline preload="metadata" aria-label="{E(title)}"></video><button class="sound" type="button" aria-pressed="false">Sound on</button></div>'''
    elif 'compare' in f:
        b, a, lb, la = [x.strip() for x in f['compare'].split('|')]
        media = f'<div class="media">{compare(b, a, "", lb, la)}</div>'
    elif 'carousel' in f:
        slides = []
        for j, sl in enumerate(f['carousel'].split(';')):
            b, a, cap = [x.strip() for x in sl.split('|')]
            subj = cap.split(',')[0].lower()
            slides.append(f'''<li class="slide" aria-roledescription="slide" aria-label="{j + 1} of {{n}}"><div class="duo">
          <figure><div class="shot-box"><img src="/assets/img/{b}" alt="The original {E(subj)}" loading="lazy"></div><figcaption>The original</figcaption></figure>
          <figure><div class="shot-box"><img src="/assets/img/{a}" alt="My rebuild of the {E(subj)}" loading="lazy"></div><figcaption>My rebuild</figcaption></figure>
        </div><p class="cap">{E(cap)}</p></li>''')
        n = len(slides)
        media = f'''<div class="media carousel" aria-roledescription="carousel" aria-label="Taste exercises">
      <ul class="track" tabindex="0">{''.join(x.replace('{n}', str(n)) for x in slides)}</ul>
      <div class="controls"><button class="prev" type="button" aria-label="Previous exercise"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M7.5 2.5L4 6l3.5 3.5"/></svg></button><span class="count" aria-live="polite"><span class="i">1</span> of {n}</span><button class="next-btn" type="button" aria-label="Next exercise"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6l-3.5 3.5"/></svg></button></div>
    </div>'''
    elif 'pair' in f:
        b, a, lb, la = [x.strip() for x in f['pair'].split('|')]
        media = f'''<div class="media pair"><figure class="tilt"><img src="/assets/img/{b}" alt="{E(lb)}: the integrations panel" loading="lazy"><figcaption>{E(lb)}</figcaption></figure><figure class="tilt"><img src="/assets/img/{a}" alt="{E(la)}: the integrations panel" loading="lazy"><figcaption>{E(la)}</figcaption></figure></div>'''
    elif 'clip' in f:
        v = f['clip']; poster = v.rsplit('.', 1)[0] + '.jpg'; link = E(f['link'])
        media = f'''<a class="media tilt" href="{link}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true"><video class="loop" src="/assets/video/{v}" poster="/assets/video/{poster}" muted loop playsinline preload="metadata"></video></a>'''
    else:
        media = f'''<a class="media tilt" href="{E(f['link'])}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true"><img src="/assets/img/{f['image']}" alt="" loading="lazy"></a>'''
    if f.get('link'):
        action = f'<a class="open" href="{E(f["link"])}" target="_blank" rel="noopener">Open the site {ARROW_OUT}</a>'
    elif f.get('soon'):
        action = f'<span class="soon">{E(f["soon"])}</span>'
    else:
        action = ''
    items.append(f'''
  <article class="fun" data-reveal>
    {media}
    <div class="info">
      <p class="tag">{E(f.get('tag', ''))}</p>
      <h2>{E(title)}</h2>
      <p class="what">{inline(f['what'])}</p>
      <p class="why">{inline(f['more'])}</p>
      {action}
    </div>
  </article>''')
fun = f'''
<div class="page">
  <header class="page-head">
    <h1 data-reveal>Fun Zone</h1>
    <p data-reveal style="--i:1">{inline(fz_meta.get('intro', ''))}</p>
  </header>
  <section class="fun-list">{''.join(items)}
  </section>
</div>'''
write('fun-zone.html', page('Fun Zone, Brendan Gray', fz_meta.get('intro', ''), fun, active='/fun-zone.html'))


# ---------- about ----------
XP = [
    ('Freelance Product Designer', '', 'Oct 2026 – now'),
    ('Product Designer', 'BambooHR', 'Oct 2025 – Sep 2026'),
    ('Designer', 'Graphite Connect', 'Feb 2023 – Oct 2025'),
    ('Design Intern', 'Graphite Connect', 'May 2022 – Feb 2023'),
    ('User Experience Assistant', 'Marriott Library, University of Utah', 'Sep 2021 – May 2022'),
]
SKILLS = ['User interviews', 'Usability testing', 'Research synthesis', 'B2B workflows', 'Interaction design', 'Accessibility, WCAG 2.2',
          'Prototyping in code', 'Claude Code', 'Figma', 'Design systems', 'Rive', 'Pendo', 'Requirements and prioritization']
HOW = [
    ('research', 'I find out what the problem is before I design for it.',
     'At BambooHR I started a 12-interview study on my own, and it changed the direction of the trial.', '/work/hris-buying-study.html', 'See the study'),
    ('build', 'I prototype in code, so the team tests the real thing.',
     'Since early 2026 I&rsquo;ve built nearly every prototype with Claude Code, including the trial and its agent.', '/work/trial-experience.html', 'See the trial'),
    ('evidence', 'I test ideas with users before I commit to them.',
     'I built and tested an AI chat checkout. People didn&rsquo;t trust it, so I recommended a familiar stepped checkout instead.', '/work/checkout.html', 'See the checkout'),
]
how = ''.join(f'''<a class="how-card" href="{h}" data-card data-reveal style="--i:{i}">
      <canvas data-glyph="{g}" aria-hidden="true"></canvas>
      <p class="claim">{c}</p><p class="proof">{pr}</p><span class="go">{l} {ARROW_R}</span>
    </a>''' for i, (g, c, pr, h, l) in enumerate(HOW))
xp = ''.join(f'<div><dt>{E(r)}</dt>' + (f'<dd>{E(c)}</dd>' if c else '') + f'<dd class="when num">{E(w)}</dd></div>' for r, c, w in XP)
about = f'''
<div class="page">
  <section class="about">
    <figure class="photo" data-reveal><img src="/assets/img/brendan.webp" alt="Brendan Gray, arms crossed, smiling" width="1000" height="1500"></figure>
    <div class="copy">
      <h1 data-reveal>Hey, I&rsquo;m Brendan.</h1>
      <p class="lede" data-reveal style="--i:1">I&rsquo;m a product designer in Salt Lake City. I started in graphic design, moved into B2B product work, and now I prototype nearly everything in code.</p>
      <div class="story" data-reveal>
        <p>My BFA is in graphic design from the University of Utah, with a minor in strategic communications. My first UX job was at the university library, where I ran user tests on its web pages.</p>
        <p>At Graphite Connect I designed a network procurement platform, helping the small startup rapidly grow in employee and user count. At BambooHR I worked on a few teams in the Growth portfolio, focusing on transactions, new acquisitions and checkouts.</p>
        <p>I&rsquo;m currently working as a freelance designer, helping Graphite Connect with its workflow editors. I&rsquo;m looking for my next product design role.</p>
      </div>
      <a class="btn" href="{SITE['resume']}" download="Brendan-Gray-Resume.pdf" data-reveal>Download resume <svg class="ico" viewBox="0 0 12 12" aria-hidden="true"><path d="M6 2v6M3.5 5.5L6 8l2.5-2.5M2.5 10h7"/></svg></a>
    </div>
  </section>
  {recs_html}
  <section class="facts">
    <div data-reveal><h2 class="section-title">Experience</h2><dl class="xp">{xp}</dl></div>
    <div data-reveal style="--i:1"><h2 class="section-title">Skills</h2><ul class="chips">{''.join(f'<li>{E(s)}</li>' for s in SKILLS)}</ul>
      <h2 class="section-title sub">Outside work</h2><p class="muted">When I&rsquo;m not designing, you can find me on my motorcycle, in the kitchen, or investing and trading.</p></div>
  </section>
  <section class="contact" data-reveal>
    <h2 class="section-title">Say hello</h2>
    <p class="muted">The fastest way to reach me is email.</p>
    <div class="contact-row">
      <button class="copy-btn" type="button" data-copy="{SITE['email']}"><svg class="ico" viewBox="0 0 12 12" aria-hidden="true"><rect x="3.5" y="3.5" width="6" height="6" rx="1.2"/><path d="M2.5 7.5v-4a1 1 0 0 1 1-1h4"/></svg><span class="label">{SITE['email']}</span><span class="ok">Copied</span></button>
      <a class="pill-link" href="{SITE['linkedin']}" target="_blank" rel="noopener"><svg class="ico-l" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>LinkedIn</a>
      <a class="pill-link" href="{SITE['x']}" target="_blank" rel="noopener"><svg class="ico-l" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z"/></svg>@its_grayscale</a>
    </div>
  </section>
</div>'''
write('about.html', page('About, Brendan Gray', 'Brendan Gray, product designer in Salt Lake City. Background, how I work, experience and contact.', about, active='/about.html',
                         scripts='<script type="module" src="/js/rec-dials.js"></script>'))

"""UI/UX 기능설명서 HTML 생성기 — 사용법은 README.md.

입력: 메뉴 트리 실측(menu_export.ts 를 실행해 임시 JSON 으로 받는다), screens_data.py(화면별 기능 원고),
      common_sections.py(공통 절 HTML), template.html(페이지 골격).
출력: argv[1] 경로(없으면 docs/UIUX_기능설명서.html)의 단일 HTML.
메뉴의 모든 구현 리프가 원고에 있어야 하고, 원고에 메뉴/라우트에 없는 route 가 있으면 실패한다.
"""
import datetime
import html
import json
import os
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True   # 저장소에 __pycache__ 를 남기지 않는다(.gitignore 미등록)
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from screens_data import SCREENS, EXTRA_GROUPS  # noqa: E402
from common_sections import COMMON_HTML, DASHBOARD_HTML, LIMITS_HTML  # noqa: E402


def load_menu():
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "menu.json")
        subprocess.run(["npx", "vite-node", os.path.join(HERE, "menu_export.ts"), out], cwd=REPO, check=True)
        with open(out, encoding="utf-8") as f:
            return json.load(f)


def default_basis():
    """문서 상단 기준 표시. 기본 = origin/main 커밋 — 브랜치의 미머지 소스를 문서화할 땐 DOC_BASIS 로 덮어쓴다."""
    sha = subprocess.run(["git", "rev-parse", "--short", "origin/main"], cwd=REPO, check=True,
                         capture_output=True, text=True).stdout.strip()
    return f"기준 main {sha} · {datetime.date.today().isoformat()}"


BASIS = os.environ.get("DOC_BASIS") or default_basis()
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(REPO, "docs", "UIUX_기능설명서.html")
menu = load_menu()
tree = [t for t in menu["tree"] if t["mids"]]
typed = set(menu["typed"])
schema_routes = set(menu["schemaRoutes"])

E = html.escape
TYPE_LABEL = {"typed": "전용", "schema": "스키마", "default": "미구현", "app": "메뉴 밖", "auth": "독립 화면"}

errors = []
leaf_routes = [l["path"] for t in tree for m in t["mids"] for l in m["leaves"]]
known_routes = set(leaf_routes) | typed | schema_routes | {"main"}
for r in SCREENS:
    if r not in known_routes:
        errors.append(f"원고에만 있는 route: {r}")
for t in tree:
    for m in t["mids"]:
        for l in m["leaves"]:
            if l["type"] != "default" and l["path"] not in SCREENS:
                errors.append(f"원고 누락: {t['label']} > {m['label']} > {l['label']} ({l['path']})")
for g in EXTRA_GROUPS:
    for r in g["routes"]:
        if r not in SCREENS:
            errors.append(f"메뉴 밖 원고 누락: {r}")
if errors:
    print("\n".join(errors), file=sys.stderr)
    sys.exit(1)


def li(items):
    return "".join(f"<li>{x}</li>" for x in items)


def screen_card(route, label, typ, crumb):
    s = SCREENS.get(route, {})
    sid = s.get("sid", "")
    meta = [f"<code>#/{E(route)}</code>"]
    if sid:
        meta.append(E(sid))
    if s.get("file"):
        meta.append(f'<span class="src">{E(s["file"])}</span>')
    body = []
    if s.get("summary"):
        body.append(f'<p class="sum">{s["summary"]}</p>')
    if s.get("layout"):
        body.append(f'<p class="lay"><b>구성</b> {s["layout"]}</p>')
    if s.get("features"):
        body.append(f'<ul class="feat">{li(s["features"])}</ul>')
    if s.get("popups"):
        body.append(f'<div class="pop"><b>팝업</b><ul>{li(s["popups"])}</ul></div>')
    if s.get("note"):
        body.append(f'<p class="nt">{s["note"]}</p>')
    search = " ".join([label, route, sid, crumb, s.get("summary", ""), " ".join(s.get("features", []))])
    search = E(" ".join(search.split()).lower(), quote=True)
    return (
        f'<article class="scr" id="s-{E(route)}" data-q="{search}">'
        f'<header><h4>{E(label)}</h4><span class="tag t-{typ}">{TYPE_LABEL[typ]}</span></header>'
        f'<div class="meta">{" · ".join(meta)}</div>{"".join(body)}</article>'
    )


def default_list(leaves):
    names = "".join(f"<li>{E(l['label'])} <code>#/{E(l['path'])}</code></li>" for l in leaves)
    q = E(" ".join(l["label"] + " " + l["path"] for l in leaves).lower(), quote=True)
    return (
        f'<article class="scr scr-default" data-q="{q} 미구현">'
        f'<header><h4>미구현 화면 {len(leaves)}개</h4><span class="tag t-default">미구현</span></header>'
        '<p class="sum">메뉴만 있고 화면 정의가 없다. 열면 기본 예시 표(항목명·금액·변동률·상태·추이, 합성 23행)가 '
        '공통 리스트 기능과 함께 보인다. 이 행은 실데이터가 아니다 — <a href="#limits">미구현·데모 한계</a> 참조.</p>'
        f'<ul class="dlist">{names}</ul></article>'
    )


sections = []
toc = []
counts = {"typed": 0, "schema": 0, "default": 0}
for t in tree:
    tid = "m-" + t["id"]
    toc.append(f'<a href="#{tid}">{E(t["label"])}</a>')
    n_leaf = sum(len(m["leaves"]) for m in t["mids"])
    mids_html = []
    for m in t["mids"]:
        cards, defaults = [], []
        for l in m["leaves"]:
            counts[l["type"]] += 1
            if l["type"] == "default":
                defaults.append(l)
            else:
                cards.append(screen_card(l["path"], l["label"], l["type"], f"{t['label']} {m['label']}"))
        if defaults:
            cards.append(default_list(defaults))
        mids_html.append(
            f'<section class="mid"><h3>{E(m["label"])} <small>{len(m["leaves"])}</small></h3>'
            f'<div class="cards">{"".join(cards)}</div></section>'
        )
    sections.append(
        f'<section class="top" id="{tid}"><h2>{E(t["label"])} <small>중분류 {len(t["mids"])} · 화면 {n_leaf}</small></h2>'
        f'{"".join(mids_html)}</section>'
    )

extra_html = []
for g in EXTRA_GROUPS:
    cards = "".join(screen_card(r, SCREENS[r]["label"], g["type"], g["title"]) for r in g["routes"])
    extra_html.append(f'<section class="mid"><h3>{E(g["title"])} <small>{len(g["routes"])}</small></h3>'
                      f'<p class="lead">{g["lead"]}</p><div class="cards">{cards}</div></section>')

n_mid = sum(len(t["mids"]) for t in tree)
n_leaf = sum(counts.values())
n_extra = sum(len(g["routes"]) for g in EXTRA_GROUPS)
stats = (
    '<div class="kpis">'
    f'<div><b>{len(tree)}</b><span>대분류 (+대시보드)</span></div>'
    f'<div><b>{n_mid}</b><span>중분류</span></div>'
    f'<div><b>{n_leaf}</b><span>메뉴 화면</span></div>'
    f'<div><b>{counts["typed"]}</b><span>전용 화면</span></div>'
    f'<div><b>{counts["schema"]}</b><span>스키마 화면</span></div>'
    f'<div><b>{counts["default"]}</b><span>미구현</span></div>'
    f'<div><b>{n_extra}</b><span>메뉴 밖 화면</span></div>'
    '</div>'
)

tpl = open(os.path.join(HERE, "template.html"), encoding="utf-8").read()
out = (tpl
       .replace("{{BASIS}}", BASIS)
       .replace("{{STATS}}", stats)
       .replace("{{TOC_MENU}}", "".join(toc))
       .replace("{{COMMON}}", COMMON_HTML)
       .replace("{{DASHBOARD}}", DASHBOARD_HTML)
       .replace("{{MENU_SECTIONS}}", "".join(sections))
       .replace("{{EXTRA}}", "".join(extra_html))
       .replace("{{LIMITS}}", LIMITS_HTML)
       .replace("{{N_TYPED}}", str(counts["typed"]))
       .replace("{{N_SCHEMA}}", str(counts["schema"]))
       .replace("{{N_DEFAULT}}", str(counts["default"]))
       .replace("{{N_LEAF}}", str(n_leaf)))
assert "{{" not in out, "치환 안 된 자리표시자"
with open(OUT, "w", encoding="utf-8") as f:
    f.write(out)
shown = os.path.relpath(OUT, REPO) if os.path.abspath(OUT).startswith(REPO + os.sep) else OUT
print(f"ok: {shown} · 메뉴 화면 {n_leaf} (전용 {counts['typed']} · 스키마 {counts['schema']} · 미구현 {counts['default']}) · 메뉴 밖 {n_extra} · {os.path.getsize(OUT)//1024}KB")

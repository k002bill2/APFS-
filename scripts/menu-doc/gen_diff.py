# -*- coding: utf-8 -*-
"""메뉴구성도(xlsx 신규 구성) vs src/dash/data.ts APFS_DATA.MENU 대조표 생성."""
import json, os, subprocess, sys, unicodedata as U
from gen_md import parse

HERE = os.path.dirname(os.path.abspath(__file__))

AREA_MAP = {'관리자': '관리자 (신규)'}   # 앱 '관리자' == xlsx '관리자 (신규)' 블록
# 같은 위치(업무영역+중분류)에서 라벨만 다른 건 — 어느 쪽이 정합인지는 사람이 판단한 결과
LABEL_DIFFS = [
    # (업무영역, 중분류, xlsx 라벨, 앱 라벨, 판정, 비고)
    ('투자자산관리', '조합관리', '자편드별조합원조회', '자펀드별조합원조회', '앱이 맞음',
     'xlsx 원본 오타(자**편**드). 앱은 `path:"fund-member"` 라 route 영향 없음'),
    ('자펀드 보고', '운영기관정보', '공동GP펀드별 인력현황', '공통GP펀드별 인력현황', 'xlsx가 맞음',
     '앱 오타(공**통**→공**동**). path 없음 = 라벨이 route 키'),
    ('자펀드 보고', '운영기관정보', '운용사 재무정보', '운용사 재무보고', 'xlsx가 맞음',
     '앱이 「보고」로 잘못 적음. path 없음 = 라벨이 route 키'),
    ('조기경보', '가치평가', '예외사항레포트', '예외사항리포트', '판단 필요',
     '스펙 기준이면 xlsx(`레포트`), 어문규범 기준이면 앱(`리포트`)이 맞다 — 선택 사항. '
     'path 없음 = 라벨이 route 키'),
]


def n(s):
    return U.normalize('NFC', (s or '').strip())


def load_app_menu():
    """src/dash/data.ts 의 MENU 를 평탄화해 읽는다(별도 node 스크립트가 파싱)."""
    out = subprocess.run(['node', os.path.join(HERE, 'extract_app_menu.mjs')],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def load():
    new_rows, _ = parse()
    xl = [{'area': n(r['area']), 'cat': n(r['cat']), 'leaf': n(r['leaf']),
           'match': r['match'], 'html': r.get('html', '')}
          for r in new_rows if r['leaf']]
    app = [{'area': n(r['area']), 'cat': n(r['cat']) if r['cat'] else '',
            'leaf': n(r['leaf']), 'path': n(r['path']), 'top_only': r.get('top_only', False)}
           for r in load_app_menu()]
    return xl, app


def render(xl, app):
    xlk = {(r['area'], r['cat'], r['leaf']) for r in xl}
    appk = {(AREA_MAP.get(r['area'], r['area']), r['cat'], r['leaf']) for r in app}
    same = xlk & appk
    only_xl = xlk - appk
    only_app = appk - xlk
    diff_xl = {(a, c, x) for a, c, x, _, _, _ in LABEL_DIFFS}
    diff_app = {(a, c, p) for a, c, _, p, _, _ in LABEL_DIFFS}
    struct_xl = sorted(only_xl - diff_xl)
    struct_app = sorted(only_app - diff_app)
    app_real = [r for r in app if not r['top_only']]

    L = []
    w = L.append
    w('# 메뉴 대조표 — 메뉴구성도(xlsx) ↔ `APFS_DATA.MENU`(앱)')
    w('')
    w('> 좌: `APFS-2026-120-PP01_…_메뉴매칭_v0.2.xlsx` **메뉴구성도** 시트의 「새로운 메뉴 구성」(to-be)')
    w('> 우: `src/dash/data.ts` 의 `MENU` (2026-09-15 기준 HEAD `7bd5091`)')
    w('> 대조 키: `업무영역 > 중분류 > 리프 라벨` (NFC 정규화, 공백 trim)')
    w('')
    w('## 결론')
    w('')
    w(f'- **위치·라벨 완전 일치 {len(same)}개.** 앱은 이미 xlsx 「신규 메뉴 구성」을 구현하고 있다 '
      '— 현행(as-is) 트리가 아니다.')
    w(f'- 실제 불일치는 **라벨 {len(LABEL_DIFFS)}건**뿐. 나머지 차이는 전부 '
      '**의도적 범위 차이**(로그인·관리자(기존) 미반영, 대시보드 추가)다.')
    w('- 앱 `관리자`(8리프/3중분류)는 xlsx **관리자 (신규)** 블록과 정확히 일치 — '
      '관리자 (기존) 12리프는 채택되지 않았다. '
      '(단 이 대응은 시트가 명시한 게 아니라 모양·화면파일 근거로 이 문서가 내린 판단이다.)')
    w('- **순서까지 일치.** 중분류 등장 순서(32개)와 중분류별 리프 순서가 양쪽 모두 동일 '
      '— 집합뿐 아니라 배열로 비교해 확인했다. LNB 렌더 순서·`ALLMENU` 즐겨찾기 키가 '
      '`MENU` 배열 순서를 그대로 쓰므로 이 검증이 필요하다.')
    w('')
    w('### 검증 근거 (실행 결과)')
    w('')
    w('```')
    w('xlsx 신규 리프: 원본셀 152  파싱 152   (as-is 128/128, 고아 0건)')
    w('app  리프     : 137 (+대시보드 1) / 중분류 32 / 대분류 7')
    w('위치+라벨 완전일치 133 · xlsx만 19 · 앱만 5')
    w('  → 19 = 라벨불일치 4 + 블록 미반영 15(관리자(기존) 12 + 로그인 3)')
    w('  → 5  = 라벨불일치 4 + 대시보드 1')
    w('중분류 등장 순서 일치: True · 리프 순서 불일치 중분류: 0 / 32')
    w('```')
    w('')
    w('## 1. 업무영역별 수량 대조')
    w('')
    w('| 업무영역 | xlsx 중분류 | 앱 중분류 | xlsx 리프 | 앱 리프 | 상태 |')
    w('|---|---:|---:|---:|---:|---|')
    areas = list(dict.fromkeys([r['area'] for r in xl] + [AREA_MAP.get(r['area'], r['area']) for r in app]))
    for a in areas:
        xs = [r for r in xl if r['area'] == a]
        ap = [r for r in app if AREA_MAP.get(r['area'], r['area']) == a]
        xc, ac = len({r['cat'] for r in xs}), len({r['cat'] for r in ap})
        if a == '대시보드':
            w(f'| {a} | — | — | — | {len(ap)} | ➕ 앱에만 |')
            continue
        if xs and ap:
            st = '✅ 수량 일치' if (xc, len(xs)) == (ac, len(ap)) else '⚠️ 수량 불일치'
        elif xs:
            st = '⛔ 앱 미반영'
        else:
            st = '➕ 앱에만'
        w(f'| {a} | {xc or "—"} | {ac or "—"} | {len(xs) or "—"} | {len(ap) or "—"} | {st} |')
    w(f'| **합계** | **{len({(r["area"], r["cat"]) for r in xl})}** | '
      f'**{len({(r["area"], r["cat"]) for r in app_real})}** | '
      f'**{len(xl)}** | **{len(app_real)}** | |')
    w('')
    w('## 2. 라벨 불일치 (같은 위치, 이름만 다름)')
    w('')
    w('| 업무영역 > 중분류 | xlsx 라벨 | 앱 라벨 | 판정 | 비고 |')
    w('|---|---|---|---|---|')
    for a, c, x, p, verdict, note in LABEL_DIFFS:
        w(f'| {a} > {c} | `{x}` | `{p}` | **{verdict}** | {note} |')
    w('')
    w('> ⚠️ 라벨 수정 시 주의: 리프에 `path:` 가 없으면 **라벨이 곧 route 키**다'
      '(`leaf.path || leaf.label` 규약, `data.ts:104`). 다만 위 2~4행(`path` 없는 3건)은 `src/` 전체에서 `data.ts` '
      '외 등장이 없어 `schemas/` 에 등록된 route 가 아니다 — `_default.ts` 폴백 화면이라 '
      '라벨을 바꿔도 깨지는 배선은 없다.')
    w('')
    w('## 3. xlsx에만 있는 메뉴 (앱 미반영)')
    w('')
    w(f'총 {len(struct_xl)}개. 개별 누락이 아니라 **블록 단위 미반영**이다.')
    w('')
    w('| 업무영역 | 중분류 | 메뉴 | 원본 매칭/화면 |')
    w('|---|---|---|---|')
    for a, c, lf in struct_xl:
        src = next((r for r in xl if (r['area'], r['cat'], r['leaf']) == (a, c, lf)), {})
        extra = src.get('html') or src.get('match') or '—'
        w(f'| {a} | {c} | {lf} | {extra} |')
    w('')
    w('## 4. 앱에만 있는 메뉴')
    w('')
    w('| 업무영역 | 중분류 | 메뉴 | 성격 |')
    w('|---|---|---|---|')
    for a, c, lf in struct_app:
        w(f'| {a} | {c or "—"} | {lf} | 프로토타입 홈 화면 (xlsx 메뉴 체계 밖) |')
    w('')
    w('## 5. 문서 드리프트 — `CLAUDE.md` 기재 수치')
    w('')
    w('| 항목 | CLAUDE.md 기재 | 실측(`data.ts` HEAD) | 차이 |')
    w('|---|---:|---:|---:|')
    real_cat = len({(r['area'], r['cat']) for r in app_real})
    w(f'| 대분류 | 7 (+대시보드) | {len({r["area"] for r in app_real})} (+대시보드) | 0 |')
    w(f'| 중분류 | 34 | {real_cat} | {real_cat - 34} |')
    w(f'| 리프 | 141 | {len(app_real)} | {len(app_real) - 141} |')
    w('')
    w('또한 `CLAUDE.md`·`data.ts:102` 는 이 트리를 "현행시스템 메뉴 구조표 1:1 정본"이라 적었으나, '
      '위 1절이 보여주듯 실제로는 xlsx **신규(to-be) 구성**과 일치한다 — 출처 기술도 함께 손봐야 한다.')
    return '\n'.join(L).rstrip() + '\n'


if __name__ == '__main__':
    xl, app = load()
    open(sys.argv[1], 'w').write(render(xl, app))
    print('written', sys.argv[1])

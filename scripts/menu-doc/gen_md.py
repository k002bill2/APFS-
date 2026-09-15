# -*- coding: utf-8 -*-
"""메뉴구성도 시트 -> Markdown. 가로 병렬 블록을 열 인덱스 기준으로 분해한다."""
import os
import sys
import unicodedata as U
from xlsx import load
from resolver import (ASIS_SYS, DOC_DIR, ROOT, SRC_ROOT, SYS_DIR, build_index,
                      build_tobe_index, resolve, split_matches)

# 원본 xlsx 는 저장소에 없다(사외 산출물). 경로는 환경변수로 덮어쓸 수 있다.
XLSX = os.environ.get(
    'APFS_MENU_XLSX',
    os.path.expanduser('~/Downloads/APFS-2026-120-PP01_프로젝트일정계획표_메뉴매칭_v0.2.xlsx'))
SHEET = 'xl/worksheets/sheet6.xml'
TAGS = ('기존', '신규')
codes = {}

# 신규 메뉴 섹션(행 2~47): (업무영역, 대분류, 리프, 매칭, html)
NEW_BLOCKS = [
    (0, 1, 2, 3, None), (4, 5, 6, 7, None), (8, 9, 10, 11, None),
    (12, 13, 14, 15, None), (16, 17, 18, 19, None), (21, 22, 23, None, 24),
]
# 현행 as-is 섹션(행 50~95): (시스템, 대분류, 리프, 대분류 대체열)
# report 블록만 대분류가 col8/col9 두 곳에 번갈아 들어 있다(원본 작성 편차).
AS_IS_BLOCKS = [(0, 1, 2, None), (4, 5, 6, None), (8, 9, 10, 8),
                (12, 13, 14, None), (16, 17, 18, None)]


def esc(s):
    return (s or '').replace('|', '\\|').replace('\n', ' ')


_IDX = None
_TOBE = None
COVER = {'seg': 0, 'linked': 0, 'nofolder': 0, 'missing': 0,
         'html': 0, 'html_linked': 0, 'asis': 0, 'asis_linked': 0, 'asis_nofolder': 0}


USED = set()


def _link(label, full):
    """실물이 있을 때만 링크로, 없으면 원문 그대로. 경로는 NFC(맥 파일시스템은 NFD 반환)."""
    full = U.normalize('NFC', full)
    if not os.path.exists(full):
        return None
    USED.add(full)
    rel = os.path.relpath(full, DOC_DIR)
    return f'[{esc(label)}](<{rel}>)'


def link_html(name):
    """화면 파일 열(S0_*.html) -> to-be 목업 실물 링크."""
    global _TOBE
    if _TOBE is None:
        _TOBE = build_tobe_index()
    if not name:
        return ''
    COVER['html'] += 1
    full = _TOBE.get(U.normalize('NFC', name))
    out = _link(name, full) if full else None
    if out:
        COVER['html_linked'] += 1
    return out or esc(name)


def link_asis(area, leaf):
    """§2 현행 부록의 리프 -> 현행 목업 실물 링크."""
    global _IDX
    if _IDX is None:
        _IDX = build_index()[0]
    COVER['asis'] += 1
    sys_code = ASIS_SYS.get(area)
    if not sys_code:
        COVER['asis_nofolder'] += 1
        return esc(leaf)
    path = resolve(_IDX, sys_code, leaf)
    out = _link(leaf, os.path.join(ROOT, path)) if path else None
    if out:
        COVER['asis_linked'] += 1
    return out or esc(leaf)


def linkify(cell):
    """현 시스템 매칭 셀의 각 세그먼트를 목업 HTML 파일 링크로 바꾼다.

    세그먼트 단위로 거는 이유: 한 셀에 여러 현행 화면이 ' / ' 로 묶여 있고
    그중 일부만 파일이 존재하기 때문이다. 2단(시스템 > 대메뉴)은 메뉴 그룹이라 링크하지 않는다."""
    global _IDX
    if _IDX is None:
        _IDX = build_index()[0]
    segs = split_matches(cell)
    if not segs:
        return esc(cell)
    out = []
    for seg, sys_code, _mid, leaf in segs:
        path = None
        if leaf:
            COVER['seg'] += 1
            if sys_code not in SYS_DIR:
                COVER['nofolder'] += 1
            else:
                path = resolve(_IDX, sys_code, leaf)
                COVER['linked' if path else 'missing'] += 1
        link = _link(seg, os.path.join(ROOT, path)) if path else None
        assert path is None or link, f'링크 대상 없음: {path}'
        out.append(link or esc(seg))
    return ' / '.join(out)


def parse_block(rows, r0, r1, area_c, cat_c, leaf_c, match_c, html_c, alt_cat_c=None):
    """한 블록을 평면 레코드 리스트로 편다. 대분류는 아래로 forward-fill."""
    out, area, cat, tag = [], None, None, None
    for r in range(r0, r1 + 1):
        cells = rows.get(r, {})
        a = cells.get(area_c, '')
        if a:
            if a in TAGS:
                tag = a
            elif area is None or alt_cat_c is None:
                area = f'{a} ({tag})' if tag else a
                tag, cat = None, None
                # 업무영역 행의 대분류 칸에는 현행 시스템 코드(ffms/risk/...)가 들어 있다
                codes[area] = cells.get(cat_c, '')
                continue
            else:                       # alt 열: 두 번째 등장부터는 대분류
                cat = a
                out.append({'area': area, 'cat': cat, 'leaf': None,
                            'match': cells.get(match_c, '') if match_c is not None else ''})
                continue
        c = cells.get(cat_c, '')
        if c:
            cat = c
            out.append({'area': area, 'cat': cat, 'leaf': None,
                        'match': cells.get(match_c, '') if match_c is not None else ''})
        leaf = cells.get(leaf_c, '')
        if not leaf:
            continue
        out.append({
            'area': area, 'cat': cat, 'leaf': leaf,
            'match': cells.get(match_c, '') if match_c is not None else '',
            'html': cells.get(html_c, '') if html_c is not None else '',
        })
    return out


def parse():
    rows = load(XLSX, SHEET)
    new_rows = []
    for b in NEW_BLOCKS:
        new_rows += parse_block(rows, 2, 47, *b)
    as_is = []
    for area_c, cat_c, leaf_c, alt in AS_IS_BLOCKS:
        as_is += parse_block(rows, 50, 95, area_c, cat_c, leaf_c, None, None, alt)
    return new_rows, as_is


def ordered(seq):
    return list(dict.fromkeys(seq))


def render(new_rows, as_is):
    # 요약에 커버리지를 싣기 위해 선행 1패스로 집계하고 카운터를 되돌린다
    for r in new_rows:
        linkify(r['match'])
        if r.get('html'):
            link_html(r['html'])
    for r in as_is:
        if r['leaf']:
            link_asis(r['area'], r['leaf'])
    cover = dict(COVER)
    COVER.update({k: 0 for k in COVER})
    all_mockups = {U.normalize('NFC', os.path.join(ROOT, f)) for f in build_index()[1]}
    unlinked = len(all_mockups - USED)
    tobe_dirs = sorted({os.path.dirname(p) for p in build_tobe_index().values()})
    tobe_roots = ' · '.join(f'`{os.path.relpath(d, os.path.dirname(ROOT))}`' for d in tobe_dirs)

    leaves = [r for r in new_rows if r['leaf']]
    areas = ordered(r['area'] for r in new_rows)
    cats = ordered((r['area'], r['cat']) for r in new_rows)
    novel = sum(1 for r in leaves if r['match'] == '신규(현행 없음)')

    L = []
    w = L.append
    w('# APFS 메뉴 구성도')
    w('')
    w('> 출처: `APFS-2026-120-PP01_프로젝트일정계획표_메뉴매칭_v0.2.xlsx` — **메뉴구성도** 시트')
    w('> 추출일: 2026-09-15 · 원본 시트를 기계 추출한 것이라 이 문서는 정본이 아니다(정본은 xlsx).')
    w('')
    w('## 요약')
    w('')
    w(f'- **새로운 메뉴 구성**: 업무영역 {len(areas)} / 대분류 {len(cats)} / 리프 메뉴 **{len(leaves)}**개')
    w(f'- 이 중 현행 시스템에 대응 화면이 없는 신규 메뉴: **{novel}**개')
    w(f'- **현 시스템 기반(as-is)**: 시스템 {len(ordered(r["area"] for r in as_is))} / '
      f'리프 메뉴 {len([r for r in as_is if r["leaf"]])}개')
    w('')
    w('| 업무영역 | 대분류 | 리프 메뉴 | 신규(현행 없음) |')
    w('|---|---:|---:|---:|')
    for a in areas:
        sub = [r for r in leaves if r['area'] == a]
        nc = len({r['cat'] for r in new_rows if r['area'] == a})
        nn = sum(1 for r in sub if r['match'] == '신규(현행 없음)')
        w(f'| {esc(a)} | {nc} | {len(sub)} | {nn} |')
    w(f'| **합계** | **{len(cats)}** | **{len(leaves)}** | **{novel}** |')
    w('')
    w('### 목업 HTML 링크')
    w('')
    w('이 문서의 화면 참조는 모두 실물 HTML 목업으로 연결돼 있다 '
      '(파일이 실제로 존재하는 것만 링크했다).')
    w('')
    w(f'링크는 이 문서 기준 **상대경로**(`mockups/…`)다. `{os.path.basename(ROOT)}/` 는 '
      f'`{SRC_ROOT}` 의 미러로, 마크다운 뷰어가 작업 디렉터리 밖 파일을 읽지 못해 '
      '(`path resolves outside allowed directories`) repo 안에 복제해 둔 것이다 '
      '— APFS clonefile 복제라 실디스크 증가가 거의 없고 `.gitignore` 대상이다. '
      '원본이 갱신되면 다시 복제해야 한다.')
    w('')
    w('| 링크 대상 | 연결 | 전체 | 루트 |')
    w('|---|---:|---:|---|')
    w(f'| §1 `현 시스템 매칭` (3단 경로) | {cover["linked"]} | {cover["seg"]} | `mockups/01~05` |')
    w(f'| §1 `화면 파일` (to-be S0 목업) | {cover["html_linked"]} | {cover["html"]} | `mockups/` · `mockups/06_관리자` |')
    w(f'| §2 현행(as-is) 부록 리프 | {cover["asis_linked"]} | {cover["asis"]} | `mockups/01~05` |')
    w('')
    w('**연결되지 않은 것과 그 이유**')
    w('')
    w(f'- 현행 목업 폴더가 없는 시스템: `회계`·`관리자`(현행 통합 관리자) '
      f'— §1에서 {cover["nofolder"]}개, §2에서 {cover["asis_nofolder"]}개. 목업 제작 대상이 아니었다.')
    w('  - `통합 2/06_관리자` 는 여기에 해당하지 않는다. 그 폴더는 **to-be 공통관리 화면(S0_*)** '
      '보관처이지 현행 관리자 시스템 목업이 아니다 — 그래서 `화면 파일` 열에만 연결하고 '
      '`현 시스템 매칭` 해석에는 쓰지 않는다. (이름만 보고 이어붙이면 현행 `메뉴 관리` 가 '
      'to-be `S0_105_메뉴관리.html` 로 잘못 연결된다.)')
    w(f'- 폴더는 있으나 화면 파일이 없는 것: §1 {cover["missing"]}개 '
      f'(`ffms > 관리자 > {{공통코드관리, 메뉴관리, 사용자관리}}`, `ffms > 자펀드 관리 > 자펀드 관리`), '
      f'§2 {cover["asis"] - cover["asis_linked"] - cover["asis_nofolder"]}개(같은 화면들 + `일일보고 전송관리`).')
    w('- to-be S0 목업은 **11개 전부 연결**됐다. 로그인 3종(`S0_001`~`S0_003`)은 '
      '`mockups/` 바로 아래, 공통관리 8종(`S0_101`~`S0_108`)은 `mockups/06_관리자` 에 있다.')
    w('  - `S0_003_초대온보딩_운용사.html`(로그인 > 초대온보딩)과 '
      '`S0_103_사용자초대_운용사.html`(관리자 > 사용자 초대(운용사))은 **별개 화면**이다 '
      '— 전자는 초대받은 운용사가 보는 온보딩, 후자는 관리자가 초대를 보내는 화면. '
      '(003/103 표기 착오 아님을 실물로 확인.)')
    w('  - `S0_001_로그인.html` 은 루트와 `06_관리자` 양쪽에 있으나 내용이 '
      '바이트 단위로 동일하다(sha256 일치). 생성기는 중복본의 내용이 달라지면 실패한다.')
    w('- 2단 경로(`시스템 > 대메뉴`)는 화면이 아니라 메뉴 그룹이라 링크하지 않는다 '
      '— 해당 셀은 메뉴 그룹을 가리키므로 화면 파일이 존재하지 않는다.')
    w(f'- 반대 방향 점검: 현행 목업 {len(all_mockups)}개 중 '
      f'**{unlinked}개가 어느 메뉴에도 연결되지 않았다**. 대부분 '
      '등록/수정/근거/상세 같은 하위 화면이라 메뉴 리프가 아니다. 다만 다음 2건은 확인이 필요하다 — '
      '`S1_35_투자금_회수현황.html`(같은 이름의 to-be 리프 `투자금 회수현황` 의 매칭이 '
      '`ffms > 투자기업정보 > 투자및회수상세정보`(S1_36)를 지목하고 있어 연결되지 않음. '
      '스펙을 임의로 덮지 않았다), `S2_93_가치평가_일정관리.html`(화면 구조도엔 있으나 '
      '메뉴구성도의 신규·현행 어느 트리에도 없음).')
    w('- 이름이 달라 정규화로 안 붙는 17건은 `resolver.py` 의 `ALIAS` 표로 연결했다 '
      '(근거: `통합_화면_구조도_v1.5.xlsx` 통합 시트의 화면 목록, `자펀드=조합` 동의어는 같은 파일 작업체크리스트 7번).')
    w('')
    w('### 범례')
    w('')
    w('- `현 시스템 매칭` — 신규 메뉴가 대응하는 현행 화면 경로. `시스템 > 대분류 > 메뉴` 형식.')
    w('- `신규(현행 없음)` — 현행 시스템에 대응 화면이 없는 신규 개발 대상.')
    w('- ` / ` 로 이어진 값 — 현행 화면 **여러 개**가 신규 메뉴 하나로 통합됨.')
    w('- `(검토 필요)` — 원본에 적힌 매칭 보류 표시.')
    w('- 현행 시스템 코드: `ffms`(투자자산관리) · `risk`(조기경보) · `report`(자펀드 보고) · '
      '`brief`(부처보고) · `trust`(수탁보고) · 회계 · 관리자')
    w('- **관리자 (기존) / 관리자 (신규)** — 원본 시트가 관리자 메뉴를 `기존`·`신규` 두 벌로 나란히 적어 둔 것을 '
      '그대로 옮겼다. 기존 쪽은 현행 매칭을, 신규 쪽은 화면 파일명을 갖는다. 위 합계는 두 벌을 각각 센 값이다.')
    w('- `로그인`·`관리자 (신규)` 블록에는 현 시스템 매칭 열이 없고 **화면 파일명(html)** 열이 있다.')
    w('- 대분류 행의 매칭값(메뉴 칸이 빈 행)은 그 대분류 자체에 붙은 매칭이다 — 리프 매칭과 별개로 원본에 존재한다.')
    w('')
    w('---')
    w('')
    w('## 1. 새로운 메뉴 구성')
    w('')
    for a in areas:
        sub = [r for r in new_rows if r['area'] == a]
        has_html = any(r.get('html') for r in sub)
        w(f'### {a}')
        w('')
        if has_html:
            w('| 대분류 | 메뉴 | 화면 파일 |')
            w('|---|---|---|')
        else:
            w('| 대분류 | 메뉴 | 현 시스템 매칭 |')
            w('|---|---|---|')
        for cat in ordered(r['cat'] for r in sub):
            items = [r for r in sub if r['cat'] == cat and r['leaf']]
            head = [r for r in sub if r['cat'] == cat and not r['leaf']]
            cat_match = head[0]['match'] if head else ''
            # 대분류 자체의 매칭값도 원본에 있으므로 전용 행으로 남긴다
            w(f'| **{esc(cat)}** |  | {linkify(cat_match) or "—"} |')
            for r in items:
                last = link_html(r['html']) if has_html else linkify(r['match'])
                w(f'|  | {esc(r["leaf"])} | {last or "—"} |')
        w('')
    w('---')
    w('')
    w('## 2. 부록 — 현 시스템 기반 메뉴 (as-is)')
    w('')
    w('원본 시트 하단 `현 시스템 기반(아래)` 영역. 위 신규 구성의 매칭 대상이 되는 현행 메뉴 트리다.')
    w('')
    for a in ordered(r['area'] for r in as_is):
        sub = [r for r in as_is if r['area'] == a and r['leaf']]
        code = codes.get(a, '')
        w(f'### {a} (`{code}`)' if code else f'### {a}')
        w('')
        for cat in ordered(r['cat'] for r in sub):
            w(f'- **{cat}**')
            for r in sub:
                if r['cat'] == cat:
                    w(f'  - {link_asis(a, r["leaf"])}')
        w('')
    return '\n'.join(L).rstrip() + '\n'


if __name__ == '__main__':
    new_rows, as_is = parse()
    out = render(new_rows, as_is)
    open(sys.argv[1], 'w').write(out)
    leaves = [r for r in new_rows if r['leaf']]
    print('리프', len(leaves), '/ 대분류', len({(r['area'], r['cat']) for r in new_rows}),
          '/ as-is 리프', len([r for r in as_is if r['leaf']]))

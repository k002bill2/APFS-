# -*- coding: utf-8 -*-
"""현 시스템 매칭 경로 -> 통합 2 폴더의 목업 HTML 파일 해석기."""
import os, re, unicodedata as U

# 원본(SSOT)과 미러. 마크다운 뷰어가 작업 디렉터리 밖 파일을 읽지 못하므로
# (`path resolves outside allowed directories`), 링크는 repo 안 미러를 가리킨다.
# 미러는 APFS clonefile(`cp -c`) 복제라 실디스크 증가가 거의 없고 .gitignore 대상이다.
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DOC_DIR = os.path.join(REPO, 'docs')          # 문서가 있는 디렉터리 = 상대링크 기준
ROOT = os.path.join(DOC_DIR, 'mockups')       # 목업 미러(= 링크 대상, 저장소 추적 대상)
# 미러의 원본. 갱신분을 다시 복제할 때만 쓴다. 환경변수로 덮어쓸 수 있다.
SRC_ROOT = os.environ.get('APFS_MOCKUP_SRC', os.path.expanduser('~/Downloads/통합 2'))
# 메뉴구성도의 시스템 코드 -> 통합 2 하위 폴더
SYS_DIR = {
    'ffms': '01_투자자산관리', 'risk': '02_조기경보', 'trust': '03_자산수탁',
    'brief': '04_모태펀드보고', 'report': '05_MOAF',
}
# 정규화만으로 안 붙는 잔여분 — (시스템코드, 정규화한 리프명) -> 인덱스 키(= 정규화한 파일명).
# 근거: `통합_화면_구조도_v1.5.xlsx` 통합 시트의 (출처시스템, 대메뉴, 프로그램명) 목록과 1:1 대응.
# '자펀드 = 조합' 동의어는 같은 파일 작업체크리스트 7번이 명시한다.
ALIAS = {
    # ffms — 목업 폴더 화면은 파일명이 축약형
    ('ffms', '자펀드공고정보관리'): '공고관리',
    ('ffms', '모태펀드조성및출자현황'): '조성출자현황',
    ('ffms', '조합예상자금요청보고'): '조합예상자금보고',
    # risk — 메뉴명에만 '운용사' 접두가 붙거나 어순이 다름
    ('risk', '운용사주주변동관리'): '주주변동관리',
    ('risk', '운용사소송관리'): '소송관리',
    ('risk', '조기경보전월비교조회'): '조기경보전월데이터비교조회',
    # trust — 메뉴는 관리/비교조회, 화면은 조회 한 벌
    ('trust', '실물자료관리업로드'): '실물자료조회월별',
    ('trust', '실물검증비교조회'): '실물검증조회',
    ('trust', '공통코드조회'): '공통코드',
    ('trust', '자펀드코드조회'): '조합코드관리',
    ('trust', '계좌정보비교조회'): '계좌정보조회',
    ('trust', '입출금정보비교조회'): '입출금정보조회',
    # report — 메뉴 리프는 '조합별 … 현황', 화면은 대메뉴명 그대로
    ('report', '보고파일조회'): '업로드',
    ('report', '조합별수시보고현황'): '일일보고조회',
    ('report', '조합별월간보고현황'): '월간보고조회',
    ('report', '조합별반기보고현황'): '반기보고조회',
    ('report', '조합별실물검증결과보고'): '실물검증조회',
}


def norm(s):
    """NFC + 구분기호/공백 제거 + 목업 접미사 제거 후 비교용 키."""
    s = U.normalize('NFC', s or '')
    s = re.sub(r'\s*\(검토 필요\)\s*', '', s)
    s = re.sub(r'[（(]', '(', s)
    s = re.sub(r'[）)]', ')', s)
    s = re.sub(r'[\s_\-·,./()]+', '', s)
    return s.lower()


def strip_screen_id(base):
    """S1_15_조합원정보등록 -> 조합원정보등록, 공고관리_목업_artifact -> 공고관리

    macOS 파일시스템은 한글 파일명을 NFD(자모 분해)로 반환한다 — 소스의 NFC 리터럴과
    매칭되지 않으므로 반드시 먼저 NFC로 정규화한다."""
    b = re.sub(r'^S\d+_[\d_]+', '', U.normalize('NFC', base))
    b = re.sub(r'_(목업|artifact)(_artifact)?$', '', b)
    b = re.sub(r'_목업$', '', b)
    return b


def build_index():
    """{시스템코드: {정규화이름: 상대경로}} + 전체 파일 목록.

    os.walk 순서는 보장되지 않으므로 정렬해 재현 가능하게 만들고, 같은 시스템 안에서
    정규화 이름이 충돌하면 조용히 덮지 않고 실패시킨다(어느 파일이 이기는지가 실행마다 달라지면
    같은 문서가 다른 링크로 재생성된다)."""
    idx, files, collisions = {}, [], []
    for sys_code, folder in SYS_DIR.items():
        found = []
        for dirpath, dirnames, names in os.walk(os.path.join(ROOT, folder)):
            dirnames.sort()
            found += [os.path.relpath(os.path.join(dirpath, nm), ROOT)
                      for nm in sorted(names) if nm.endswith('.html')]
        m = {}
        for rel in sorted(found):
            files.append(rel)
            key = norm(strip_screen_id(os.path.basename(rel)[:-5]))
            if key in m:
                collisions.append((sys_code, key, m[key], rel))
            else:
                m[key] = rel
        idx[sys_code] = m
    assert not collisions, f'정규화 이름 충돌: {collisions}'
    # ALIAS 대상(값)이 실제 인덱스 키인지 — 오타면 조용히 링크만 빠지므로 여기서 잡는다
    dead = [(s, k, v) for (s, k), v in ALIAS.items() if v not in idx.get(s, {})]
    assert not dead, f'존재하지 않는 ALIAS 대상: {dead}'
    return idx, sorted(files)


if __name__ == '__main__':
    idx, files = build_index()
    print('파일', len(files))
    for s, m in idx.items():
        print(f'\n## {s} ({SYS_DIR[s]}) — {len(m)}')
        for k, v in sorted(m.items()):
            print(f'  {k:38s} {os.path.basename(v)}')


def split_matches(cell):
    """' / ' 로 이어진 매칭 문자열을 세그먼트로 분해한다.

    ' > ' 가 없는 세그먼트는 직전 full 세그먼트의 '시스템 > 대메뉴' 접두를 상속한다
    (원본이 연속 항목의 접두를 생략해 적기 때문)."""
    cell = U.normalize('NFC', cell or '').strip()
    if not cell or cell == '신규(현행 없음)':
        return []
    out, prefix = [], None
    for raw in cell.split(' / '):
        seg = raw.strip()
        if not seg:
            continue
        parts = [p.strip() for p in seg.split('>')]
        if len(parts) >= 3:
            prefix = (parts[0], parts[1])
            out.append((seg, parts[0], parts[1], ' > '.join(parts[2:])))
        elif len(parts) == 2:
            prefix = (parts[0], parts[1])
            out.append((seg, parts[0], parts[1], None))      # 2단 = 메뉴 그룹, 화면 아님
        elif prefix:
            out.append((seg, prefix[0], prefix[1], parts[0]))
        else:
            out.append((seg, None, None, parts[0]))
    return out


def resolve(idx, sys_code, leaf):
    """(시스템코드, 리프명) -> 통합 2 기준 상대경로. 없으면 None."""
    if not sys_code or not leaf:
        return None
    m = idx.get(sys_code)
    if m is None:
        return None
    key = norm(leaf)
    return m.get(ALIAS.get((sys_code, key), key))


# to-be 신규 화면(S0_*) 목업 보관처. 여러 곳에 흩어져 있어 순서대로 훑는다.
# `06_관리자` 는 01~05 와 달리 '현행 시스템 목업'이 아니라 to-be 공통관리 화면 모음이라
# SYS_DIR(현 시스템 매칭 해석용)에는 넣지 않는다 — 넣으면 현행 관리자 메뉴가
# to-be 화면으로 잘못 연결된다(`메뉴 관리` -> S0_105 등).
TOBE_DIRS = [ROOT, os.path.join(ROOT, '06_관리자')]


def _sha(path):
    import hashlib
    with open(path, 'rb') as fh:
        return hashlib.sha256(fh.read()).hexdigest()


def build_tobe_index():
    """{파일명: 절대경로} — 화면 파일 열에 적힌 S0_*.html 실물.

    같은 파일명이 여러 보관처에 있으면(S0_001_로그인 은 루트·06_관리자 양쪽) 내용이
    같은지 확인하고 먼저 찾은 쪽을 쓴다. 내용이 다르면 어느 쪽이 정본인지 사람이 정해야
    하므로 조용히 고르지 않고 실패시킨다."""
    out, dupes = {}, []
    for d in TOBE_DIRS:
        if not os.path.isdir(d):
            continue
        for nm in sorted(os.listdir(d)):
            nm = U.normalize('NFC', nm)
            if not re.match(r'^S0_\d+_.*\.html$', nm):
                continue
            path = os.path.join(d, nm)
            if nm in out:
                if _sha(out[nm]) != _sha(path):
                    dupes.append((nm, out[nm], path))
                continue
            out[nm] = path
    assert not dupes, f'같은 이름의 S0 목업이 내용까지 다름: {dupes}'
    return out


# §2 현행 부록의 시스템명 -> 시스템 코드 (회계·관리자는 목업 폴더 없음)
ASIS_SYS = {'투자자산관리': 'ffms', '조기경보': 'risk', '자펀드 보고': 'report',
            '부처보고': 'brief', '수탁보고': 'trust'}

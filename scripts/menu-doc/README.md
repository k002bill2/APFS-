# menu-doc — 메뉴 문서 생성기

`docs/메뉴구성도_v0.2.md` 와 `docs/메뉴대조표_xlsx_vs_APFS_DATA.md` 를 만드는 스크립트다.
**두 문서는 손으로 쓴 게 아니라 생성물**이므로, 고칠 일이 생기면 md 가 아니라 여기를 고치고 다시 생성한다.

## 재생성

```bash
python3 scripts/menu-doc/gen_md.py   docs/메뉴구성도_v0.2.md
python3 scripts/menu-doc/gen_diff.py docs/메뉴대조표_xlsx_vs_APFS_DATA.md
```

생성 후 `git diff` 가 비어 있으면 입력이 안 바뀐 것이다(재현 가능함을 이 방식으로 확인한다).

## 입력

| 입력 | 위치 | 비고 |
|---|---|---|
| 메뉴구성도 원본 | `~/Downloads/APFS-2026-120-PP01_프로젝트일정계획표_메뉴매칭_v0.2.xlsx` | **저장소에 없음**(사외 산출물). `APFS_MENU_XLSX` 로 경로 지정 가능 |
| 목업 HTML | `docs/mockups/` | 저장소 추적 대상. 링크 대상이자 해석 인덱스 |
| 앱 메뉴 | `src/dash/data.ts` 의 `MENU` | `extract_app_menu.mjs` 가 리터럴만 잘라 평가 |
| 화면 구조도 | `docs/mockups/통합_화면_구조도_v1.5.xlsx` | 별칭(`ALIAS`) 판단의 근거 |

## 파일

- **`xlsx.py`** — 의존성 없는 xlsx 리더(zip + XML). `openpyxl` 을 깔지 않으려고 직접 만들었다.
- **`resolver.py`** — 메뉴 경로 → 목업 파일 해석기. 저장소 경로는 `__file__` 기준으로 잡으므로 어디에 클론해도 동작한다.
  - `SYS_DIR` — 시스템 코드(`ffms`/`risk`/`trust`/`brief`/`report`) → 목업 폴더. **동명 화면을 가르는 스코프**다
    (`투자기업정보(전체)` 가 ffms `S1_31` 과 risk `S2_64` 양쪽에 있다).
  - `ALIAS` — 이름 정규화만으로 안 붙는 17건의 사람 판단. 근거는 화면 구조도의 화면 목록.
  - `TOBE_DIRS` — to-be 신규 화면(`S0_*`) 보관처. `06_관리자` 는 **현행 목업이 아니라서** `SYS_DIR` 에 넣지 않는다
    (넣으면 현행 `메뉴 관리` 가 to-be `S0_105_메뉴관리.html` 로 잘못 연결된다).
- **`gen_md.py`** — 메뉴구성도 시트 → md. 링크 생성은 전부 `_link()` 한 곳을 지난다(존재 검사 + 상대경로 변환).
- **`extract_app_menu.mjs`** — `src/dash/data.ts` 의 `MENU` 를 평탄화해 JSON 으로 출력.
- **`gen_diff.py`** — 위 둘을 대조. 라벨 불일치 판단(`LABEL_DIFFS`)은 사람이 정한 값이라 코드에 명시돼 있다.

## 목업 미러 재복제

`docs/mockups/` 는 `~/Downloads/통합 2` 의 미러다. 마크다운 뷰어가 작업 디렉터리 밖 파일을 읽지 못해서
(`Error: Access denied: path resolves outside allowed directories`) 저장소 안에 둔다. 원본이 갱신되면:

```bash
SRC=~/Downloads/통합\ 2; DST=docs/mockups
find "$SRC" -type f ! -name '.DS_Store' -print0 | while IFS= read -r -d '' f; do
  rel="${f#$SRC/}"; mkdir -p "$DST/$(dirname "$rel")"
  cp -c "$f" "$DST/$rel" 2>/dev/null || cp "$f" "$DST/$rel"   # -c = APFS clonefile
done
```

## 함정 (다시 밟지 말 것)

- **macOS 파일시스템은 한글 파일명을 NFD(자모 분해)로 반환한다.** 소스에 NFC 로 쓴 정규식과 매칭되지 않아
  목업이 통째로 인덱스에서 빠진다. `strip_screen_id()` 가 읽자마자 NFC 로 정규화하는 이유다.
- **메뉴구성도 시트는 블록 6개가 가로로 병렬 배치**돼 있다. 행 번호는 블록 간에 의미가 없으므로
  계층은 열 인덱스로 읽고 대분류를 아래로 forward-fill 한다.
- **매칭 셀은 연속 항목의 접두를 생략한다** (`ffms > 자펀드 관리 > (운용사)출자배분관리 / (농금원)출자배분관리`).
  ` / ` 로 단순 분할하면 뒤쪽이 조용히 미해석된다 — `split_matches()` 가 직전 full 세그먼트의 접두를 상속시킨다.
- `ALIAS` 의 **키는 `norm()` 결과**여야 하고(괄호·공백 제거), **값은 실재하는 인덱스 키**여야 한다.
  둘 다 틀리면 링크만 조용히 빠지므로 `build_index()` 가 즉시 실패시킨다.

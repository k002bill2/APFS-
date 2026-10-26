# uiux-doc — UI/UX 기능설명서 생성기

`docs/UIUX_기능설명서.html`(현업·PM용 화면별 기능설명서)을 만드는 스크립트다.
**문서는 손으로 쓴 게 아니라 생성물**이므로, 고칠 일이 생기면 HTML 이 아니라 여기를 고치고 다시 생성한다.

## 재생성

```bash
python3 scripts/uiux-doc/gen_doc.py                 # → docs/UIUX_기능설명서.html
python3 scripts/uiux-doc/gen_doc.py /tmp/preview.html   # 다른 경로로
```

- 상단 기준 표시는 기본 `기준 main <origin/main 커밋> · <오늘>` 이다. **브랜치의 미머지 소스**를 문서화하거나
  기존 출력과 바이트 단위로 비교할 땐 `DOC_BASIS="기준 main e63ba3e · 2026-10-26"` 처럼 덮어쓴다.
- 기준 표시를 같게 주고 생성했을 때 `git diff` 가 비어 있으면 입력이 안 바뀐 것이다(재현성 확인 방법).
- `npx vite-node` 가 필요하다(저장소 `node_modules` 의 vite). CJS 경고 한 줄은 무해하다.

## 입력

| 입력 | 위치 | 비고 |
|---|---|---|
| 메뉴 트리 | `src/dash/data.ts` `APFS_DATA.MENU` | `menu_export.ts` 가 실제 모듈을 import 해 추출 |
| 전용(typed) 라우트 | `src/dash/app.tsx` | `route === "…"` 분기를 정규식으로 수집 |
| 스키마 라우트 | `src/dash/schemas/index.ts` `ALL_SCHEMAS` | 등록 route 전부 |
| 화면별 원고 | `screens_data.py` | 사람이 쓴 문장. 코드에서 자동 생성되지 않는다 |
| 공통 절 | `common_sections.py` | 셸·단축키·리스트 공통·인쇄·대시보드·한계 |

## 파일

- **`gen_doc.py`** — 진입점. 메뉴를 추출하고 원고·공통 절·템플릿을 합쳐 HTML 하나를 쓴다.
  **실패 조건**: 메뉴 리프(미구현 제외)의 원고 누락 · 원고에만 있는 route · 메뉴 밖 그룹(`EXTRA_GROUPS`) 원고 누락 · 남은 `{{자리표시자}}`.
- **`menu_export.ts`** — vite-node 로 실행돼 `{ tree, typed, schemaRoutes }` 를 임시 JSON 으로 쓴다.
  `scripts/menu-doc/extract_app_menu.mjs` 는 MENU 리터럴만 평탄화하고 화면 유형을 가르지 않아 따로 둔다.
- **`screens_data.py`** — `SCREENS`(route → sid·file·summary·layout·features·popups·note·label),
  `EXTRA_GROUPS`(메뉴 밖 라우트 묶음). `D` = 데모 배지 HTML 조각.
- **`common_sections.py`** — `COMMON_HTML`·`DASHBOARD_HTML`·`LIMITS_HTML`.
- **`template.html`** — 페이지 골격(상단 바·검색 JS·라이트/다크 토큰). `{{BASIS}}`·`{{STATS}}` 등을 `gen_doc.py` 가 치환한다.

## 원고를 고칠 때

- 검증은 **route 단위 누락만** 잡는다. 화면 동작이 바뀌어도 `screens_data.py` 문장은 그대로 남는다 —
  기능 PR 이 화면 동작을 바꾸면 해당 카드 문장도 같이 고친다.
- `file` 경로는 `src/dash/` 기준 상대경로다. 폴더를 옮기면(예: 2026-10-26 `aut/`·`frt/` 3단계 분할) 같이 고친다.
- 구현 중(main 미반영) 기능을 적을 땐 `<p class="note w">` 노트로 표시하고, 머지되면 노트를 지운다.

## 함정 (다시 밟지 말 것)

- **`common_sections.py` 는 f-string 이다.** 템플릿 자리표시자를 넣으려면 중괄호를 두 배로 쓴다 —
  `{{{{N_DEFAULT}}}}` 가 f-string 을 지나 `{{N_DEFAULT}}` 가 되고, 그걸 `gen_doc.py` 가 치환한다.
- **전용 화면 판정은 `app.tsx` 의 `route === "…"` 문자열에 기댄다.** 라우팅 분기 방식이 바뀌면 메뉴 밖 라우트(login 등)가
  '원고에만 있는 route' 로 실패하고, 메뉴 리프는 조용히 '미구현'으로 떨어진다 — 생성 결과의 `전용 N` 이 급감하면 이것부터 본다.
- `sys.dont_write_bytecode` 로 `__pycache__` 를 만들지 않는다(`.gitignore` 에 없다).

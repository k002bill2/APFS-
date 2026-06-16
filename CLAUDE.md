# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 Claude Code(claude.ai/code)에게 주는 안내입니다.

## 프로젝트 개요

**APFS** — 농림수산식품모태펀드 투자자산관리시스템(Agriculture·Forestry·Fisheries Food Fund Investment Asset Management System)의 **대시보드 UI 프로토타입**.

이 저장소는 **빌드된 단일 HTML 산출물 하나**로 구성됩니다. 백엔드 없이 더미 데이터로 화면이 완결되는 오프라인 데모이며, Claude Artifact 스타일의 "omelette starter scaffold"에서 내보낸 자가-완결(self-contained) 번들입니다.

- 빌드 시스템 없음 (`package.json`, 번들러 설정, `node_modules` 모두 없음)
- 백엔드/API 없음 — 모든 데이터는 임베디드 더미 데이터(`APFS_DATA`)
- 의존성은 전부 파일 안에 인라인 (오프라인 동작)

## 파일 구조

```
APFS/
├── README.md                              # 거의 비어 있음
├── CLAUDE.md                              # 이 파일
├── 농식품모태펀드 대시보드.html              # ★ 정본 산출물 — 자가완결 오프라인 단일 파일 (~1.45MB)
├── 농식품모태펀드 대시보드 (오프라인).html   # (구버전) first-commit 시점 번들 — 위 정본이 대체
└── src/                                   # 편집용 소스 트리 (오프라인 번들은 여기서 재생성)
    ├── dashboard.html                     # dev 엔트리 — dash/* 모듈 참조, Tailwind/React/lucide/Babel CDN (편집 시 온라인 필요)
    └── dash/                              # 앱 모듈: data·icons·charts·components·shell·designsystem·main_widgets·main·performance·app(.js), tweaks-panel·tweaks_app(.jsx), tokens·tweaks(.css), assets/logo*.svg
```

> 정본은 루트 `농식품모태펀드 대시보드.html`(오프라인 자가완결). `src/`는 사람이 직접 고치는 소스이고, 의미 있는 변경은 `src/`에서 한 뒤 omelette/Artifact 번들로 다시 내보내 정본을 갱신합니다.

## 번들 아키텍처 (가장 중요 — 편집 전 반드시 이해)

`농식품모태펀드 대시보드 (오프라인).html`은 사람이 직접 읽고 고치도록 만든 소스가 **아닙니다**. 다음 4개의 특수 `<script>` 태그로 구성된 자체 번들 포맷입니다.

| 태그 | 내용 |
|------|------|
| (loader, 일반 inline `<script>`) | DOMContentLoaded 시 manifest를 풀어 blob URL로 만들고 template을 렌더 |
| `<script type="__bundler/manifest">` | `{ uuid: { mime, compressed, data(base64) } }` — 모든 자산(JS/이미지). `compressed:true`면 gzip |
| `<script type="__bundler/ext_resources">` | `[{ id, uuid }]` — 코드에서 `window.__resources[id]`로 참조하는 리소스(로고 등) |
| `<script type="__bundler/template">` | JSON 문자열로 escape된 실제 앱 HTML. `<script src="<uuid>">`로 위 자산들을 참조 |

**렌더 흐름**: loader가 manifest의 각 자산을 base64 디코드(+필요시 gzip 해제) → `Blob`/`data:` URL 생성 → template 문자열의 uuid를 blob URL로 치환 → `DOMParser`로 파싱 후 `document.documentElement`를 교체 → `<script>`를 재생성해 실행(React → ReactDOM → Babel 순서 보존) → `text/babel`은 `Babel.transformScriptTags()`로 변환.

> blob URL은 `file://` 문서에서 null origin이라, loader가 `integrity`/`crossorigin` 속성을 의도적으로 제거합니다(SRI 깨짐 방지). 이건 정상 동작입니다.

## 임베디드 모듈 맵

template이 참조하는 16개 `<script>` 중 핵심은 자체 작성 앱 모듈입니다. 각 모듈은 `(function(w){ ... })(window)` 패턴으로 `window`에 컴포넌트를 노출하고 다음 모듈이 `w.Xxx`로 받아 씁니다.

**벤더 라이브러리 (수정 대상 아님)**
- React (development build), ReactDOM (development build)
- `lucide v0.460.0`, Babel standalone (`text/babel` JSX 변환용)

**앱 모듈 (Korean 주석으로 역할 명시)**
- `한국어 더미 데이터` → `window.APFS_DATA` (메뉴/위젯/지표 등 화면 데이터 소스)
- `디자인 시스템 미리보기` → 컬러 토큰·타이포·공통 컴포넌트
- `공통 래퍼 컴포넌트` → `window.UI` (Button, ColorChip, StatusBadge, SegTabs 등; Tailwind 유틸 className 기반)
- `lucide 스타일 라인 아이콘` → `window.Icon`
- `SVG 차트 프리미티브` → Recharts 동일 스펙의 자체 SVG 차트
- `전역 셸` → `window.Shell` (GNB / LNB / 브레드크럼 / 알림센터 / RBAC 게이팅 / 테마 토글)
- `메인 종합 대시보드 — 공유 위젯` + `메인 종합 대시보드 — 3개 레이아웃 시안`
- `투자 성과·포트폴리오 서브페이지`
- `앱 루트` → 테마/역할/라우트 상태, 서브 대시보드 스텁, `#root`에 마운트
- `Tweaks 앱` → 디자인 토큰 조정 패널(data-* 속성 + localStorage 영속화, 효과는 CSS 변수로)
- `bb8dca10` (`text/jsx`) → omelette starter scaffold 진입점

**라우트/페이지 스텁** (앱 루트의 `STUBS`, PRD 절 참조와 함께):
- `risk` 조기경보 리스크 (PRD 5.6 / 5.7)
- `gp-health` 운용사 건전성 (PRD 5.5)
- `accounting` 회계·자금 마감 (PRD 5.10 / 5.11)
- `performance` 투자 성과·포트폴리오 (PRD 5.4 / 5.9)
- `schedule` 일정·알림 센터
- 메인 종합 대시보드, 디자인 시스템 프리뷰

셸은 RBAC `role` 기반으로 `D.MENU`를 필터링(`m.roles.includes(role)`)하므로 역할에 따라 보이는 메뉴가 달라집니다.

## 실행 방법

빌드/서버 불필요 — 브라우저로 HTML 파일을 직접 엽니다.

```bash
open "농식품모태펀드 대시보드 (오프라인).html"   # macOS
```

- 오프라인 동작하지만, **Pretendard 폰트만 `cdn.jsdelivr.net`에서 로드**합니다(네트워크 없으면 시스템 폰트로 폴백). 그 외 모든 코드/이미지는 파일 내장.
- `localStorage`에 테마/역할/Tweaks 설정을 영속화합니다.

## 편집 시 주의사항

앱 로직을 고치려면 임베디드 자산(gzip+base64)을 **꺼내서 → 수정 → 다시 인코딩**해야 합니다. template 문자열도 JSON-escape 되어 있습니다. 단순 텍스트 검색/치환으로는 거의 불가능합니다.

자산을 추출·확인할 때 쓰는 디코드 레시피:

```python
import re, json, base64, gzip
f = "농식품모태펀드 대시보드 (오프라인).html"
data = open(f, encoding="utf-8").read()
manifest = json.loads(re.search(r'<script type="__bundler/manifest">\s*(.*?)\s*</script>', data, re.S).group(1))
def decode(uuid):
    e = manifest[uuid]; raw = base64.b64decode(e["data"])
    return gzip.decompress(raw) if e.get("compressed") else raw
# template(실제 앱 HTML)도 JSON 문자열:
template = json.loads(re.search(r'<script type="__bundler/template">\s*(.*?)\s*</script>', data, re.S).group(1))
```

**권장**: 의미 있는 변경은 이 번들을 직접 패치하지 말고, **`src/` 편집용 소스에서 수정한 뒤 omelette/Artifact 번들로 다시 내보내** 루트 정본 `농식품모태펀드 대시보드.html`을 갱신하세요. `src/dashboard.html`을 로컬 서버(예: `python3 -m http.server`)로 열면 모듈을 직접 편집·확인할 수 있습니다(Tailwind/React/lucide/Babel CDN 사용 — 편집 시 온라인 필요). 번들 재생성 파이프라인이 필요하면 사용자에게 확인하세요.

## 디자인 토큰 / 브랜드

- 도메인 톤: **숲(forest green)**. 브랜드 블루/시안은 강조·링크·차트 보조.
- 지정 브랜드 색: `#0058A8` `#00AAE5` `#2D7846` `#7BB93C` `#58585B`
- 역할색(라이트): `--primary:#0E963B`, `--secondary/cyan:#1DCDA7`, `--accent/ring:#0158A8`
- 폰트: Pretendard (`--font-sans`)
- 라이트/다크 테마 모두 지원, CSS 변수 토큰 기반.

## 도메인 컨텍스트

농림수산식품모태펀드(모태펀드/펀드오브펀드) 투자자산관리 업무 화면. 운용사(GP) 보고, 조기경보 리스크, 회계·자금 마감, 투자 성과·포트폴리오, 의무투자 컴플라이언스, 일정·알림 등을 다룹니다. 화면 위젯은 "PRD 5.x" 절을 근거로 구성돼 있습니다.

---

# Claude Code 통합 시스템 (Parallel Agents + Skills + Dev Docs)

이 저장소에는 Parallel Agents Safety Protocol **v3.2.0** 기반의 멀티에이전트 작업 환경이 구성돼 있습니다. 전체 프로토콜: `docs/Parallel_Agents_Safety_Protocol_v3_1_0.md`.

## Agent 역할 요약

| Agent | model | 역할 |
|-------|-------|------|
| `primary-coordinator` | opus-4.8 | 태스크 분해·배분·검증·통합, 사용자 소통, 안전 강제 |
| `code-explorer` | sonnet-4.6 | 코드베이스 탐색·분석 (읽기 전용) |
| `code-reviewer` | sonnet-4.6 | 보안·성능·가독성·아키텍처 리뷰, Cross-Agent 검증 |
| `verify-agent` | sonnet-4.6 | Fresh-context 독립 빌드/실행/무결성 검증 |
| `code-architect` | opus-4.8 | 구현 전 설계 검토·의존성/리스크 분석 (읽기 전용) |

## 핵심 안전 원칙 (항상 적용)
- **Data Integrity 우선** — 데이터 손상/유실/노출 금지.
- 서브에이전트는 Primary 승인 없이 공유 파일을 수정하지 않는다.
- 윤리적 우려(민감정보·시스템 손상 위험 등) 발생 시 **즉시 중단** 후 사용자에게 보고.
- 능력 초과 태스크는 즉시 에스컬레이션.
- 파일 생성/편집 전 해당 SKILL을 먼저 참조(특히 번들 편집은 `apfs-bundle`).

## 멀티에이전트 실행 패턴
- **1순위 — Workflow 도구**: 인라인 JS, `export const meta`로 시작, 전역 `agent()`/`parallel()`/`pipeline()`/`phase()`/`log()`. 동시성 자동 캡 `min(16, cpu-2)`, 격리 `agent(p,{isolation:'worktree'})`.
- **Agent 도구 직접 호출**: `run_in_background`(완료 시 알림), `SendMessage`(실행 중 에이전트에 추가 지시), `isolation:'worktree'`.
- 레거시 수동 Primary/Secondary·파일 Lock은 Workflow 미사용 시 폴백.

## Skills (자동 활성화)
- `UserPromptSubmit` hook(`.claude/hooks/skill-activator.sh`)이 프롬프트를 stdin JSON으로 받아 `.claude/hooks/skill-rules.json`의 키워드와 매칭, 관련 스킬을 컨텍스트로 추천.
- 프로젝트 스킬: `code-reviewer`(리뷰) · `dashboard-ui`(UI/디자인) · `apfs-bundle`(번들 디코드/편집/재인코드).
- 새 스킬 추가 시 `skill-rules.json`의 트리거도 함께 갱신.

## Dev Docs 워크플로우
- `/dev-docs <task>` → 구현 → `/update-dev-docs` → `/save-and-compact` → (재시작) → `/resume`.
- `dev/active/<task>/`에 plan·context·tasks 3-파일로 대규모 작업 컨텍스트를 관리.

## 참조 문서
| 문서 | 위치 |
|------|------|
| 전체 안전 프로토콜 | `docs/Parallel_Agents_Safety_Protocol_v3_1_0.md` |
| 셋업 가이드/원문 | `Claude code system setup/` |

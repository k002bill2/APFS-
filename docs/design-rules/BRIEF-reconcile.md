# BRIEF — 규칙 간 정리 (APFS)
- 책임 역할: Developer / 실행 환경: Orca + Claude Code · 발행 Jarvis 2026-09-27 · 영환님 승인 방향 반영

## 할 일
1. `.claude/rules/frontend-design-defaults.md` 14번을 `color-tokens` 스킬 예외와 일치시킨다. 목표 문장:
   "14. hex·rgba 리터럴 색 → `color-tokens` 스킬 규약. 예외 목록은 그 스킬의 '정당한 hex 예외' 절이 정본(로고 SVG·`tweaks.css`·`index.html` 부트·DS hex 라벨·scrim rgba). 기존 에디터 글자색 팔레트·외부 위젯 테마 주입은 현행 유지."
2. 같은 파일 6번 끝에 한 문장 추가: "`--gradient-hero` 토큰은 기존 메인 Hero 전용 — 신규 화면에서 쓰지 않는다."
3. `.claude/skills/color-tokens/SKILL.md` 40행 부근 `--gradient-hero` 언급 바로 뒤에 괄호 주석 1개만 추가: "(기존 메인 Hero 전용 — 신규 사용 금지, `.claude/rules/frontend-design-defaults.md` 6번)". 21행 표는 건드리지 않는다.
4. 하네스 변경 이력 이동: `CLAUDE.md` 맨 끝 "- 2026-09-27: 경로 스코프 규칙 …" 1줄을 삭제하고, `docs/HARNESS_CHANGELOG.md` 표의 **마지막 행 뒤**에 기존 4열 형식(날짜 | 변경 내용 | 대상 | 사유)으로 1행 추가:
   `| 2026-09-27 | 경로 스코프 규칙 신설(`paths: src/**`, 금지 패턴 15 + 대체 토큰) · `color-tokens`에 `--gradient-hero` 신규 사용 금지 주석 | `.claude/rules/frontend-design-defaults.md`, `.claude/skills/color-tokens/SKILL.md`, `CLAUDE.md` | Opus 5.5 가이드: 디자인 지시 없는 UI는 구체 금지 목록이 있어야 기본 스타일 회귀를 막음. 근거 `docs/design-rules/REPORT-opus55-design-defaults.md` |`
   표가 파일 끝이 아니면 표 마지막 행 바로 뒤에 넣는다.
지정 파일: `.claude/rules/frontend-design-defaults.md`, `.claude/skills/color-tokens/SKILL.md`, `CLAUDE.md`, `docs/HARNESS_CHANGELOG.md`

## 공통 규칙
- 규칙의 금지·대체 항목 자체는 바꾸지 않는다. 아래 지정 문구만 고친다.
- 지정 파일 외 수정 금지(`src/`·설정·lockfile 포함). 지정 외 모순을 추가로 발견하면 고치지 말고 최종 메시지에 보고.
- 패키지 설치·빌드·dev 서버·네트워크 호출·push·main 병합 금지.
- `docs/design-rules/PROGRESS-reconcile.md`에 아래 단계 체크리스트를 만들고 진행하며 체크한다.
- 마지막에 경로 지정 커밋 1회: `git add <수정 파일들> docs/design-rules && git commit -m "docs(claude): reconcile design-defaults rule with existing rules" -- <수정 파일들> docs/design-rules`
- 검증: `git diff --name-only HEAD~1..HEAD` 가 지정 파일 + docs/design-rules/* 뿐인지, `git status --short` 가 비었는지.

## 최종 메시지
수정 파일별 변경 전/후 문장 / 커밋 해시 / 검증 출력 / 추가로 발견한 모순(없으면 "없음").

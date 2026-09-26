# BRIEF — 잔여 문구 정리 (APFS)
- 책임 역할: Developer / 실행 환경: Orca + Claude Code · 발행 Jarvis 2026-09-27 · 영환님 승인(새 규칙 기준으로 옛 문구 교정)

## 할 일
사실: `tweaks.css`는 커밋 fa422ce(Tweaks 패널 전체 삭제)로 저장소에 없다(`git ls-files | grep -ci tweaks` = 0).
1. `.claude/skills/color-tokens/SKILL.md` 43행 '정당한 hex 예외' 목록에서 "`tweaks.css` 무드 정의 · " 항목만 삭제.
2. `.claude/rules/frontend-design-defaults.md` 14번 괄호 목록에서 "`tweaks.css`·" 만 삭제.
3. `AGENTS.md` 30행 "`tokens.css`, `tweaks.css`, 공통 컴포넌트" → "`tokens.css`, 공통 컴포넌트".
4. `docs/HARNESS_CHANGELOG.md` 표의 2026-09-27 행 '변경 내용' 칸 끝에 " · 삭제된 `tweaks.css` 잔존 언급 제거(color-tokens·AGENTS.md)"를 덧붙이고 '대상' 칸에 `AGENTS.md`를 추가한다(새 행 만들지 않음).
수정 후 `grep -rn "tweaks.css" .claude AGENTS.md CLAUDE.md` 결과가 0건인지 확인.

## 규칙
- 지정 문구 외 수정 금지. 지정 파일: `.claude/skills/color-tokens/SKILL.md`, `.claude/rules/frontend-design-defaults.md`, `AGENTS.md`, `docs/HARNESS_CHANGELOG.md`
- 빌드·설치·네트워크·push·병합 금지. 추가 불일치를 발견하면 고치지 말고 보고.
- 커밋 1회: `git add .claude/skills/color-tokens/SKILL.md .claude/rules/frontend-design-defaults.md AGENTS.md docs/HARNESS_CHANGELOG.md docs/design-rules && git commit -m "docs(claude): drop stale wording after design-defaults reconcile" -- .claude/skills/color-tokens/SKILL.md .claude/rules/frontend-design-defaults.md AGENTS.md docs/HARNESS_CHANGELOG.md docs/design-rules`
- 검증: `git diff HEAD~1..HEAD -- .claude/skills/color-tokens/SKILL.md .claude/rules/frontend-design-defaults.md AGENTS.md docs/HARNESS_CHANGELOG.md` 출력 전문, `git status --short` 비어 있음.
- `docs/design-rules/PROGRESS-fix.md`에 체크리스트를 만들고 체크한다.

## 최종 메시지
변경 전/후 문장 / 커밋 해시 / 검증 출력 / 추가 발견(없으면 "없음").

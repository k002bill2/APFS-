# APFS Claude Code 통합 시스템 — 설치 주의사항 / 조정 사항

> 생성: 2026-06-16 · 근거: `Claude code system setup/` 가이드 (setup_prompt + Protocol v3.2.0)
> 가이드 STEP 5의 "**주의사항** 섹션을 반드시 확인하세요"에 해당하는 감사 기록입니다.

이 설치는 오래된 `claude_code_setup_prompt.md`를 그대로 따르지 않고, **최신 프로토콜 v3.2.0(§A4)과 현행 Claude Code 동작**에 맞춰 아래 항목을 의도적으로 조정했습니다. 모두 정상이며 결함이 아닙니다.

## A. 명세 ↔ 현행 API 불일치로 인한 조정

| # | 항목 | 가이드 명세 | 실제 적용 | 이유 |
|---|------|------------|-----------|------|
| 1 | 에이전트 frontmatter | `model, effort, maxTurns, disallowedTools` | `name, description, model, tools` 만 | 프로토콜 §A4: `effort/maxTurns/disallowedTools`는 환경별 지원 차이 → `tools` 화이트리스트가 안전. 권한 제한은 settings.json `permissions.deny`로 전역 강제. |
| 2 | settings.json `maxTokens: 16000` | 포함 | **제외** | 현행 settings.json의 인식 키가 아님(무시/경고 위험). 토큰 한도는 요청 단위 설정. |
| 3 | hooks 이벤트 스캐폴드 | 13개 이벤트 빈 배열 포함 | **UserPromptSubmit, PreCompact 만 등록** | 그 외(`PostToolUseFailure/SubagentStart/PermissionRequest/Setup` 등)는 현행 스키마 유효 이벤트가 아닐 수 있어 등록 시 검증 실패 위험. 실제 사용하는 hook만 등록. |
| 4 | model 표기 | 문서엔 `sonnet-4.6` 단축형 혼재 | 전체 ID `claude-opus-4-8` / `claude-sonnet-4-6` | setup_prompt #5 지시 + 현 환경에서 확인된 실제 ID. |
| 5 | 프로토콜 사본 파일명 | `Parallel_Agents_Safety_Protocol_v3_1_0.md` | 동일(`v3_1_0`) — **내용은 v3.2.0** | 가이드가 이 파일명을 명시했고 CLAUDE.md 참조도 이 이름이라 일치 유지. 파일명-내용 버전 표기 불일치는 cosmetic(참조는 정상 동작). |

## B. Hook 동작 계약 (claude-code-guide로 확인)

- **`$PROMPT`는 Claude Code가 치환하지 않습니다.** settings.json 명령의 `"$PROMPT"`는 빈 문자열로 전개됩니다. 실제 프롬프트는 **stdin JSON의 `.prompt`** 로 전달되며, `skill-activator.sh`가 이를 읽도록 설계돼 있습니다(인자 → stdin JSON → 원문 폴백). jq 미설치 시 grep/sed 폴백으로 동작합니다.
- **UserPromptSubmit hook의 stdout은 해당 턴의 컨텍스트로 주입**됩니다(스킬 추천이 모델에 전달됨).
- **hook 변경은 세션 재시작 후 반영**됩니다. 현재 세션에서 등록된 hook이 라이브로 발화하는지는 확인 불가 — 스크립트는 직접 실행으로 검증했습니다(아래 D).
- 키워드 매칭은 **ASCII 단어경계** 기준이라 영어 키워드가 더 긴 단어에 박혀 오탐("pr"⊂"improve")나는 것을 방지합니다. 한글 키워드는 부분문자열로 매칭합니다.

## C. 이름 충돌 (사용자 확인 필요)

기존 환경(전역/플러그인)에 같은 이름이 이미 존재하여, 프로젝트 파일이 이를 **재정의하거나 중복**됩니다.

- **에이전트 `verify-agent`**: 기존에 동일 이름의 에이전트가 존재 → 프로젝트 `.claude/agents/verify-agent.md`가 우선 적용(override). (그래서 "새 에이전트" 알림에는 나머지 4개만 표시됨.)
- **커맨드 `dev-docs` / `update-dev-docs` / `resume` / `save-and-compact`**: 동일 이름의 전역 스킬이 이미 존재 → 스킬 목록에 **각각 2개씩 중복** 표시. 가이드가 이 파일명을 명시적으로 요구하여 생성했으나, 중복 해소(프로젝트판 유지 vs 전역판 사용)는 사용자 선택 사항.
- 그 외 신규 에이전트(`primary-coordinator/code-explorer/code-reviewer/code-architect`)와 스킬(`apfs-bundle/dashboard-ui` + 프로젝트판 `code-reviewer`)은 충돌 없음. (플러그인 `ecc:*`는 네임스페이스가 달라 무관.)

## D. 검증 결과 (경험적)

- `settings.json`, `skill-rules.json` → `jq` 유효 JSON.
- hook 2개 → `bash -n` 문법 OK, `chmod +x`(rwxr-xr-x).
- `skill-activator.sh` → 가이드 입력 `"Create a React component"`에 `[SKILLS ACTIVATED] dashboard-ui` 출력(인자/stdin/no-jq 3경로), 오탐 케이스(`improve performance` 등) 침묵, 매칭 정확.
- `docs/Parallel_Agents_Safety_Protocol_v3_1_0.md` → 원본과 바이트 동일(49,277 bytes).
- `CLAUDE.md` → 기존 프로젝트 내용 보존 + 멀티에이전트 섹션 append(덮어쓰기 없음).
- 적대적 검증 워크플로(6차원 독립 검토): 5 PASS / 1 WARN → WARN(매칭 오탐·paste 구분자) 2건 모두 수정 후 재검증 완료.

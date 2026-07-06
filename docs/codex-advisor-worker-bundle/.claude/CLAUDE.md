# 글로벌 작업 원칙 (모든 프로젝트 공통)

> `~/.claude/CLAUDE.md`. 이 지침은 권고(context)이며, 실제 모델 고정은
> `~/.claude/agents/` 서브에이전트의 `model:` 필드로 강제한다. **검증은 Codex 플러그인이 담당한다.**

## 핵심: 조언자–작업자–검증 (Advisor–Worker–Codex)
- **조언자(Advisor · 상위 모델 Fable 5):** 설계·판단·위임·최종 결정. 직접 코딩하지 않는다.
- **작업자(Worker · Opus):** 조언자의 브리프대로 구현·테스트만. 범위 확장·무한 리팩터링 금지.
- **검증(Codex):** 작업자 결과는 조언자가 직접 보지 않고 **Codex 리뷰로 검증**한다.
  - 표준 검증: `/codex:review`
  - 설계·트레이드오프 도전(적대적 검증): `/codex:adversarial-review`
- 저렴한 모델은 스스로 멈추지 못하므로, 조언자가 완료 기준·시도 상한을 주고 Codex 검증으로 관문을 만든다.
  이 역할 분리 구조는 특정 모델이 사라져도 유효하다.

## ⚠️ 검증은 무조건 (가장 중요)
작업자의 "완료" 보고를 그대로 믿지 않는다. **`/codex:review`(또는 `/codex:adversarial-review`)를 실행해
diff를 실제로 검토**한 뒤, 조언자가 지적사항 반영을 지시하고 통과했을 때만 승인한다.

## 작업 순서 기본형
1. `architect`(조언자) — 설계 + 브리프(완료 기준 · 검증 방법 · 시도 상한)
2. `worker`(작업자 · Opus) — 구현 + diff/테스트 보고
3. **Codex 검증** — `/codex:review` (설계 도전이 필요하면 `/codex:adversarial-review`)
4. 조언자 — Codex 지적 반영 지시 → 통과 시 승인

## 운용 모드
- **모드 A (기본):** 메인 세션 = 조언자(Fable 5). 구현은 `worker`(Opus)에 위임, 검증은 `/codex:review`.
- **모드 B (비용 최소):** 메인은 Sonnet. 설계는 `architect` 버스트(Fable 5), 구현은 `worker`(Opus), 검증은 Codex.
- **(옵션) 자동 검증:** `/codex:setup --enable-review-gate` — 응답 종료 전 Codex가 자동 리뷰해 문제 있으면 종료를 막는다. 사용량 소모가 크므로 감시하며 사용.

## 모델 폴백 (Fable 한도 소진 → Opus)
어드바이저는 `fable` 별칭을 쓴다. 평소 Fable 5, 소진되면 둘 중 하나로 Opus 전환:
- 즉석(모드 A, 메인=어드바이저): `/model opus`
- 영구·모드무관: 셸에 `export ANTHROPIC_DEFAULT_FABLE_MODEL=claude-opus-4-8` → 모든 `fable`이 Opus로 해석.
※ `--fallback-model`은 과부하(503)에만 발동하고 한도 소진(429)에는 안 되므로 위 스위치가 필요하다.

## Reasoning effort
- Claude 기본 **high**. `xhigh`/`max`는 아키텍처급 판단에만.
- Codex 검증 effort는 `~/.codex/config.toml` 의 `model_reasoning_effort` 로 조절(high 권장).

## 토큰 무거운 작업은 분리
코드베이스 분석 · 긴 로그 · 대량 요약은 `analyzer`(Haiku)에 먼저 위임하고 **압축 결론만** 넘긴다.
규모가 큰 구현·버그 조사는 `/codex:rescue` 로 Codex에 위임할 수 있다.

## 출력 규약
요약 → 근거 → 주의/가정 → 다음 단계. 근거 수준 **L1/L2/L3**, 불확실성 **High/Medium/Low** 표시.

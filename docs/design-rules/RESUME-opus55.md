# RESUME — 규칙 초안 마무리 (APFS)

- 책임 역할: Designer / 실행 환경: Orca + Claude Code
- 원 브리프: `docs/design-rules/BRIEF-opus55-design-defaults.md` (범위·금지 사항·완료 조건은 그대로 유효)

## 상황
직전 실행이 Claude 사용량 한도(429)로 18턴째 중단됐다. 다음 파일이 **미커밋·미검증** 상태로 남아 있다:
- `docs/design-rules/frontend-design-defaults.md` (초안)
- `docs/design-rules/REPORT-opus55-design-defaults.md`
- `docs/design-rules/PROGRESS.md` (체크 0건)

## 할 일 (처음부터 다시 쓰지 말 것)
1. 두 파일을 읽고, 원 브리프 3절 요구사항 대비 빠진 항목만 보완한다.
2. REPORT·초안에 인용된 **모든 파일:라인 근거를 grep/Read로 재확인**한다. 틀린 근거는 고치고, 확인 불가하면 "현재 없음" 또는 "확인 필요"로 바꾼다. 존재하지 않는 토큰·컴포넌트 이름이 인용돼 있으면 제거한다.
3. 초안이 60줄 이내인지 확인한다.
4. PROGRESS.md 체크리스트를 실제 상태로 갱신한다.
5. 범위 검사 후 경로 지정 커밋: `git add docs/design-rules && git commit -m "docs(design-rules): Opus 5.5 frontend design defaults draft" -- docs/design-rules`
6. `git diff --name-only main..HEAD | grep -vc '^docs/design-rules/'` 가 0, `git status --short` 가 비었는지 확인한다.

턴 예산 20. 남은 턴이 5 이하가 되면 보완을 멈추고 PROGRESS에 미완료 사유를 적고 커밋한다.

## 최종 메시지
수정한 근거 수(틀렸던 것/확인 불가) / 금지 패턴 수와 그중 현재 코드에 이미 있는 수 / 검증 명령 결과 / 확인 필요.

# 출처 (vendored)

- 저장소: https://github.com/Jakubantalik/transitions.dev — `skills/transitions-dev/`
- 고정 커밋: `598d3d6ad89dabb4bdf742fd2e887ca53914a888` (2026-09-18 벤더링)
- 사이트: https://transitions.dev/skill.html (설치 안내 원문: `npx skills add Jakubantalik/transitions.dev`)
- 라이선스: 저장소 루트에 LICENSE 파일·`license` 필드 없음. MIT 선언은 `cli/`·`cli-legacy/`·`refine/`의 `package.json` 3곳뿐. `skills/` 문서 자체의 라이선스는 명시되지 않음 — 외부 재배포·템플릿 확산 전 저장소 소유자에게 확인 필요.

## 로컬 변경분 (원문과 diff 시 참고)
- `SKILL.md` 프런트매터 바로 아래 `## ⚠️ APFS 적용 규약` 절을 **추가**했다. 그 아래 본문은 원문 그대로다.
- `SKILL.md` 프런트매터 `description` 끝에 APFS 범위 문장 한 줄 추가.
- 그 외 파일(`_root.css`, 레시피 `NN-*.md`, `_refine-rules.md`)은 원문 그대로.

## 갱신 절차
```
gh api repos/Jakubantalik/transitions.dev/tarball/main > /tmp/t.tgz && tar xzf /tmp/t.tgz -C /tmp
diff -r /tmp/Jakubantalik-transitions.dev-*/skills/transitions-dev .claude/skills/transitions-dev
```
원문 파일은 덮어쓰고, `SKILL.md`는 APFS 절만 보존한 채 아래 본문을 교체한다. 그런 뒤 이 파일의 고정 커밋을 갱신한다.

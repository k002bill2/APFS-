---
allowed-tools: Bash(git:*), Read, Write
description: 작업 상태 저장/복원 (WIP 커밋, 워크트리 전용)
argument-hint: [save|restore] [설명]
disable-model-invocation: true
---

# WIP Save/Restore

작업 중간 상태를 WIP 커밋으로 저장하고 복원합니다. (네이티브 `/checkpoint`(rewind)와 이름이 겹쳐 `/wip-save`. 커밋 접두어 `checkpoint:` 는 호환을 위해 유지.)

## 전제

워크트리 브랜치에서만 쓴다. `main` 이면 중단 — 가드가 막고, 막히지 않더라도 공유 체크아웃을 보는 다른 세션의 dev 서버(:5273)가 흔들린다.

## Save

1. `git branch --show-current` — `main` 이면 중단
2. `git status --short` 로 대상 확인 후 **명시 경로** staging (`git add -A` 금지). 한글 경로는 명령에 한글이 안 나오게: 디렉터리 단위 add 는 **먼저 `git status --short -- <dir>` 로 그 디렉터리에 이번 작업 파일만 있는지 확인한 뒤에만** 쓴다 — 수정·삭제만이면 `git add -u <dir>`, 신규(untracked) 포함이면 `git add -- <dir>/`(`-u` 는 신규 파일을 잡지 못한다). 다른 작업 파일이 섞여 있으면 디렉터리 add 를 쓰지 말고 사용자에게 알린다. staging 후 `git status --short` 로 누락·혼입 확인
3. `git commit -m "checkpoint: <설명 또는 자동 생성>"`

## Restore

```bash
git log --oneline --grep="checkpoint:" -5
git reset --soft <checkpoint-hash>
```

`--soft` 라 변경은 staging 에 남는다. **푸시된 checkpoint 는 reset 하지 않는다**(공개 이력 재작성).

## 사용 시점

- 큰 작업 중 중간 저장, 위험한 변경 전 안전망
- 컨텍스트 예산 경고 시 상태 보존(전역 CLAUDE.md "컨텍스트 예산" 절 — `/save-and-compact`·dev-docs 와 병행)

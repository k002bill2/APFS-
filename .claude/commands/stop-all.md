---
name: stop-all
description: APFS dev 서버 중지 (공유 체크아웃 :5273 / 워크트리 포트). 다른 세션 서버일 수 있어 확인 후 종료.
allowed-tools: Bash(lsof:*), Bash(ps:*), Bash(kill:*), Bash(bash scripts/wt.sh ls)
disable-model-invocation: true
---

# Stop Dev Server

APFS는 백엔드·DB가 없어 멈출 것은 **Vite dev 서버**뿐입니다. 다만 멀티세션 환경이라 떠 있는 서버가 **다른 세션 것**일 수 있습니다.

## 절차

1. **떠 있는 서버 확인**
   ```bash
   lsof -nP -iTCP:5273 -sTCP:LISTEN          # 공유 체크아웃(main)
   bash scripts/wt.sh ls                      # 워크트리별 포트(5300~5389)
   ```
2. **소유 확인** — 각 PID 의 작업 디렉터리를 본다:
   ```bash
   lsof -a -p <PID> -d cwd -Fn | tail -1
   ```
   이 세션이 띄운 서버가 아니면 **사용자에게 확인**받고 멈춘다.
3. **종료**
   ```bash
   kill <PID>       # SIGTERM 먼저. -9 는 응답 없을 때만
   ```
   이 세션이 `run_in_background` 로 띄운 서버라면 그 태스크를 중단하는 것으로 충분하다.

## 참고

- 인자 없이 "전부 끄기"는 하지 않는다 — 다른 세션 작업 화면이 사라진다.
- 다시 띄우기: `/start-all`(공유 체크아웃) 또는 `bash scripts/wt.sh dev <branch>`.

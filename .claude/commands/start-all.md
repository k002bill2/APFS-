---
name: start-all
description: APFS 대시보드 화면 띄우기 (Vite dev 서버). 이미 떠 있으면 URL만 안내.
allowed-tools: Bash(npm run dev), Bash(curl:*), Bash(lsof:*)
disable-model-invocation: true
---

# APFS 화면 띄우기

APFS는 백엔드 없는 프론트엔드 SPA(더미데이터 `src/dash/data.ts`)라, 띄울 서비스가
**Vite dev 서버 하나**뿐입니다. Agent-System의 `/start-all`(pg+redis+backend+dashboard
오케스트레이션)과 달리 단일 프로세스입니다.

## 절차

1. **이미 떠 있는지 먼저 확인** (5273 점유 여부):

   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:5273
   ```

   - `200` 이면 → 이미 실행 중. 아래 URL만 사용자에게 안내하고 **새로 띄우지 말 것**.
   - 응답 없음/연결거부 → 2단계로.

2. **dev 서버 시작** (백그라운드):

   ```bash
   npm run dev
   ```

   `run_in_background: true` 로 실행. `Port ... already in use` 에러가 나면
   이미 떠 있는 것이므로 1단계 결과대로 URL만 안내.

## 접속 URL

| 서비스 | URL |
|--------|-----|
| APFS 대시보드 (Vite) | http://localhost:5273 |

빌드 결과 미리보기가 필요하면 `npm run build && npm run preview` → http://localhost:4273

## 참고

- 테마/역할/Tweaks 설정은 `localStorage`에 영속화됩니다.
- 서버 중지: 실행한 백그라운드 태스크를 중단하거나, `lsof -ti:5273 | xargs kill`.

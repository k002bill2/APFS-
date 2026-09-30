# APFS 대시보드

**농림수산식품모태펀드 투자자산관리시스템**(Agriculture·Forestry·Fisheries Food Fund Investment Asset Management System)의 대시보드 UI 프로토타입입니다.

백엔드 없이 더미 데이터(`src/dash/data.ts`의 `APFS_DATA`)로 모든 화면이 완결되는 프론트엔드 SPA입니다.

## 빠른 시작

요구사항: **Node.js 22 이상**, npm 11.

```bash
npm ci          # 의존성 설치
npm run dev     # 개발 서버 → http://localhost:5273
```

| 명령 | 하는 일 |
|------|---------|
| `npm run dev` | Vite 개발 서버 (포트 **5273** 고정, `strictPort`) |
| `npm run build` | 프로덕션 빌드 → `dist/` |
| `npm run preview` | 빌드 결과 미리보기 (포트 4273) |
| `npm test` | Vitest 1회 실행 |
| `npm run test:watch` | Vitest 감시 모드 |

> `vite build`는 esbuild로 트랜스파일만 하고 타입체크를 하지 않습니다. `tsc --noEmit`은 현재 타입 에러를 다수 보고하지만 빌드는 통과합니다.

## 기술 스택

- **빌드**: Vite + React 18 + TypeScript (`strict: false`)
- **스타일**: Tailwind CSS (preflight off) + CSS 변수 토큰(`src/dash/tokens.css`), 라이트/다크 테마
- **UI**: shadcn/ui(Radix) 기반 공용 컴포넌트(`src/dash/ui/`), lucide 아이콘
- **그리드**: AG Grid Community, Excel 내보내기는 SheetJS
- **에디터**: Plate(v53) 리치텍스트
- **테스트**: Vitest
- **폰트**: Pretendard

## 디렉터리 구조

```
├── index.html              # Vite 엔트리 (#root + 테마 복원 인라인 스크립트)
├── src/
│   ├── main.tsx            # 엔트리: tailwind.css + tokens.css + app
│   └── dash/
│       ├── app.tsx         # 앱 루트 — 테마/라우트 상태
│       ├── data.ts         # APFS_DATA (메뉴/위젯/지표 더미 데이터)
│       ├── shell.tsx       # GNB / LNB(3-레벨) / 브레드크럼 / 알림센터
│       ├── schemas/        # 스키마 주도 리스트 화면 정의(PageSchema)
│       ├── ui/             # 공용 UI 컴포넌트
│       └── *.tsx           # 대시보드·업무 페이지·인증 화면
├── docs/                   # PRD, 메뉴구성도, 디자인·접근성·토큰 규약
└── scripts/                # 워크트리 도구(wt.sh), 메뉴 문서 생성기 등
```

## 화면 구성

- **메뉴**: 신규(to-be) 메뉴구성도 기준 3-레벨 — 대분류 7(+대시보드) / 중분류 32 / 리프 137개.
  정본은 `docs/source/`의 프로젝트일정계획표 xlsx 「메뉴구성도」 시트이고, 추출본은 [`docs/메뉴구성도_v0.2.md`](docs/메뉴구성도_v0.2.md)입니다.
- **메인 대시보드**: 투자 성과, 조기경보 리스크, 회계·자금 마감, 일정·알림 등 종합 위젯
- **인증 화면**(Shell 없는 독립 라우트): `#/login` · `#/onboarding-issue` · `#/onboarding-invite`

## 배포

`main` 브랜치에 push하면 **Vercel**이 `vite build` 후 `dist/`를 자동 배포합니다(`vercel.json`: `framework=vite`).

## 개발 규약

여러 세션이 동시에 작업하는 저장소입니다. **공유 체크아웃은 `main`에 두고, 브랜치 작업은 워크트리에서 합니다.**

```bash
bash scripts/wt.sh new <branch>   # .claude/worktrees/<branch> 생성 + node_modules 복제 + 포트 배정
bash scripts/wt.sh dev <branch>   # 배정된 포트(5300~5389)로 dev 서버 실행
bash scripts/wt.sh ls             # 워크트리 목록
bash scripts/wt.sh rm <branch>    # 워크트리 제거
```

- 색·간격·타이포는 하드코딩하지 말고 `tokens.css`의 CSS 변수를 씁니다 → [`docs/COLOR_TOKENS.md`](docs/COLOR_TOKENS.md)
- 새 화면은 라이트/다크 대비, 반응형, 접근성을 확인합니다 → [`docs/A11Y.md`](docs/A11Y.md)
- 자세한 작업 안내는 [`CLAUDE.md`](CLAUDE.md)를 참고하세요.

## 참고 문서

| 문서 | 내용 |
|------|------|
| [`docs/PRD_농림수산식품모태펀드_투자자산관리시스템_재구축_1단계.md`](docs/PRD_농림수산식품모태펀드_투자자산관리시스템_재구축_1단계.md) | 제품 요구사항(PRD) |
| [`docs/메뉴구성도_v0.2.md`](docs/메뉴구성도_v0.2.md) | 메뉴 트리와 화면 목업 링크 |
| [`docs/DESIGN.md`](docs/DESIGN.md) | 디자인 시스템 |
| [`docs/DEV_ENVIRONMENT.md`](docs/DEV_ENVIRONMENT.md) | 개발 환경 |

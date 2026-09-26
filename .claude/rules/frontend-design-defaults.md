---
paths:
  - "src/**"
---
# 프론트엔드 디자인 기본값 규칙 (APFS)

엔터프라이즈 자산운용 화면이다: 절제·고밀도·명확한 계층. "AI 느낌 피하기" 같은 일반 지시 대신 아래 목록을 따른다.
근거(파일:라인)·예외 사유는 `docs/design-rules/REPORT-opus55-design-defaults.md`.

## 금지 (신규 작업 규칙 — 기존 화면은 사용자 지시 없이 고치지 않는다)
1. 크림·오프화이트·베이지 페이지 배경 → 배경은 `--bg`/`--card` 만.
2. 헤드라인 이탤릭 강조어(`<em>`/italic 한 단어 강조).
3. "01/02/03" 식 섹션 번호 라벨·장식 스텝 번호.
4. 장식용 monospace 라벨·kicker. (예외: 코드값·인증코드처럼 값 자체가 코드인 경우)
5. pill 버튼(`rounded-full` 버튼·CTA). `rounded-full` 은 점·진행바·카운트 배지에만.
6. 그라데이션 배경·hero 배너(보라–파랑·인디고–틸 선형/방사형, 광택 오버레이 포함). `--gradient-hero` 토큰은 기존 메인 Hero 전용 — 신규 화면에서 쓰지 않는다.
7. 글래스모피즘(`backdrop-filter: blur`, 반투명 유리 카드).
8. 장식 일러스트·3D/광택 아이콘 타일·blob·의미 없는 hero 그림.
9. 인페이지 카드에 `shadow-md`/`shadow-lg`. (예외: dialog·popover·sheet·메뉴·토스트 등 오버레이 elevation)
10. 이모지 아이콘(UI 텍스트·버튼·빈 상태). 아이콘은 `Icon`(icons.tsx)/lucide.
11. `uppercase` + 넓은 자간 eyebrow/kicker 라벨. (예외: 메뉴 단축키 힌트 `DropdownMenuShortcut`)
12. 그라데이션 텍스트(`bg-clip-text text-transparent`).
13. 색 좌측 스트라이프 강조 카드(`border-l-4` 컬러). 구분선용 1px 중립 `--border` 는 허용.
14. hex·rgba 리터럴 색 → `color-tokens` 스킬 규약. 예외 목록은 그 스킬의 '정당한 hex 예외' 절이 정본(로고 SVG·`tweaks.css`·`index.html` 부트·DS hex 라벨·scrim rgba). 기존 에디터 글자색 팔레트·외부 위젯 테마 주입은 현행 유지.
15. 상태 배지 앞 점(bullet) — 이미 폐지됨(가드 `status_badge_no_dot.test.ts`).

## 대신 이것을 쓴다 (Do)
- **색**: 표면 `--bg` `--card` `--muted`, 글자 `--foreground` `--muted-foreground` `--caption`, 선 `--border` `--border-strong`.
  역할 `--primary`(주 액션) `--accent`(링크·강조) `--ring`(focus). 흰 글자 얹는 고정 표면은 `--brand-solid`+`--on-brand-solid`.
- **상태색**: 칠(점·막대·아이콘)은 `--success/--warning/--danger/--info`, 텍스트·배지 라벨은 `-text`, 배경은 `-soft`.
- **타이포**: Pretendard(`--font-sans`) 단일. 크기 계층은 `.t-h1` `.t-h2` `.t-cardtitle` `.t-body` `.t-label` `.t-caption`.
  `.t-display`(34px)는 KPI 대표값 한정. 굵기로 강조하고 이탤릭·자간 확대로 강조하지 않는다.
- **간격**: 간격 토큰 부재(Tailwind 기본 스케일 사용 중) — 신설 필요 여부 확인 필요. 새 화면은 인접 화면 값을 따른다.
- **모서리·그림자**: `rounded-card`(12) `rounded-card-sm`(8) `rounded-card-lg`(16). 인페이지 카드 `shadow-sm` 이하.
- **버튼**: `UI.Button` variant `primary`·`outline`·`ghost`·`secondary`·`accent`, size `sm/md/lg`. 새 버튼 컴포넌트를 만들지 않는다.
- **카드·페이지 골격**: 대시보드 `UI.Card`/`UI.ChartCard`/`UI.StatCard`, 리스트·그리드 `GridFrame`+`KpiBadge`(apfs-grid 스킬).
- **표·수치**: AG Grid 는 `apfsTheme`(tabular-nums 내장), 금액·수량 컬럼 `type:'rightAligned'`. 표 밖 수치는 `.tabular`+우측 정렬.
  헤더 `--grid-header`, 행 선택 `--row-selected`. 단위는 값 옆 작은 `muted-foreground` 텍스트.
- **상태 화면**: 빈 `UI.EmptyState`, 로딩 `PageSkeleton`/`Skeleton`/`Spinner`, 오류·경고 `Alert`(variant `destructive`/`warning`/`info`).
- **모션**: `duration-tok-fast`/`duration-tok` + `ease-ds`. 장식 목적의 새 애니메이션을 추가하지 않는다.

## 반복 절차
첫 결과물에서 위 목록 대신 어떤 기본 스타일이 나왔는지 확인하고, 반복되면 이 목록에 구체 패턴으로 추가한다.

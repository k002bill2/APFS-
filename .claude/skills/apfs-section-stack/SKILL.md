---
name: apfs-section-stack
description: APFS 다단(멀티 섹션) 그리드 페이지 레이아웃 규약 — 한 GridFrame/RiskPage 카드 안에 "섹션 제목 + 표/차트/카드"를 세로로 여러 단 쌓는 화면의 정렬 규칙. 섹션 제목은 공용 SectionHead(번호 배지 없음·좌측 4px), 본문은 좌우 padding 0 으로 섹션 끝선까지 채운다. 다단 그리드·섹션 여러 개·표 여러 개 적층·2단 차트 패널·섹션 헤더·섹션 제목 정렬·번호 배지·좌우 padding 어긋남 작업 시 사용. Use when building or fixing a page that stacks multiple titled sections (grids, charts, cards) inside one frame.
---

# apfs-section-stack Skill

## 컨텍스트
한 카드(GridFrame / RiskPage) 안에 섹션을 세로로 여러 단 쌓는 화면이 있다 — 예: 조기경보 결과정보 관리(표 2단), 운용사 유형별 정량지표 변동 조회(섹션마다 2열 차트 패널), 자펀드 종합등급 변동 조회(표 + 도넛 카드). 2026-09-24 사용자 지시로 **섹션 제목과 본문의 좌측 끝선을 맞추는 규약**을 정했다.

어긋남의 원인은 두 군데에서 온다 — ① 섹션 제목의 18px 들여쓰기 + 번호 배지, ② 본문 래퍼의 좌우 padding(18px·2px). 한쪽만 고치면 반대로 어긋난다(일일보고 조회 탭 실사례 — 탭은 #272 로 삭제됨: 제목만 4px 로 당겼더니 18px 들인 표보다 바깥으로 나옴).

- 섹션 제목 정본: `src/dash/risk_grid.tsx` `SectionHead`
- 골드 예시: `gp_type_indicator_trend.tsx`(2열 차트 패널) · `subfund_grade_trend.tsx`(표 + 카드) · `risk_tables_page.tsx`(표 N단) · `ew_result_manage.tsx`(표 2단 + 섹션 우측 액션)
- 프레임(PageHeader·툴바·푸터)은 `apfs-grid`, 표 본체는 `apfs-aggrid` 스킬 담당 — 이 스킬은 **프레임 안 섹션 적층 정렬만** 다룬다.

## 규약

| 요소 | 규칙 |
|------|------|
| 섹션 제목 | 공용 `SectionHead` 사용(`import { SectionHead } from './risk_grid'`). padding `12px 18px 12px 4px` + `borderTop` 구분선 |
| 번호 배지 | **쓰지 않는다**(①②③ 칩 금지). `SectionHead` 에 `n` prop 없음. 목업에 번호가 있어도 사용자 결정이 우선 |
| 본문(표·차트·카드) | 좌우 padding **0** — 섹션 끝선까지 채운다. 하단 간격만 `padding: '0 0 18px'` |
| 결과 정렬 | 본문 좌측 = 섹션 좌측, 제목 글자 좌측 = 섹션 좌측 + 4px |
| 우측 액션 | `SectionHead actions={…}` 슬롯(`ml-auto`). 제목 우측 padding 18px 은 액션 여백이라 유지 |
| 캡션 | `cap` 슬롯(건수·기준년월·차트 부제). 12.5px `text-caption` |

```tsx
{SECTIONS.map((sec) => (
  <section key={sec.id} aria-label={sec.title}>
    <SectionHead title={sec.title} cap={sec.caption} />
    {/* 2열 패널 — 모바일 1열, xl 에서 2열 */}
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2" style={{ padding: '0 0 18px' }}>
      {sec.panels.map((p) => <Panel key={p.id} {...p} />)}
    </div>
  </section>
))}
```

표만 쌓는 경우(AG Grid / ReadGrid)는 래퍼 없이 `SectionHead` 바로 뒤에 그리드를 둔다 — 그리드 자체가 좌우 padding 이 없다.

## 하지 말 것
- **로컬 `SectionHead` 복사 금지.** `ew_result_manage.tsx`·`custody_verify_manage.tsx` 에 과거 복사본이 남아 있다(같은 규칙으로 맞춰 둠). 신규 페이지는 공용을 import 한다 — 복사본은 규약이 바뀔 때 누락된다(이번 전수조사에서 2곳 수동 수정).
- 제목만 당기고 본문 padding 을 남기지 말 것(역방향 어긋남). 둘을 **한 쌍으로** 고친다.
- `flush` 같은 페이지별 옵션으로 분기하지 말 것 — 모든 호출처가 같은 규칙이면 기본값이 규칙이다.
- 섹션 제목을 `<h3>`/`<p>` 로 따로 만들지 말 것 — 13.5px 제목은 다른 다단 화면(15px)보다 작아 보인다. 설명 문구는 `cap` 으로 넣는다(`gp_early_warning.tsx` 가 이 방식으로 전환됨, 2026-09-24).
- `preflight:false` — `h3/h4/p` 는 UA 마진이 살아 있어 `m-0`(또는 margin 명시) 필수.

## 검증 (필수 — 코드 리딩만으로 통과 판정 금지)
ego-browser 로 1440px 에서 섹션 제목 글자·본문 좌측을 실측한다. 기대값: `h4 left = section left + 4`, `grid/panel left = section left`, 가로 넘침 없음.

```js
// ego-browser nodejs < script.js  (뷰포트: page.cdp('Emulation.setDeviceMetricsOverride', {width:1440,...}))
const r = await page.evaluate(() => {
  const sec = document.querySelector('main section');
  const h4 = document.querySelector('main h4');
  const body = [...document.querySelectorAll('main .ag-root-wrapper, main table, main section > div.grid')][0];
  const L = (e) => e && Math.round(e.getBoundingClientRect().left);
  return { sec: L(sec), title: L(h4), body: L(body), scrollX: document.documentElement.scrollWidth > innerWidth };
});
```
- 해시 route 는 `goto` 후 `location.reload()` 필요(메모리 `ego-browser-state-across-invocations`).
- 탭(LeafTabs) 안에 있는 다단 화면은 탭 클릭 후 측정.
- 라이트/다크 둘 다 스크린샷 확인. 400px 폭에서 2열 패널이 1열로 접히는지도 본다(`responsive-ui`).

## 적용 현황 (2026-09-24 전수조사)
정량지표 변동 조회 · 자펀드 종합등급 변동 조회 · 조기경보 결과정보 관리 · 운용사별 조기경보 조회 · 모태펀드 가치평가 결과조회 · 자펀드 투자자산 및 거래내역 조회 · 예외사항리포트 · Portfolio Report · 자펀드수탁관리(실물검증). 새 다단 화면을 찾을 땐 `grep -rn "<SectionHead" src/dash` 로 호출처를 전수 확인한다.

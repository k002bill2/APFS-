# 참고문서 — Excel 내보내기 "콘텐츠/헤더 강화" 검토

> **무엇**: APFS 3화면(`asset_funding_aggrid`·`generic_list`·`performance`)의 `.xlsx` 내보내기에 리포트 제목·메타·필터·KPI 등을 더 얹을 수 있는지 검토한 결과.
> **생성**: 2026-06-25 · 멀티에이전트 워크플로(`excel-export-enrichment-review`, 12 agents, write→read 왕복 실증) 산출물.
> **상태**: 검토 완료 / **구현 보류** (향후 개발 참고용).

## ⓘ 먼저 알 것 (혼동 방지)
- **이미 반영된 별건**: "숫자 컬럼 우측정렬"(숫자 셀 `t:'n'`+`z` 전환) 수정은 **이미 커밋됨 → `47c35af feat(excel)`**. 본 문서가 다루는 "콘텐츠 추가"와 다른 작업이다.
- **본 문서 범위**: 제목/브레드크럼/생성일시/적용필터/KPI/건수/Props 등을 **헤더·푸터·요약시트로 추가**하는 강화(미구현 제안).

## TL;DR (구현 시작점)
- **가능 여부**: 텍스트·병합·다중시트·Props·숫자서식·autofilter 범위 = 현재 `xlsx@0.18.5`로 **가능**. **굵게·색·테두리·가운데정렬·freeze = 불가**(`.s` 스타일 미지원, 앞선 정렬 실증으로 입증).
- **권고안**: **C(최소 침습)** — `sheet_add_aoa(ws, [...메타], { origin: -1 })`로 표 아래 메타 푸터 append + `wb.Props`. `!ref`만 자동 확장되고 2단 병합헤더·`z`서식 좌표 **불변**(실행 확인). effort **S**, 라이브러리 교체 불필요.
- **반드시 주의**: ① export엔 `MT` 금지(Excel에선 빈 셀) → 리터럴 평문. ② `mn()`은 숫자만 가림 → **텍스트 필터/KPI 값은 평문 노출**되니 "라벨만 싣고 값 생략" 또는 기존 한계 수용. ③ 생성일시는 `_on=true` 동안 **생략 권장**(나머지가 0인데 시각만 진짜면 비일관).
- **라이브러리 교체 분기점**: 굵은 제목/음영/테두리/병합셀 가운데정렬 필요 → `xlsx-js-style`(드롭인). 틀고정·차트·조건부서식 → ExcelJS.

---

# 엑셀 내보내기 콘텐츠 강화 검토 보고서

## 1. 한 줄 결론

**조건부 가능 — "구조·콘텐츠·서식(텍스트/숫자)" 레이어는 현재 라이브러리(`xlsx@0.18.5` 커뮤니티 빌드)만으로 100% 추가 가능하나, "시각 스타일(굵게·색·테두리·정렬)과 틀 고정(freeze)"은 불가하여 이를 요구할 때만 라이브러리 교체가 필요하다.** 제목·브레드크럼·생성일시·적용필터·KPI·건수 등 메타데이터를 헤더/푸터/요약시트로 얹는 것은 모두 가능하고, write→read 왕복 실증으로 보존이 확인되었다.

---

## 2. `xlsx@0.18.5` 커뮤니티 빌드 — 되는 것 vs 안 되는 것

| 기능 | 가능 | 근거(왕복 실증) |
|---|:---:|---|
| 표 위/아래 제목·메타 텍스트 행 | ✅ | A1~A4에 텍스트 배치 후 read 시 값 보존 (probe #1) |
| 셀 병합 `!merges` (제목 가로병합 등) | ✅ | 6개 병합 설정→encode_range 되돌림 동일 (probe #2) |
| 2단(멀티로우) 헤더 | ✅ | 그룹헤더 병합 + 하위헤더 텍스트 조합 (probe #3 = #1+#2) |
| 자동필터 **범위** `!autofilter` | ✅ | `{ref:'A5:E7'}` 보존 — 단 범위 메타일 뿐 정렬·필터 적용 상태 아님 (probe #5) |
| 열너비/행높이 `!cols`·`!rows` | ✅ | 보존(read 시 wpx/hpx로 단위 정규화) (probe #6) |
| 다중 시트(커버/요약 + 데이터) | ✅ | `SheetNames` 순서·이름·내용 보존 (probe #7) |
| 워크북 Props(Title/Author/Subject/Company/CreatedDate) | ✅ | docProps/core·app.xml 기록 보존 (probe #8) |
| 숫자서식 `z`(콤마 `#,##0`·퍼센트 `0.0%`) | ✅ | `z`·표시문자열 `w` 모두 보존 — **단 진짜 number 셀(`t:'n'`)에만 적용** (probe #9) |
| 하이퍼링크 `l`(Target/Tooltip) | ✅ | 외부 링크 sheet rels 기록 보존(내부 시트참조 `#시트!A1`은 미실증) (probe #10) |
| **틀 고정(freeze pane) `!freeze`** | ❌ | writer가 `!freeze`를 **완전히 무시**(소스 참조 0건, 출력 `sheetViews`에 `<pane>` 미생성). read 한계가 아니라 **쓰기 불가** (probe #4) |
| **셀 채움색(fill)·굵게(bold)·폰트·테두리(border)** | ❌ | 커뮤니티 write는 셀 스타일(`.s`) 미지원 |
| **가운데정렬(center alignment)** | ❌ | 정렬도 스타일 객체 필요 → 미지원. (우측정렬은 숫자셀 `t:'n'`로 **자동** 획득, 별도 비용 없음) |

> ⚠️ **주의 박스 — 스타일/틀고정을 요구하면 라이브러리 교체 트리거**
> 아래 항목은 본 검토의 모든 설계안이 **명시적으로 scope-out** 한 것들이다. 하나라도 "필수 요건"으로 격상되면 그 항목만 `xlsx-js-style` 또는 `ExcelJS`로 교체가 필요하다:
> - 굵은 리포트 제목 / 헤더 음영(배경색) / 메타블록 강조 배경
> - 표·블록 테두리 박스
> - 병합셀 내부 가운데정렬 — 데이터 시트 그룹헤더 `'조성현황'(B1:G1)`·`'출자현황'(H1:I1)`이 병합 안에서 **좌측에 붙어 "미완성처럼" 보이는** 가장 가시적 증상
> - 상단 헤더 행 틀고정(freeze)

---

## 3. 추가 가능한 콘텐츠 — 화면별 (마스킹 여부 포함)

마스킹 규약(`mask.tsx`, `_on=true` 상시 ON): `mn(v)`는 **숫자 문자만** `0`으로 치환(서식기호·단위 보존), `<MT>`는 화면에서 회색 스켈레톤 — **Excel에는 존재할 수 없으므로 export엔 리터럴 평문으로 기입해야 함.** 원칙은 "축은 두고 데이터는 가린다".

| 콘텐츠 | asset_funding_aggrid | generic_list | performance | 마스킹 |
|---|---|---|---|---|
| 리포트 제목 | `title`(:270) 리터럴 | `findMenuContext.title`(:293) | 카드제목 리터럴(:343, MT 우회) | **비마스킹** |
| 브레드크럼 | `crumbs`(:269) | `crumbs`(:293) | `crumbs`(:333) | **비마스킹**(shell raw 렌더) |
| 생성일시 | `new Date()` 신규 | `new Date()` 신규 | `new Date()` 신규 | **비마스킹**(§아래 단서) |
| 적용필터 — 라벨 | '사업연도'/'출자금액 최소' | `chipItems` 라벨 | period/assets/risk 라벨 | **비마스킹** |
| 적용필터 — 값 | `fYear`/`fMin`(:182-3) | `chipItems` 값 | applied 값 | **마스킹**(단서 ↓) |
| 건수(총/표시) | `totalForCount`/`shown` | `total`(:314) | 1208(하드코딩)/`filtered.length` | **마스킹** |
| KPI 라벨·단위(억원/개) | 누적 조성총액 등 | 합계금액/평균변동률 | 일일수익률/순자산 | **비마스킹** |
| KPI 수치 | `c0/u1/u0`(:57) | `sumAmount`/`avgChange` | StatPill 값(:346-7) | **마스킹** |
| 컬럼/그룹 헤더·단위 | head1/head2(이미 평문) | label+unit(이미 보강됨) | 인라인 단위 | **비마스킹** |
| 데이터 기준일(provenance) | — | `schema.provenance.capturedAt` (DEFAULT는 `''`→가드) | — | **비마스킹** |
| 엔티티명 | — | `schema.entity`(예 '모태펀드') | — | **비마스킹** |
| 워크북 Props 메타 | Title/Author/CreatedDate | 동일 | 동일 | **비마스킹** |

> ⚠️ **검증에서 정정된 핵심 사실 (과장 금지)**
> **(a) 비숫자 필터 값은 `mn()`으로 가려지지 않는다.** `mn()`은 숫자만 `0`치환하므로 `'일반회계'`·`'당기 회계연도'`·자산유형 `'주식/채권'`·텍스트 KPI `'낮음'`(performance:493) 같은 **텍스트 값은 평문 그대로 노출**된다. 화면에선 `<MT>`로 가려지지만 Excel엔 MT가 없다. → 텍스트 데이터 값을 가릴 수단은 없으므로, 누출을 피하려면 **"라벨만 싣고 값은 생략"**하거나 본문 export의 기존 한계(`cell()→mn()`)와 동일하게 수용한다. (숫자형 KPI·건수·연도·금액은 `mn()`으로 정상 마스킹됨.)
> **(b) 생성일시 비마스킹은 "확정된 합의"가 아니라 "정책 선택"이다.** survey 내부에서 asset_funding은 `maskNeeded:true`(보수적), generic/performance는 `false`로 **분류가 어긋나 있다.** `mn()`을 타임스탬프에 먹이면 `'0000-00-00 00:00'`으로 무의미해지므로 비마스킹이 실무적으로 옳으나, 이는 asset survey의 보수적 판정을 뒤집는 결정임을 명시해야 한다. **권장: `_on=true` 미연동 구간에는 생성일시를 아예 생략**(KPI·건수가 전부 0인데 타임스탬프만 진짜인 비일관 회피).

---

## 4. 설계안 3종 비교 + 권고

| | A. 리포트 헤더 블록(동일 시트) | B. 커버/요약 시트 + 데이터 시트 | C. 최소 침습(메타 푸터 + 단위 보강) |
|---|---|---|---|
| **mockup 요약** | 표 **위**에 제목→브레드크럼→생성일시→필터→건수→KPI 6행 + 빈행, 그 아래 기존 표 | 시트1=요약(메타 세로 블록), 시트2=데이터(기존 표 이관) | 표 **아래** `sheet_add_aoa(...,{origin:-1})`로 메타 푸터 append + Props |
| **작업량** | **M**(미통합 시 L) | **M** | **S** |
| **community만으로 가능** | ✅ (freeze 제외, autofilter로 대체) | ✅ (freeze·스타일 제외) | ✅ |
| **좌표 재계산 리스크** | **높음** — asset 화면 헤더블록 K행 삽입으로 `!merges` r좌표·`z`서식 `r:i+2`·autofilter ref가 모두 +K 시프트. 한 곳 누락 시 병합 어긋남/서식 밀림 | **없음** — 메타가 별도 시트라 데이터 시트 좌표 무변(가장 안전) | **없음** — append가 `!ref` 자동확장, 기존 `!merges`/`z`서식 좌표 무변(실행으로 `A1:I4→A1:I9` 확인) |
| **검증 verdict** | sound | sound | sound |
| **주요 약점** | 좌표 회귀 위험 + MT 오용 위험 | "정식 리포트형" 라벨이 polish 과대약속(시각적으로 평면) | 메타가 본문과 같은 시트 → 데이터 오인 가능 |

### 권고: **C(최소 침습) 를 1차 채택**, 향후 B로 확장 여지 유지

근거:
1. **작업량 S**, **좌표 재계산 0** — `origin:-1` append가 `!ref`만 확장하고 asset 화면의 2단 병합헤더·`z`서식 좌표를 전혀 건드리지 않음(검증에서 실행으로 확인). A안의 최대 리스크(좌표 회귀)를 원천 제거.
2. 추가 콘텐츠(제목·생성일시·필터·건수·Props)를 모두 충족하며 community만으로 100% 구현, 라이브러리 교체 불필요.
3. **확장성**: 지금은 같은 시트 푸터지만, 메타 구성 로직을 공통 헬퍼(`appendMetaFooter`)로 추출해두면 이해관계자가 "정식 리포트 비주얼"을 요구할 때 B(다중시트) 또는 라이브러리 교체로 매끄럽게 승급 가능.

**단, asset_funding_aggrid의 head2 단위 보강(`(억원)`/`(개)`)은 C안에 포함**하되, generic_list는 이미 `c.label+' ('+unit+')'`로 보강 완료(near no-op, **중복 추가 금지**), performance도 `'가치 (KRW, 백만)'` 인라인 → **보강 불필요**.

---

## 5. 권고안(C) 3화면 구현 스케치

공통 헬퍼(권장 — 3곳 중복·마스킹 정책 동기화 부담 방지):
```
appendMetaFooter(ws, { title, crumbs, filters, counts /* {total, shown} */, captured? })
// 1) sheet_add_aoa(ws, [ [''],                              // 빈 구분행
//                        [title],                           // 비마스킹 리터럴(MT 우회!)
//                        [crumbs.join(' > ')],              // 비마스킹
//                        ['생성일시: ' + fmtDate(new Date())], // 비마스킹, mn() 미적용
//                        ['적용 필터: ' + filtersLabelPlain + '=' + mn(value)], // 라벨 평문 + 값 mn (숫자만 0)
//                        ['총 ' + mn(String(total)) + '개 중 ' + mn(String(shown)) + '개'] ],
//                      { origin: -1 })   // ← !ref 자동확장, 기존 !merges/z서식 무변
// 2) wb.Props = { Title: title, Author:'APFS', CreatedDate:new Date() }
```

- **asset_funding_aggrid** (2단 병합헤더): 메타 푸터를 `dataSrc`(본문+TOTAL_ROW) 아래 append. `!merges`(rows0-1)·`z`서식(`r:i+2`)·`!cols`·시트명 **전부 불변**. **단위 보강이 실질 작업처** — head2를 각 금액열 `+'(억원)'`, 조합수 `+'(개)'`(head1/병합은 그대로). 제목은 `title` 리터럴로(원본 cardTitle MT 우회).
- **generic_list** (스키마 동적): 헤더 단위는 이미 보강됨(line 369) → **건드리지 말 것**. 메타 푸터에 `findMenuContext`의 title/crumbs + `schema.provenance.capturedAt`/`schema.entity`. **빈 값 가드 필수**(`DEFAULT_SCHEMA.capturedAt===''`인 폴백 페이지는 기준일 줄 생략). 필터는 `filterValues` SSOT(라벨 평문/값 `mn()`, 태그형은 값 없음).
- **performance** (고정 6컬럼): 단위 인라인이라 보강 불필요. 카드 제목·필터칩이 코드상 `<MT>` 래핑(:343/:355) → 푸터엔 **반드시 리터럴 평문**으로 기입. 필터 라벨(period/assets/risk) 평문, KPI 수치·총건수(1208)·`selCount`는 `mn()`(현재 0/placeholder).

마스킹·서식 공통 준수:
- **MT 절대 금지**(Excel에선 회색바가 안 나오고 빈 셀처럼 됨) — 제목/라벨/생성일시는 리터럴 평문.
- 본문 숫자셀은 기존대로 `masked?0`(`v:0`)+`z`서식 유지.
- 생성일시 로캘/타임존 포맷 합의 필요(예 `toLocaleString('ko-KR')`) — 미정 시 제각각될 위험.

---

## 6. 라이브러리 교체 분기점 (언제 `xlsx-js-style` / ExcelJS 로 가야 하나)

다음 중 **하나라도 "필수 요건"으로 격상되는 순간** 교체 검토:

1. **틀 고정(freeze pane)** — 상단 헤더 행을 스크롤 고정해야 한다 → community writer가 `!freeze`를 무시함이 실증됨. **ExcelJS 필요**(또는 freeze 포기·autofilter로 대체).
2. **시각 스타일** — 굵은 제목 / 헤더·메타블록 배경 음영 / 테두리 박스 / **병합셀 가운데정렬**(특히 그룹헤더 `'조성현황'`·`'출자현황'`이 좌측에 붙는 증상 해소). → 셀 채움·폰트·테두리·정렬만이라면 **`xlsx-js-style`**(SheetJS write API 호환, 마이그레이션 비용 최소), 차트/조건부서식/복잡 레이아웃까지면 **ExcelJS**.
3. **차트·조건부서식·데이터 검증(드롭다운)** 등 고급 워크북 기능 → **ExcelJS**.

그 전까지(평문 텍스트 + 병합 + 빈행 + Props + `z`숫자서식 + autofilter 범위)는 **현재 라이브러리로 충분**하며, 교체는 불필요한 번들·복잡도 증가다.

---

### 실데이터 연동 전 유의 (결함 아님)
`_on=true`인 현재는 메타의 KPI 수치·필터 값·건수가 전부 `0`/스켈레톤으로 출력된다(`'연도: 0000'`, `'총 0개'`). 이는 **의도된 placeholder**이며 `_on=false` 연동 시 자동 정상화된다. 데모/검수 시 "왜 0이냐" 오해를 막도록 문서화 필요. **(별건) performance `value` 함정**: `data.ts:314 value:'284,200'`은 문자열이라 `_on=false` 전환 시 `aoa_to_sheet`가 `t:'s'` 텍스트셀로 기록 → `z='#,##0'` 무효(천단위 서식 안 먹음). **C안 스코프 밖 선존 버그이므로 여기서 고치지 말고 별도 티켓으로 분리**(스코프 크리프 방지).

---

관련 파일(모두 절대경로):
- `/Users/younghwankang/WORK/WORKSPACE/APFS-/src/dash/asset_funding_aggrid.tsx` (exportExcel 223-248, head2 단위 보강 대상, KPI/필터 274-276·182-183)
- `/Users/younghwankang/WORK/WORKSPACE/APFS-/src/dash/generic_list.tsx` (exportExcel 364-387, 단위 이미 보강 369, provenance/entity, total 314)
- `/Users/younghwankang/WORK/WORKSPACE/APFS-/src/dash/performance.tsx` (exportExcel 309-327, MT 래핑 343/355, value 함정 314)
- `/Users/younghwankang/WORK/WORKSPACE/APFS-/src/dash/mask.tsx` (`_on=true` 12, `mn` 21-23, `MT` 26-40)

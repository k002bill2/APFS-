# [SPEC] 현행시스템 캡처 기반 도메인 페이지 생성

- **상태**: 설계 승인됨 (사용자 승인 2026-06-21) — 구현 전 `/plan` HARD-GATE 대상
- **작성일**: 2026-06-21
- **스킬명(예정)**: `apfs-capture-schema`
- **권장 접근법**: 접근법 2 (스킬-저작 정적 PageSchema + 스키마주도 GenericListPage). 근거: route=한글 label·137 리프 규모에서 단일 resolveSchema만이 확장 가능하고, complex 화면은 명시적 escalation 경계로 분리하며, 동결 스키마가 SSOT+재현성을 동시 충족 — 접근법1(분기 폭발·SSOT부재)과 3(렌더 메커니즘 외 추가우위 미미·137 생성파일 부담)을 흡수.
- **출처**: docs/Data_backup 캡처 5종(151장) + 현행시스템 메뉴표 + 코드베이스 1차 검증(generic_list/modal/data.ts/app.tsx/shell.tsx/risk.tsx) + 11-에이전트 설계검토 워크플로우(wf_59a1a782)

## 확정 결정 (Decisions)

1. **접근법**: 접근법 2 (스킬-저작 정적 PageSchema + 스키마주도 GenericListPage). 승인됨.
2. **초기 스코프**: **핵심 소수 파일럿** — 인프라 1회 구축 + easy 화면 2~3개로 전 파이프라인 검증 후 확대. (전수 OCR/전 메뉴 실데이터화는 파일럿 검증 뒤 별도 결정.)
3. **회귀 0 불변식**: `resolveSchema`의 DEFAULT = 오늘 generic_list 동작. 미구현 리프는 폴백 그대로.
4. **마스킹 fail-safe**: 셀/필드 디스패처 default=`MT`(평문 금지), `code`·`pii` 1급 타입 신설 — `mn()` 영숫자 누출 차단.

## /plan 단계에서 확정할 잔여 결정 (Open Questions)

1. 목표 범위: '전 메뉴 실데이터화'인가 '핵심 소수 화면만'인가? 접근법2는 양쪽 모두 우아하게 degrade하므로 권고는 안 바뀌지만, 롤아웃 순서·투자 총량이 달라짐.
2. 캡처된 complex 화면(특히 RISK '운용사별 조기경보')이 이미 dedicated route(risk.tsx 등 11개)와 겹치는가? 겹치면 reference-only로 carve-out(재생성 금지) 확정 필요.
3. 151 캡처(5개 레거시 시스템) ↔ 137 메뉴 리프의 매핑표가 미작성 — 누가 화면-리프 대응을 1회 확정하나? (캡처는 메뉴 트리와 1:1 아님)
4. 라벨 충돌 7건(사용자관리/수탁보고/조기경보/조합원총회/조합정보/투자기업정보/회계)에 부여할 path 네이밍 규칙 — 부모 접두 방식 합의 필요.
5. 현행시스템 변경 시 재캡처·재검수·재배선 소유자와 주기(provenance staleness 운영 책임) 미정.
6. PII(대표자 주민번호 앞/뒤 분리노출) 화면은 마스크 ON 상태로도 보존하나, _on=false(실데이터 연동) 시점에 주민번호 컬럼은 별도 영구 마스킹 정책이 필요한가?

> 파일럿 스코프 기준 가이드(plan 확정 대상): (2)(3)(4)는 파일럿에 포함되는 화면에 한해서만 해결, (5)(6) 운영·PII 영구정책은 인프라에 훅만 남기고 정책 결정은 후속.

---

## 설계 검토 본문

> 산출물 성격: **설계/검토안(구현 아님)**. 3+ 파일 변경이므로 실제 구현 전 `/plan` HARD-GATE 대상이며, 본 문서가 그 plan의 입력이다.
> 검증 완료 사실(1차 증거): route=한글 label(shell.tsx:62 `onNav(leaf.path||leaf.label)`), data.ts에 `label:` 180개 / `path:` 13개뿐, 중복 리프 라벨 7건(사용자관리·수탁보고·조기경보·조합원총회·조합정보·투자기업정보·회계), app.tsx:65-76 dedicated route 11개 + `else→GenericListPage` 폴백, `mn()`은 숫자만 0치환(영숫자 누출), 캡처 `/tmp/apfs_caps/{BRIEF,FFMS,REPORT,RISK,TRUST}` 총 **151장**.

---

## 1. 문제 정의 & 필드 갭

**현 폴백의 도메인 무관성.** `generic_list.tsx`는 137개 메뉴 리프 전부를 고정 6열 스키마(항목명·금액·변동률·상태·추이)와 `makeRows(23)` 가짜 데이터(generic_list.tsx:43-58)로 렌더한다. `generic_list_modal.tsx`도 고정 5필드(항목명/구분/금액/변동률/상태, glm:109-136)뿐이라 textarea·file 컨트롤이 없다. 결과적으로 '공고문 등록'(FFMS)이든 '운용사별 조기경보 조회'(RISK)든 화면이 동일하다.

**문서 레벨의 필드 갭.** 참조 문서 `docs/현행시스템_데이터구성도_업무흐름도.md`는 개념/논리 ERD(엔티티·관계)만 있고 **필드가 없다** → drift 검증의 ground-truth가 못 된다. 반면 사용자 결정대로 **151장 캡처에는 컬럼명·실제값·값도메인이 텍스트로 살아 있어**(RISK 정상/주의/경고, REPORT 일치/불일치, FFMS 정기/수시) 실측 추출이 신뢰 가능하다. 즉 "필드의 진실은 캡처에 있다"가 본 검토의 출발점이다.

**캡처에서 발견된 두 가지 비자명 구조(설계를 좌우):**
- **조건부/중첩 컬럼**: RISK '조기경보'는 운용사구분(창투/증권/여전/은행)을 디스크리미네이터로 선두 컬럼이 가변되고, 비율+등급+연환산 3서브컬럼의 2단 중첩 헤더를 갖는다. TRUST/REPORT 실물검증은 운용사/수탁기관/일치여부 3단 그룹 헤더 대사표다. → **flat 컬럼 배열로 표현 불가**.
- **PII**: REPORT '투자기업개요'가 대표자 주민번호를 앞6/뒤1 컬럼으로 분리 노출 → 마스킹 필수.

---

## 2. 접근법 비교표

| 기준 | 1. 스킬-only (손-코딩) | **2. 스킬+정적 PageSchema (권장)** | 3. 코드젠 스크립트 |
|---|---|---|---|
| 초기비용 | **낮음** (SKILL.md 1장) | 중간~높음 (타입/zod/디스패처/모달확장/스킬, 1회) | 중간 (emitter 템플릿 2~4일) |
| 페이지당 | **높음·비상각** (매번 OCR+손코딩+배선) | flat/form **낮음**(추출+검수+등록), complex는 escalate | flat/form 낮음, complex는 escalate (델타=emit뿐) |
| 유지보수 | **낮음** (SSOT 없음, 전역변경 페이지별 재적용) | **높음** (화면당 1 schema 파일=SSOT, 렌더러 1곳) | 중간 (JSON=SSOT지만 regen이 수기 덮음) |
| 재현성 | **최저** (영속 중간표현 없음, OCR 매번 재발) | 저작=비결정·**런타임=결정**(동결 스키마+index시드) | schema↓=결정, capture→schema=비결정 |
| 정확도(도메인 정합) | 투자한 소수만 높음 | **높음** (캡처 실측, 폴백 우아한 degrade) | 높음 (접근법2와 동일 추출 공유) |
| 137 리프 확장 | 불가(분기 폭발) | **가능** (단일 resolveSchema) | 가능(registry)이나 137 생성파일 부담 |
| complex 화면 | 코드로 가능(무제한) | 경계 밖→전용 페이지 escalate | 경계 밖→전용 페이지 escalate |

---

## 3. 권고 + 근거

**권장: 접근법 2 — 스킬-저작 정적 PageSchema + 스키마주도 GenericListPage. complex 화면은 risk.tsx식 전용 typed 페이지로 escalate(명시적 경계).** 이는 하이브리드 회피책이 아니라 **단일 권고 + 한정된 예외**다.

**왜 코인토스가 아닌가 — 검증된 제약이 결정한다:**
- *route=한글 label @ 137 리프* → app.tsx 페이지별 분기(접근법1)는 유지 불가. 단일 `resolveSchema`가 유일한 평탄화. **접근법2가 접근법1을 흡수**(접근법1의 유일한 강점인 complex 표현력은 접근법2의 escalation 경계가 그대로 처리).
- *complex 화면이 다수* → flat 컬럼 배열은 **어떤 접근법에서도** 표현 불가 → 세 접근법 공통으로 전용 페이지로 빠진다(차별점 아님).
- *코드젠 델타는 '렌더 메커니즘'뿐* → 페이지당 비용 90%(OCR+사람검수)는 접근법2와 공유인데, 137개 생성 `.tsx`(diff/리뷰 폭증)+regen-vs-수기 클로버를 2~4일 투자로 떠안음. "구조적 마스킹 보장"도 fail-safe default 조건부인데, 그건 접근법2의 단일 디스패처가 런타임에 공짜로 준다. → **접근법3 기각**.

**crossCutting 리스크 → 접근법2가 어떻게 무력화하는가(핵심):**

| 리스크(검증) | 접근법2의 완화 설계 |
|---|---|
| 마스킹 누출(`mn('APFSLIB')='APFSLIB'`) | 셀 디스패처 **default=MT(평문 절대 금지)**, `code`/`pii`를 1급 type으로 추가. mn은 순수 숫자+서식기호에만. → 미매핑 type이 평문/0치환으로 못 샘 |
| 라벨=route 충돌(7건 실재) | 충돌 리프에 data.ts `path` 부여를 **필수 선행**, registry 키 중복을 **빌드타임 에러**로 차단, `findMenuContext`(gl:19) path-우선 매칭 보정 |
| complex 화면 누락 | SOP 1단계 **flat/form vs complex 분류 강제**, complex는 전용 typed 페이지로 escalate(접근법의 명시 경계) |
| drift(캡처 스냅샷) | PageSchema에 **`provenance{capturedAt,sourceUrl,captureFile}` 필수 필드** → staleness 가시화 |
| OCR 비결정 | 사람 **검수 게이트**(이미지 대조) 후 정적 TS로 동결 → 런타임 결정적 |
| data.ts 비대화 | columns/fields/sampleRows는 `src/dash/schemas/<route>.ts`에만, data.ts는 메뉴+path만 |
| 타입 안전망 약함(strict:false) | 경계에 **zod 런타임 검증** + 점검루프에 `tsc --noEmit` 별도 포함 |
| KPI NaN(gl:119-122) | KPI를 `schema.kpis` 선언화, 컬럼 부재 시 배지 숨김 |

---

## 4. 권장 스킬 설계

- **이름**: `apfs-capture-schema`
- **트리거(skill-rules.json 키워드)**: `캡처`, `현행시스템`, `실화면`, `필드 추출`, `페이지 생성`, `스키마`, `OCR`, `조회 화면`, `FFMS`, `RISK`, `REPORT`, `TRUST`, `BRIEF`, `실물검증`, `공고문`
- **입력**: 캡처 1~5장(경로) + 대상 메뉴 리프 label(또는 미지정 시 추출 후 매핑 제안)
- **출력**: ① 검수 완료 `src/dash/schemas/<route>.ts`(동결) ② (complex일 때) 전용 페이지 scaffold 가이드 ③ data.ts path/registry 등록 diff 제안
- **단계(SOP)**:
  1. **분류**: 캡처를 flat-list / form / complex(조건부·중첩·대사표) 3분류. complex는 즉시 escalate 안내(접근법 경계).
  2. **추출(비전 1패스)**: 상단 조회컨트롤→filters, 컬럼→columns(type:amount/rate/date/status/gp/code/pii/text + unit), 입력컨트롤→fields(textarea/file/checkbox/readonly 포함), 1~2행→sampleRows. 그룹헤더 중복라벨→`그룹.컬럼` 네임스페이스. OS 파일다이얼로그 오버레이·가로스크롤 잘림 영역은 제외+플래그.
  3. **검수·동결**: 추출 결과를 캡처 이미지와 1회 대조 → zod 검증 통과 → `provenance` 채워 정적 TS 커밋.
  4. **충돌검사·배선**: 라벨 충돌 시 data.ts path 부여(필수), registry 등록, 중복키 빌드에러 확인.
  5. **검증**: `npm run dev` 렌더 + 라이트/다크 대비 + 콘솔 오류 0 + `tsc --noEmit`(점검용).

---

## 5. 캡처 실측 추출 전략 (151장 배치 워크플로우)

**스코프 정밀화(반드시 명시) — 151 캡처 ≠ 137 리프 ≠ 페이지:**
- 캡처는 **5개 레거시 소스 시스템**(BRIEF/FFMS/REPORT/RISK/TRUST)에서 온 것 — 대시보드 메뉴와 1:1 아님. 화면↔리프 매핑을 1회 확정해야 한다(openQuestion).
- **스크롤 연속 캡처 병합**: RISK image1/2는 동일 화면 → 1 screen으로 dedup.
- **dedicated route 11개는 reference-only**: performance/risk/gp-health/accounting/schedule/subfund/report* 는 이미 전용 페이지 → 캡처가 거기 매핑되면 **재생성 금지**(특히 RISK 조기경보↔risk.tsx 중복 가능, 확인 필요).
- **대상 집합 = 현재 `else→GenericListPage`로 떨어지는 리프**. 캡처 없는 리프는 비용 0(DEFAULT 폴백 유지) — 점진 커버리지.

**배치 절차(5 디렉토리 순회):**
1. 디렉토리별 캡처 인벤토리 작성(BRIEF/FFMS/REPORT/RISK/TRUST). 캡처-리프 매핑 후보표 생성.
2. 캡처당 `Read`(비전 판독) → 조밀 헤더는 crop+2x 업스케일(sips) 재판독(RISK image2 선례).
3. 추출 SOP 적용 → 스크롤 병합 → flat/form/complex 분류.
4. **검증(필수 게이트)**: 추출 JSON ↔ 캡처 육안 대조 체크리스트 — (a)오버레이 제외 명시 (b)잘린 우측 컬럼 '미확인' 플래그 (c)값도메인 일부만 관측 시 표기 (d)PII 컬럼 mask 플래그.
5. 검수 통과분만 `provenance` 채워 schema 커밋 → 커버리지 인벤토리 업데이트.

**효율 포인트**: 같은 소스 시스템 화면은 컬럼/필터 패턴이 반복(BRIEF 연도별투자현황 image1/2, REPORT 일/월/반기 보고) → 첫 화면 schema를 템플릿 삼아 후속 추출 가속.

---

## 6. 통합 변경 (generic_list 스키마주도 개조)

**재사용 컴포넌트 활용 — 신규 의존성 0:**
- `PageHeader`(Shell), `Card/Button/StatusBadge/IconBtn/ColorChip/SegTabs/DeltaBadge`(UI), `MiniBars`(gl:66), forest-green CSS 토큰을 그대로 사용. 시각 디자인 추가작업 0.

**plug points:**
- gl:106 `findMenuContext` 옆에 `resolveSchema(route)` 주입(route=label 키, DEFAULT 폴백=오늘 동작 보존 → 회귀 0).
- gl:43 `makeRows`를 `schema.columns`+`sampleRows` 기반 index-시드 생성기로 교체(결정적 더미 유지).
- gl:210 고정 6열 헤더 → `schema.columns` map.
- gl:216-241 셀을 **type 디스패처**로: amount→`mn`, rate→`DeltaBadge`, status→`StatusBadge`+`statusTone(label,domain)`, date→`mn`, gp→`ColorChip`, **code→`MT`(강제)**, **pii→마스킹 강제**, **text→`MT`**, **default→`MT`(fail-safe)**.
- gl:109 chips → `schema.filters`. gl:119-124 KPI → `schema.kpis`(컬럼 부재 시 숨김, NaN 방지).
- glm:25-35 `STATUS_CHOICES/statusTone` → `schema.statusDomain`. glm:59-79·109-136 폼을 `schema.fields` 순회로 일반화 + **textarea/file 컨트롤 신규 추가**(FFMS 공고문·REPORT 업로드 필수).

**마스크 정합(검증된 HIGH 리스크):** `mask.tsx`의 `mn()`은 숫자만 0치환이라 영숫자(`APFSLIB`)·기관명(`...(농협은행)`)을 누출한다. 따라서 ColumnSpec type에 `code`(영숫자 식별자→MT)·`pii`(주민번호/계좌→무조건 마스킹)를 1급으로 두고, 디스패처 default를 MT로 고정한다. 표 헤더·축·탭·단위·StatusBadge·달력 날짜는 비마스킹("축은 두고 데이터는 가린다") 유지.

**800줄 한도:** 디스패처화로 generic_list.tsx(332줄)가 증가 → 셀/필드 렌더러를 `src/dash/schemas/renderers.tsx`로 추출해 generic_list를 얇은 오케스트레이터로 유지(golden-principles 파일 800줄).

**산출 파일:** `src/dash/schemas/types.ts`(+zod) · `schemas/<route>.ts` · `schemas/index.ts`(registry+resolveSchema+DEFAULT) · `schemas/renderers.tsx` · generic_list.tsx 개조 · generic_list_modal.tsx 개조 · data.ts(충돌 리프 path) · `.claude/skills/apfs-capture-schema/SKILL.md` · skill-rules.json.

---

## 7. 단계적 롤아웃

> 회귀 0 보장: DEFAULT 스키마=오늘 동작. 미구현 리프는 `else→GenericListPage` 폴백 그대로 안전 착지.

1. **인프라 1회(HARD-GATE /plan 후)**: types+zod+resolveSchema+DEFAULT+모달 확장(textarea/file)+렌더러 추출. DEFAULT만으로 기존 화면 무변화 확인(Red-Green 회귀).
2. **easy flat/form 1건 파일럿**: 추출 가장 깨끗한 화면(예 REPORT '펀드개요' easy, BRIEF '연도별투자현황' easy) 1건으로 전 파이프라인(추출→검수→동결→배선→라이트/다크) 검증.
3. **flat-list 배치**: BRIEF/REPORT/TRUST의 단순 테이블·대사표 중 flat 표현 가능분 우선(easy 다수).
4. **form 배치**: FFMS '공고문 등록'(textarea+file), REPORT/TRUST 업로드 — 모달 확장 검증.
5. **라벨 충돌 7건 처리**: data.ts path 부여 + findMenuContext path-우선 보정 + 빌드타임 중복키 검사.
6. **complex escalate(별도 트랙)**: RISK 조기경보·실물검증 등은 risk.tsx식 전용 페이지로(단 dedicated route 중복 확인 후). 스키마 트랙 밖.

**우선순위 기준**: ① 사용자 사용빈도 높은 핵심 화면 → ② 추출 난이도 easy → ③ 충돌·오버레이 없는 캡처.

---

## 8. 잔여 결정(openQuestions)
상단 **"/plan 단계에서 확정할 잔여 결정"** 절 참조 — 권고 자체는 어느 답에도 안 바뀌나(접근법2는 양쪽 우아하게 degrade), 롤아웃 순서·투자 총량·중복 carve-out에 영향. 초기 스코프는 **핵심 소수 파일럿**으로 확정됨(상단 결정 2).
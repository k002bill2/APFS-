---
name: apfs-capture-schema
description: 현행시스템 화면 캡처(이미지)에서 실제 컬럼·필드·값도메인을 추출해 src/dash/schemas/<route>.ts(PageSchema)로 동결하고, 스키마 주도 GenericListPage에 배선하는 절차. 페이지를 캡처 기반 도메인 데이터/양식으로 만들 때 사용.
---

# apfs-capture-schema

현행시스템 캡처 → 검수된 정적 PageSchema → 스키마 주도 페이지. 추측 금지, 캡처 실측이 진실.

## 입력
- 캡처 이미지 경로 1~5장 (예: /tmp/apfs_caps/<SYS>/word/media/imageN.png)
- 대상 메뉴 리프 label (미지정 시 추출 후 매핑 제안)

## SOP
1. **분류**: 캡처를 flat-list / form / complex(조건부·중첩 헤더·대사표) 로 분류.
   complex면 즉시 중단하고 "전용 typed 페이지(risk.tsx식)로 escalate" 안내 — 스키마 트랙 밖.
2. **추출(비전 1패스)**: Read로 이미지 열람.
   - 상단 조회 컨트롤 → `filters`
   - 표 컬럼 → `columns[]`: type 매핑(금액→amount, 비율/변동→rate, 날짜→date, 상태/등급→status(+statusDomain), 운용사/기관→gp, **영숫자 코드/ID→code**, **주민번호/계좌→pii**, 그 외→text), `unit`/`align`/중첩이면 `group`
   - 입력 컨트롤 → `fields[]`: control 매핑(textarea/file/select(+options)/date/checkbox/readonly)
   - 1~2행 → 샘플 인지용(스키마엔 저장 안 함; 더미는 런타임 생성)
   - OS 파일다이얼로그 오버레이·가로스크롤 잘림 영역은 제외하고 플래그
3. **검수·동결**: 추출 결과를 캡처 이미지와 1회 대조 → `provenance{capturedAt,sourceSystem,captureFile}` 채움 → `src/dash/schemas/<route>.ts`로 저장(parsePageSchema/zod 통과 필수).
4. **충돌검사·배선**: 라벨이 중복 리프면 data.ts에 `path` 부여(필수) 후 그 path를 route로. schemas/index.ts의 ALL 배열에 import 추가(중복키면 buildRegistry가 빌드에러).
5. **검증**: `npm test`(스키마 zod) + `npm run build` + `npm run dev` 시각 확인(라이트/다크) + responsive-ui 체크.

## 산출물
- 검수된 `src/dash/schemas/<route>.ts`
- (complex일 때) 전용 페이지 escalate 안내
- data.ts path/registry 등록 diff

## 마스킹 규칙 (CRITICAL)
- type=code/pii/text → 자동 MT 마스킹. mn은 숫자 전용. default도 MT(평문 누출 금지).
- 표 헤더·단위·탭·StatusBadge·날짜 라벨은 비마스킹.

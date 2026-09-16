/* 사후관리기록 관리 — 투자자산관리 > 운용사 모니터링 > 사후관리기록 관리.
   출처: docs/mockups/01_투자자산관리/S1_42_사후관리기록.html (2026-09-15 파싱 실측)

   ── 이전 버전에서 바뀐 것 ──
   출처를 clipboard 캡처 PNG → 정본 매칭표가 지목하는 S1_42 목업으로 되돌렸다
   (docs/메뉴구성도_v0.2.md:103 `ffms > 모니터링 > 사후관리기록`).
   · 컬럼: 원문 헤더 10개 그대로(No·대분류·자펀드·투자기업·해당일자·유형·내용·전달형태·
     Counterpart·관련문서). 원문에 없던 `상태` 컬럼은 뺐다 — 창작 컬럼이었다.
   · select 옵션: 원문 `BD`/`TP`/`SD` 배열의 실값만 쓴다. 이전의 '정기보고·현장점검·시정요구'류는
     원문에 없는 값이었다. 원문 자신이 ⚠검토필요로 "그 외 옵션 미확인"을 달아 뒀고, 그 문구를
     라벨 옆 마커(note)로 그대로 옮긴다(types.ts ReviewNoteSpec — 창작 금지).

   ── 왜 전용 페이지가 아닌가 ──
   사용자가 복합 화면 후보로 지목했으나, S1_42 원문은 **단일 표 1개 + 단일 섹션 편집 모달**이다
   (행 선택 → 수정/삭제). PageSchema + RowFormModal 이 그대로 표현하므로 전용 .tsx 가 얻는 충실도가
   없다. 대신 원문 모달의 필드 구성(대분류*·자펀드*·투자기업·해당일자*·유형·내용·전달형태·
   Counterpart·관련문서)을 fields 에 그대로 옮겼다. */
import type { PageSchema } from './types';

// 원문 `rev()` 마커 문구 — data-rec/data-dat 원문 그대로(공통코드 전체 코드셋 미확인 표시).
const 코드셋미확인 = (axis: string, 실값: string) => ({ rec: `CDTP:${axis} 전체 코드셋`, dat: `데이터 실값: ${실값} (그 외 옵션 미확인)` });

export const schema: PageSchema = {
  route: '사후관리기록 관리',   // ⚠️ data.ts 메뉴 리프 라벨과 정확히 일치(라우팅 키)
  title: '사후관리기록 관리',
  kind: 'list',
  entity: '사후관리기록',
  columns: [
    { key: 'no',           label: 'No',          type: 'number', align: 'center' },
    { key: 'majorCat',     label: '대분류',      type: 'status', align: 'center', note: 코드셋미확인('BD', '일반 사후관리 · 제재조치') },
    { key: 'subFund',      label: '자펀드',      type: 'text',   align: 'left' },
    { key: 'investee',     label: '투자기업',    type: 'text',   align: 'left' },
    { key: 'recordDate',   label: '해당일자',    type: 'date',   align: 'center' },
    { key: 'recordType',   label: '유형',        type: 'text',   align: 'center', note: 코드셋미확인('TP', '기타 · 투자비율위반') },
    // 원문 `.content-cell{white-space:pre-line;min-width:260px;max-width:360px}` — 5줄짜리 행이 있다.
    { key: 'content',      label: '내용',        type: 'text',   align: 'left', multiline: true },
    { key: 'deliveryType', label: '전달형태',    type: 'text',   align: 'center', note: 코드셋미확인('SD', '회의 · 공문') },
    { key: 'counterpart',  label: 'Counterpart', type: 'text',   align: 'left' },
    { key: 'documents',    label: '관련문서',    type: 'text',   align: 'center' },
  ],
  // ── 등록/수정 모달 양식(원문 모달 필드 순서 그대로) ──
  fields: [
    { key: 'majorCat',     label: '대분류',      control: 'select', required: true, options: ['일반 사후관리', '제재조치'], note: 코드셋미확인('BD', '일반 사후관리 · 제재조치') },
    { key: 'subFund',      label: '자펀드',      control: 'text', long: true, required: true },
    { key: 'investee',     label: '투자기업',    control: 'text', long: true },
    { key: 'recordDate',   label: '해당일자',    control: 'date', required: true },
    { key: 'recordType',   label: '유형',        control: 'select', options: ['기타', '투자비율위반'], note: 코드셋미확인('TP', '기타 · 투자비율위반') },
    { key: 'content',      label: '내용',        control: 'textarea' },
    { key: 'deliveryType', label: '전달형태',    control: 'select', options: ['회의', '공문'], note: 코드셋미확인('SD', '회의 · 공문') },
    { key: 'counterpart',  label: 'Counterpart', control: 'text' },
    { key: 'documents',    label: '관련문서',    control: 'filepond' },
  ],
  filters: ['대분류', '유형', '전달형태'],
  // 대분류 배지 톤 — 원문 `bdTag()`가 제재조치를 경고색(.tag n), 일반 사후관리를 기본색으로 칠한다.
  statusDomain: [
    { label: '일반 사후관리', tone: 'info' },
    { label: '제재조치',      tone: 'warning' },
  ],
  searchable: true,
  hideCardView: true,
  hideKpis: true,
  hideMetrics: true,
  sample: [
    { no: 1, majorCat: '일반 사후관리', subFund: '유니 수산식품 투자조합1호', investee: '', recordDate: '2018-11-02', recordType: '기타', content: '민사소송 향후 전략(법무법인 한결, 10:30)', deliveryType: '회의', counterpart: '', documents: '' },
    { no: 2, majorCat: '제재조치', subFund: '그린농림수산식품투자조합', investee: '', recordDate: '2013-04-08', recordType: '투자비율위반', content: '2년차 40% 투자비율 위반', deliveryType: '공문', counterpart: '', documents: '' },
    { no: 3, majorCat: '일반 사후관리', subFund: '현대동양농식품사모투자전문회사', investee: '', recordDate: '2014-04-25', recordType: '기타', content: '- 2011년 5월 3일 금융위원회에 등록한 현대동양PEF\n- 동아원(주)에 대한 100억 투자집행 보류시킴(주가조작 혐의로 금융당국 조사중)\n- 320억 약정금액 중 3년차 투자금액 192억(60%) 중 100억 투자완료\n- 농식품투자조합이 아닌 PEF형태로 법제14조 의무투자비율 위반 적용 받지 않음\n- 다만, 규약 위반에 해당할 수 있으나, 추후 금융당국 조사 결과에 따라 관리보수 삭감 여부를 결정할 예정', deliveryType: '공문', counterpart: '', documents: '' },
  ],
  provenance: {
    capturedAt: '2026-09-15',
    sourceSystem: 'FFMS',
    captureFile: 'docs/mockups/01_투자자산관리/S1_42_사후관리기록.html',
  },
};

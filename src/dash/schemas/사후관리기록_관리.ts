/* 사후관리기록 관리 — 사후보고관리 > 사후관리기록 관리.
   현행시스템 "사후 등록" 양식 캡처(clipboard-2026-06-30) 실측 매핑. 등록/수정 모달은
   항목 수(9)가 많아 RowFormModal이 2단 wide로 자동 렌더한다.
   ── 특수 컨트롤 ──
   · 내용(content)    → control: 'richtext'  (Tiptap 리치 텍스트 에디터, 2단에서 전체 폭)
   · 관련문서(documents) → control: 'filepond' (FilePond 파일 업로더, 2단에서 전체 폭, 총 10MB)
   ── 정합성 ──
   리스트 컬럼 key는 select 필드 key와 일치시켜(majorCat/recordType/deliveryType) 더미행 enum
   시드 + 상세필터 매칭이 성립하게 한다(generic_list.makeRows / filter_field.resolveFilterField). */
import type { PageSchema } from './types';

export const schema: PageSchema = {
  route: '사후관리기록 관리',   // ⚠️ data.ts 메뉴 리프 라벨과 정확히 일치(라우팅 키)
  title: '사후관리기록 관리',
  kind: 'list',
  entity: '사후관리기록',
  columns: [
    { key: 'majorCat',     label: '대분류',     type: 'text',   align: 'center' },
    { key: 'subFund',      label: '자펀드',     type: 'text',   align: 'left' },
    { key: 'investee',     label: '피투자업체', type: 'text',   align: 'left' },
    { key: 'recordDate',   label: '해당일자',   type: 'date',   align: 'center' },
    { key: 'recordType',   label: '유형',       type: 'text',   align: 'center' },
    { key: 'deliveryType', label: '전달형태',   type: 'text',   align: 'center' },
    { key: 'status',       label: '상태',       type: 'status', align: 'center' },
  ],
  // ── 등록/수정 모달 양식(캡처 실측 순서) ──
  fields: [
    // 캡처 충실: 대분류/유형/전달형태는 '전체'를 첫 옵션(=기본 선택)으로 둔다(현행 화면 그대로).
    // 참고: 등록 폼에서 '전체'가 그대로 저장될 수 있어, 구체 카테고리 강제가 필요하면 '선택하세요' 플레이스홀더 도입 가능.
    { key: 'majorCat',     label: '대분류',      control: 'select', required: true, options: ['전체', '정기보고', '수시보고', '현장점검', '시정요구', '기타'] },
    { key: 'subFund',      label: '자펀드',      control: 'text' },
    { key: 'investee',     label: '피투자업체',  control: 'text' },
    { key: 'recordDate',   label: '해당일자',    control: 'date', required: true },
    { key: 'recordType',   label: '유형',        control: 'select', required: true, options: ['전체', '경영현황', '재무점검', '투자약정 이행', '회수계획', '리스크 점검'] },
    { key: 'content',      label: '내용',        control: 'richtext' },
    { key: 'deliveryType', label: '전달형태',    control: 'select', required: true, options: ['전체', '이메일', '공문', '시스템 등록', '대면 보고', '유선'] },
    { key: 'counterpart',  label: 'Counterpart', control: 'text' },
    { key: 'documents',    label: '관련문서',    control: 'filepond' },
  ],
  filters: ['대분류', '유형', '전달형태'],
  statusDomain: [
    { label: '등록',   tone: 'info' },
    { label: '진행중', tone: 'warning' },
    { label: '완료',   tone: 'success' },
    { label: '보류',   tone: 'danger' },
  ],
  provenance: {
    capturedAt: '2026-06-30',
    sourceSystem: 'FFMS',
    captureFile: 'clipboard-2026-06-30-102537-20739F0B.png',
  },
};

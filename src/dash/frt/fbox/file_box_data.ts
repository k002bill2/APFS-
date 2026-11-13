/* 파일BOX(FRT005) 데모 데이터 — 출처 `파일BOX_목업.html` 스크립트의 MY_FILES·SUB_FILES 리터럴.
   목업 2건·4건에 같은 운용사·조합·투자기업(목업 ENTITIES)으로 몇 건을 보탰다(필터·선택을 확인할 만큼).
   크기는 바이트(목업 '1.8MB'·'320KB' 를 환산) — 표시는 file_box_model.fmtSize 가 한다.
   ⚠ 실제 파일이 아니다 — 파일명·크기·등록일만 있는 더미 행. */

export type MyFile = Readonly<{ id: string; name: string; size: number | null; date: string }>;
export type SubFile = Readonly<{ id: string; org: string; fund: string; co: string; name: string; size: number | null; date: string }>;

/** 드롭존 안내(목업 원문) */
export const FILE_HINT = 'PDF, HWP, DOCX, XLSX, ZIP · 최대 20MB';
export const FILE_MAX_SIZE = '20MB';

const KB = 1024;
const MB = 1024 * 1024;

const MY_SEED: readonly MyFile[] = [
  { id: 'my-1', name: '2026년_2분기_투자심의자료.pdf', size: Math.round(1.8 * MB), date: '2026-06-08' },
  { id: 'my-2', name: '자펀드_결성총회_의사록.hwp', size: 320 * KB, date: '2026-05-30' },
  { id: 'my-3', name: '2026년_출자사업_운용계획.xlsx', size: 860 * KB, date: '2026-05-21' },
  { id: 'my-4', name: '운용사_정기검사_체크리스트.docx', size: 210 * KB, date: '2026-05-12' },
  { id: 'my-5', name: '모태펀드_결산자료_2025.zip', size: Math.round(6.4 * MB), date: '2026-04-28' },
];

const SUB_SEED: readonly SubFile[] = [
  { id: 'sub-1', org: '그린루트벤처스', fund: '그린루트성장투자조합2호', co: '(주)체리부로', name: '정기보고서_202605.xlsx', size: 640 * KB, date: '2026-06-05' },
  { id: 'sub-2', org: '그린루트벤처스', fund: '그린루트성장투자조합2호', co: '(주)체리부로', name: '포트폴리오_현황_202605.pdf', size: 420 * KB, date: '2026-06-04' },
  { id: 'sub-3', org: '한국투자파트너스', fund: '한투스마트농업투자조합', co: '(주)팜프레시', name: '수시보고_첨부.pdf', size: Math.round(2.1 * MB), date: '2026-06-03' },
  { id: 'sub-4', org: '인라이트벤처스(주)', fund: '인라이트 농식품 청년기업 성장펀드', co: '(주)선양', name: '조합원총회_안건.docx', size: 180 * KB, date: '2026-05-27' },
  { id: 'sub-5', org: '인라이트벤처스(주)', fund: '인라이트 농식품 청년기업 성장펀드', co: '(주)진바이오텍', name: '투자계약서_사본.pdf', size: Math.round(3.2 * MB), date: '2026-05-22' },
  { id: 'sub-6', org: '한국투자파트너스', fund: '한투스마트농업투자조합', co: '(주)팜프레시', name: '정기보고서_202604.xlsx', size: 590 * KB, date: '2026-05-08' },
  { id: 'sub-7', org: '그린루트벤처스', fund: '그린루트성장투자조합2호', co: '(주)체리부로', name: '회수내역_증빙.zip', size: Math.round(4.7 * MB), date: '2026-04-30' },
];

/** 데모 행 — 호출마다 새 배열(원본 불변) */
export const demoMyFiles = (): MyFile[] => MY_SEED.map((r) => ({ ...r }));
export const demoSubFiles = (): SubFile[] => SUB_SEED.map((r) => ({ ...r }));

/* 전표증빙 미첨부 관리(ACC-006) 순수 모델 — 미첨부 판정·상세필터·기간 기본값·증빙 저장 검증·첨부 파일 검사·증빙 반영.
   화면(missing_evidence_manage.tsx)·증빙첨부 화면(journal_entry_screen mode 'evidence')·업로더·테스트가 공유한다.
   날짜는 'YYYY-MM-DD' 문자열(사전순 = 시간순), '오늘'은 호출부가 주입한다(테스트 결정성). */
import { endOfMonth, format, startOfMonth } from 'date-fns';
import { CURRENT_USER } from './general_journal_data';
import type { EvidenceType, JournalRow } from './general_journal_data';

/* ── 미첨부 판정 ── */
/** 증빙 미첨부 = 증빙구분 미선택 이거나, 첨부 파일이 없는데 증빙미첨부도 체크하지 않은 전표.
    증빙첨부 저장 검증(validateEvidence)의 부정이라 저장에 성공한 전표는 항상 목록에서 빠진다(가정 — 보고서 기재).
    ⚠ 설계서에 정의가 없는 가정(PM 확인 대기) — 판정 변경은 이 함수와 missing_evidence.test 의 isMissingEvidence 블록 두 곳만 고친다
      (목록 필터 missingPasses 도 이 함수를 경유한다) */
export const isMissingEvidence = (r: Pick<JournalRow, 'evidenceType' | 'attachments' | 'noEvidence'>): boolean =>
  r.evidenceType === '' || (r.attachments.length === 0 && !r.noEvidence);

/* ── 상세필터(slide 11 · 7개) ── */
/** 상세필터 값 — 빈 문자열 = 미적용(계정구분·전표발생구분 '' = 전체) */
export interface MissingFilter {
  fundAccount: string;          // 계정구분(정확일치)
  from: string;                 // 기간 시작(전표일, 포함)
  to: string;                   // 기간 종료(전표일, 포함)
  includeUnapproved: boolean;   // 미결재포함 — 미체크 = 결재 승인 전표만, 체크 = 미상신·상신·반려 포함
  origin: string;               // 전표발생구분(정확일치)
  writer: string;               // 작성자(부분일치)
  partner: string;              // 거래처(부분일치)
  memo: string;                 // 적요(부분일치)
}

/** 기본 기간 = 당월 1일 ~ 당월 말일(slide 11 · E00 예시 `2026-10-01 ~ 2026-10-31`) */
export function currentMonth(today: string): [string, string] {
  const d = new Date(today + 'T00:00:00');
  return [format(startOfMonth(d), 'yyyy-MM-dd'), format(endOfMonth(d), 'yyyy-MM-dd')];
}

/** 진입·[초기화] 기본값 — 기간 당월, 미결재포함 미체크, 나머지 전체 */
export function defaultFilter(today: string): MissingFilter {
  const [from, to] = currentMonth(today);
  return { fundAccount: '', from, to, includeUnapproved: false, origin: '', writer: '', partner: '', memo: '' };
}

const has = (hay: string, needle: string) => {
  const q = needle.trim().toLowerCase();
  return !q || hay.toLowerCase().includes(q);
};

/** 한 행이 조건을 통과하는가 — 미첨부 판정 + 조건끼리 AND */
export function missingPasses(r: JournalRow, f: MissingFilter): boolean {
  return isMissingEvidence(r)
    && (f.includeUnapproved || r.approval === '승인')
    && (!f.fundAccount || r.fundAccount === f.fundAccount)
    && (!f.from || r.slipDate >= f.from)
    && (!f.to || r.slipDate <= f.to)
    && (!f.origin || r.origin === f.origin)
    && has(r.writer, f.writer)
    && has(r.partner, f.partner)
    && has(r.memo, f.memo);
}

/** 정렬 — 전표일 내림차순, 같은 날은 순번 오름차순(순번은 0-패딩 문자열 '001') */
export function sortMissing(rows: readonly JournalRow[]): JournalRow[] {
  return [...rows].sort((a, b) => (a.slipDate === b.slipDate ? a.seq.localeCompare(b.seq) : a.slipDate < b.slipDate ? 1 : -1));
}

/** 목록 — 통과 행만, sortMissing 순서 */
export const filterMissing = (rows: readonly JournalRow[], f: MissingFilter): JournalRow[] => sortMissing(rows.filter((r) => missingPasses(r, f)));

/* ── 증빙첨부 저장 검증(slide 12 '저장 검증' 표) ── */
export const EVIDENCE_MSG = {
  evidenceType: '증빙구분을(를) 선택하세요.',
  file: '증빙 파일을 첨부하거나 증빙미첨부를 체크하세요.',
  ext: '업로드할 수 없는 파일 형식입니다.',
  size: '파일 크기는 20MB를 넘을 수 없습니다.',
  saved: '저장되었습니다',
} as const;

/** 허용 확장자 13종(slide 12 안내 문구 순서). PPTX 는 설계서 목록에 없어 받지 않는다(PM 확인 필요) */
export const EVIDENCE_EXTS = ['ppt', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'hwp', 'hwpx', 'jpg', 'jpeg', 'gif', 'png', 'mp4'] as const;
/** 파일 1개 최대 크기 — 20MB(20 × 1024 × 1024 바이트, 정확히 20MB 는 허용) */
export const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;
/** `<input type=file accept>` 값 — 드래그는 accept 를 거치지 않아 checkEvidenceFile 로 다시 거른다 */
export const EVIDENCE_ACCEPT = EVIDENCE_EXTS.map((e) => '.' + e).join(',');

/** 첨부 파일 1개 검사 — 허용 외 확장자 → ext, 20MB 초과 → size, 통과면 null(확장자는 대소문자 무시) */
export function checkEvidenceFile(name: string, size: number): string | null {
  const dot = name.lastIndexOf('.');
  const ext = dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
  if (!(EVIDENCE_EXTS as readonly string[]).includes(ext)) return EVIDENCE_MSG.ext;
  if (size > MAX_EVIDENCE_BYTES) return EVIDENCE_MSG.size;
  return null;
}

/** 첨부 CSV("a.pdf, b.png") ↔ 파일명 배열 — DocumentsField 와 같은 계약 */
export const parseCsv = (csv: string): string[] => csv.split(',').map((s) => s.trim()).filter(Boolean);
/** 파일명 추가 — 이미 있는 이름은 한 번만(같은 파일 재선택 중복 방지) */
export const addFileNames = (csv: string, names: readonly string[]): string => {
  const cur = parseCsv(csv);
  for (const n of names) if (!cur.includes(n)) cur.push(n);
  return cur.join(', ');
};
export const removeFileName = (csv: string, name: string): string => parseCsv(csv).filter((n) => n !== name).join(', ');

export type EvidenceCheck = { ok: true } | { ok: false; field: 'evidenceType' | 'attachments'; message: string };

/** 증빙 저장 검증 — 위→아래: 증빙구분 미선택 → 파일 없음·증빙미첨부 미체크 */
export function validateEvidence(f: { evidenceType: EvidenceType | ''; attachments: string; noEvidence: boolean }): EvidenceCheck {
  if (!f.evidenceType) return { ok: false, field: 'evidenceType', message: EVIDENCE_MSG.evidenceType };
  if (parseCsv(f.attachments).length === 0 && !f.noEvidence) return { ok: false, field: 'attachments', message: EVIDENCE_MSG.file };
  return { ok: true };
}

/** 증빙만 반영 — 증빙구분·보관위치·증빙미첨부·첨부 4항목 + 최종수정자. 헤더·분개·관리항목은 그대로(원본 불변) */
export function applyEvidence(
  rows: readonly JournalRow[], id: string,
  ev: Pick<JournalRow, 'evidenceType' | 'storage' | 'noEvidence' | 'attachments'>, user: string = CURRENT_USER,
): JournalRow[] {
  return rows.map((r) => (r.id === id ? {
    ...r, evidenceType: ev.evidenceType, storage: ev.storage, noEvidence: ev.noEvidence, attachments: [...ev.attachments], updatedBy: user,
  } : r));
}

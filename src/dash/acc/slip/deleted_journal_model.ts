/* 삭제전표 관리(ACC-004) 순수 모델 — 상세필터·기간 검증·복원·정렬. 화면·테스트 공용.
   분개 합계는 일반전표 general_journal_data 의 lineTotals 를 쓴다(차액은 전표 화면이 계산). */
import type { DeletedJournal } from './deleted_journal_data';

/** 상세필터 값 — 빈 문자열 = 미적용(계정구분·전표발생구분 '' = 전체) */
export interface DeletedFilter {
  fundAccount: string;   // 계정구분(정확일치)
  from: string;          // 기간 시작 'YYYY-MM-DD'(포함)
  to: string;            // 기간 종료 'YYYY-MM-DD'(포함)
  origin: string;        // 전표발생구분(정확일치)
  writer: string;        // 작성자(부분일치)
  partner: string;       // 거래처(부분일치)
  memo: string;          // 적요(부분일치)
}
export const EMPTY_FILTER: DeletedFilter = { fundAccount: '', from: '', to: '', origin: '', writer: '', partner: '', memo: '' };

export const PERIOD_ERROR = '시작일은 종료일보다 늦을 수 없습니다.';

/** 기간 검증 — 둘 다 있고 시작 > 종료면 오류 메시지, 아니면 null. 'YYYY-MM-DD' 는 0-패딩이라 문자열 비교 = 시간순 */
export function validatePeriod(from: string, to: string): string | null {
  return from && to && from > to ? PERIOD_ERROR : null;
}

/** 정렬 — 전표일 내림차순, 같은 날은 순번 오름차순(순번은 0-패딩 문자열 '001') */
export function sortDeleted(rows: readonly DeletedJournal[]): DeletedJournal[] {
  return [...rows].sort((a, b) => (a.slipDate === b.slipDate ? a.seq.localeCompare(b.seq) : a.slipDate < b.slipDate ? 1 : -1));
}

const includesCI = (hay: string, needle: string) => {
  const q = needle.trim().toLowerCase();
  return !q || hay.toLowerCase().includes(q);
};

/** 상세필터 — 조건끼리 AND. 결과는 sortDeleted 순서 */
export function filterDeleted(rows: readonly DeletedJournal[], f: DeletedFilter): DeletedJournal[] {
  return sortDeleted(rows.filter((r) =>
    (!f.fundAccount || r.fundAccount === f.fundAccount)
    && (!f.from || r.slipDate >= f.from)
    && (!f.to || r.slipDate <= f.to)
    && (!f.origin || r.origin === f.origin)
    && includesCI(r.writer, f.writer)
    && includesCI(r.partner, f.partner)
    && includesCI(r.memo, f.memo)));
}

/** 복원 — 삭제전표 목록에서 해당 행을 뺀다(원본 불변). 데모라 일반전표 목록으로의 이동은 없다 */
export function restoreJournal(rows: readonly DeletedJournal[], id: string): DeletedJournal[] {
  return rows.filter((r) => r.id !== id);
}

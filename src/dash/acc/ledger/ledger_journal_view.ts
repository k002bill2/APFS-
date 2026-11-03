/* 장부조회 전표상세 어댑터 — 원장 전표(LedgerSlip) → ACC-003 전표 화면(JournalEntryScreen)이 받는 EntryState.
   미결계정 관리 E09 와 같은 방식: `{ mode: 'edit', source: JournalRow }` + 화면에 `readOnly` prop([닫기]만, 제목 "전표상세").
   JournalRow 조립은 미결계정의 `buildSlip`·`jline`(전 필드 기본값 채움)을 재사용하고, 원장에만 있는 값(손익부서·등록자)을 덮어쓴다.
   journal_entry_screen.tsx 는 읽기만 한다(수정 금지 — 다른 세션 소유).

   사용(페이지·팝업):
     const [view, setView] = useState<EntryState | null>(null);
     … onRowDoubleClicked → setView(entryOf(src, line.slipNo))
     {view && <JournalEntryScreen entry={view} readOnly hideGridTools onSave={(j) => j} onClose={() => setView(null)} />} */
import { buildSlip, jline } from '../slip/suspense_data';
import type { JournalRow } from '../slip/general_journal_data';
import type { EntryState } from '../slip/general_journal_model';
import { accountOf } from './ledger_data';
import type { LedgerSlip, LedgerSource } from './ledger_data';

/** 원장 전표 → JournalRow(전표상세 화면 입력). 금액 0 은 null(전표 화면의 '빈 칸' 규약) */
export function journalRowOf(s: LedgerSlip): JournalRow {
  const lines = s.lines.map((l) => jline(l.accountCode, accountOf(l.accountCode)?.name ?? '-', l.memo, l.debit || null, l.credit || null,
    { mgmtNo: l.mgmtNo, partner: l.partner, accountNo: l.accountNo }));
  return {
    ...buildSlip({ slipNo: s.slipNo, slipDate: s.slipDate, fundAccount: s.fundAccount, memo: s.memo, partner: s.partner,
      approval: s.approval, origin: s.origin, writer: s.writer, lines }),
    seq: s.seq, plDept: s.plDept, plEmployee: s.plEmployee, createdBy: s.createdBy, updatedBy: s.updatedBy,
  };
}

/** 전표번호 → 조회 전용 진입 상태. 없는 번호면 null(호출부가 toast) */
export function entryOf(src: LedgerSource, slipNo: string): EntryState | null {
  const s = src.bySlipNo.get(slipNo);
  return s ? { mode: 'edit', source: journalRowOf(s) } : null;
}

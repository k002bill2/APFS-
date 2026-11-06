/* 회계거래처관리(ACC-026) — 순수 로직(필터·채번·저장 검증 순서·사업자번호 형식/중복·주계좌·변경이력·삭제 게이트).
   화면과 분리해 vitest 로 검증한다(partner_model.test.ts). 페이지·모달은 배선만. */
import type { BankAccount, PartnerHistory, PartnerRow, PartnerType, Region } from './partner_data';
import { DOMESTIC_COUNTRY } from './partner_data';

/* ── 목록 ── */
export const sortByNo = (rows: readonly PartnerRow[]): PartnerRow[] => [...rows].sort((a, b) => a.partnerNo.localeCompare(b.partnerNo));

/** 숫자만(하이픈·공백 무시) */
export const digitsOf = (s: string): string => s.replace(/\D/g, '');

/** 상세필터 6개 — 빈 문자열 = 전체(비활성) */
export type PartnerFilter = { type?: string; name?: string; ceo?: string; bizNo?: string; region?: string; country?: string };

/** 거래처명·대표자명 = 부분일치(대소문자 무시) · 사업자등록번호 = 하이픈 무시 부분일치 · 나머지 정확일치. 거래처번호 오름차순 */
export function filterPartners(rows: readonly PartnerRow[], f: PartnerFilter): PartnerRow[] {
  const name = (f.name ?? '').trim().toLowerCase();
  const ceo = (f.ceo ?? '').trim().toLowerCase();
  const biz = digitsOf(f.bizNo ?? '');
  const bizRaw = (f.bizNo ?? '').trim();
  return sortByNo(rows.filter((r) =>
    (!f.type || r.type === f.type)
    && (!name || r.name.toLowerCase().includes(name))
    && (!ceo || r.ceo.toLowerCase().includes(ceo))
    /* 숫자가 하나도 없는 검색어(예: '-')는 아무 행도 맞지 않는다 — 전체로 풀리지 않게 */
    && (!bizRaw || (biz !== '' && digitsOf(r.bizNo).includes(biz)))
    && (!f.region || r.region === f.region)
    && (!f.country || r.country === f.country)));
}

/* ── 채번 — P000NNN. 활성 + 논리삭제 행 모두의 최댓값 + 1(삭제된 번호를 다시 주지 않는다) ── */
export function nextPartnerNo(taken: readonly string[]): string {
  const max = taken.reduce((m, no) => {
    const n = /^P(\d+)$/.exec(no)?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return 'P' + String(max + 1).padStart(6, '0');
}

/* ── 사업자등록번호 ── */
/** 형식 = 숫자 10자리(하이픈 허용 — 숫자·하이픈 외 문자가 있으면 오류) */
export const isBizNoFormat = (s: string): boolean => /^[\d-]+$/.test(s.trim()) && digitsOf(s).length === 10;
/** 000-00-00000 으로 정규화(형식이 아니면 입력값 그대로) */
export const formatBizNo = (s: string): string => {
  const d = digitsOf(s);
  return isBizNoFormat(s) ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : s.trim();
};
/** 중복 — 숫자만 비교, selfNo(수정 중인 거래처번호) 제외. pool = 활성 + 논리삭제 */
export function isBizNoTaken(pool: readonly PartnerRow[], bizNo: string, selfNo?: string): boolean {
  const d = digitsOf(bizNo);
  if (!d) return false;
  return pool.some((r) => r.partnerNo !== selfNo && digitsOf(r.bizNo) === d);
}

export const BIZNO_FORMAT_MSG = '사업자등록번호 형식이 올바르지 않습니다.';
export const BIZNO_DUP_MSG = '이미 등록된 사업자등록번호입니다.';
export const BIZNO_OK_MSG = '사용 가능한 사업자등록번호입니다.';
export const MAIN_ACCOUNT_MSG = '주계좌는 1개만 지정할 수 있습니다.';
/** 설계서에 없는 규칙(리뷰 지적) — 계좌가 1개 이상인데 주계좌가 없으면 저장 중단 */
export const MAIN_ACCOUNT_REQUIRED_MSG = '주계좌를 지정해 주세요.';

/** [확인] 버튼 — 형식 → 중복 순. 빈 값이면 필수 문구 */
export function checkBizNo(pool: readonly PartnerRow[], bizNo: string, selfNo?: string): { ok: boolean; msg: string } {
  if (!bizNo.trim()) return { ok: false, msg: required('사업자등록번호') };
  if (!isBizNoFormat(bizNo)) return { ok: false, msg: BIZNO_FORMAT_MSG };
  if (isBizNoTaken(pool, bizNo, selfNo)) return { ok: false, msg: BIZNO_DUP_MSG };
  return { ok: true, msg: BIZNO_OK_MSG };
}

/* ── 저장 검증(설계서 E 저장 검증 1→6, 첫 미충족 1건만) ── */
/** 필수 문구 — 설계서 표기 '을(를)' 그대로(받침 분기 대신 표기 일치를 택함) */
export const required = (label: string): string => `${label}을(를) 입력해 주세요.`;

/** 폼 값(입력 편의형 — 텍스트 N/A = '') */
export interface PartnerForm {
  type: PartnerType | '';
  internalCode: string;
  region: Region | '';
  country: string;
  foreignRegNo: string;
  bizNo: string;
  corpNo: string;
  name: string;
  nameEn: string;
  ceo: string;
  phone: string;
  bizType: string;
  bizItem: string;
  address: string;
  accounts: BankAccount[];
  attachments: string;   // 파일명 CSV(DocumentsField 값 계약)
}

export type FieldKey = 'type' | 'region' | 'country' | 'foreignRegNo' | 'bizNo' | 'name';
export type AccountField = 'kind' | 'bank' | 'accountNo' | 'holder';
export type ValidationResult =
  | { ok: true }
  | { ok: false; key: FieldKey; msg: string }
  | { ok: false; key: 'account'; rowId: string; field: AccountField | 'main'; msg: string };

const ACCOUNT_REQUIRED: [AccountField, string][] = [['kind', '계좌구분'], ['bank', '은행명'], ['accountNo', '계좌번호'], ['holder', '예금주']];

/** 항목별 검증(설계서 12p ② "저장 시 이 순서(위→아래)대로 검증" · ③ "화면 위→아래 순서로 첫 번째 미충족 항목 안내").
    ② 표 순서대로 **한 항목씩** 필수 → 형식 → 중복을 보고 첫 실패에서 멈춘다:
      거래처유형 → 사업자등록번호(국내: 필수·형식·중복) → 법인등록번호(검증 없음) → 국내/해외 → 국가 → 해외등록번호(해외: 필수)
      → 거래처명 → 계좌 행(행 위→아래, 열 계좌구분·은행명·계좌번호·예금주) → 주계좌 2개 이상 → 계좌 ≥1 인데 주계좌 0(설계서에 없는 규칙).
    그래서 거래처명이 비고 사업자번호 형식이 틀리면 사업자번호 형식 문구가 먼저다(사업자등록번호가 거래처명보다 위).
    pool = 중복 비교 대상(활성 + 논리삭제), selfNo = 수정 중인 거래처번호(등록은 undefined). */
export function validatePartner(v: PartnerForm, pool: readonly PartnerRow[], selfNo?: string): ValidationResult {
  const domestic = v.region === '국내';
  if (!v.type) return { ok: false, key: 'type', msg: required('거래처유형') };
  if (domestic) {
    if (!v.bizNo.trim()) return { ok: false, key: 'bizNo', msg: required('사업자등록번호') };
    if (!isBizNoFormat(v.bizNo)) return { ok: false, key: 'bizNo', msg: BIZNO_FORMAT_MSG };
    if (isBizNoTaken(pool, v.bizNo, selfNo)) return { ok: false, key: 'bizNo', msg: BIZNO_DUP_MSG };
  }
  if (!v.region) return { ok: false, key: 'region', msg: required('국내/해외') };
  if (!v.country.trim()) return { ok: false, key: 'country', msg: required('국가') };
  if (!domestic && !v.foreignRegNo.trim()) return { ok: false, key: 'foreignRegNo', msg: required('해외등록번호') };
  if (!v.name.trim()) return { ok: false, key: 'name', msg: required('거래처명') };
  for (const a of v.accounts) {
    for (const [f, label] of ACCOUNT_REQUIRED) {
      if (!String(a[f] ?? '').trim()) return { ok: false, key: 'account', rowId: a.id, field: f, msg: required(label) };
    }
  }
  /* 화면은 행마다 단일 라디오 + 한 행만 켜는 onChange 라 2개 이상이 만들어지지 않는다 — 데이터 무결성 가드로 남긴다 */
  const mains = v.accounts.filter((a) => a.main);
  if (mains.length > 1) return { ok: false, key: 'account', rowId: mains[1].id, field: 'main', msg: MAIN_ACCOUNT_MSG };
  /* 계좌 ≥1 인데 주계좌 0 — 화면은 행삭제 때 keepMainAccount 로 승격해 막지만 무결성 가드로 둔다 */
  if (v.accounts.length > 0 && mains.length === 0) return { ok: false, key: 'account', rowId: v.accounts[0].id, field: 'main', msg: MAIN_ACCOUNT_REQUIRED_MSG };
  return { ok: true };
}

/** 주계좌 지정 — 그 행만 켜고 나머지는 끈다(거래처당 1개) */
export const setMainAccount = (accounts: readonly BankAccount[], id: string): BankAccount[] => accounts.map((a) => ({ ...a, main: a.id === id }));

/** 행삭제 뒤 — 남은 행이 있는데 주계좌가 없으면 첫 행을 주계좌로 승격(이미 있으면 그대로) */
export const keepMainAccount = (accounts: readonly BankAccount[]): BankAccount[] =>
  accounts.length > 0 && !accounts.some((a) => a.main) ? accounts.map((a, i) => ({ ...a, main: i === 0 })) : [...accounts];

/* ── 변경 이력 ── */
/** 로컬 날짜 YYYY-MM-DD(toISOString 은 UTC 라 KST 자정~9시에 하루 밀린다) */
export const localYmd = (d: Date): string => `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** 수정 저장 시 거래처명(trim) 또는 사업자번호(숫자 비교)가 바뀌면 today 일자로 1행 추가. 안 바뀌었으면 원본 그대로(새 배열) */
export function appendHistory(prev: Pick<PartnerRow, 'name' | 'bizNo' | 'history'>, next: Pick<PartnerRow, 'name' | 'bizNo'>, today: string): PartnerHistory[] {
  const nameChanged = prev.name.trim() !== next.name.trim();
  const bizChanged = digitsOf(prev.bizNo) !== digitsOf(next.bizNo);
  if (!nameChanged && !bizChanged) return [...prev.history];
  return [...prev.history, { date: today, oldName: prev.name, newName: next.name, oldBizNo: prev.bizNo, newBizNo: next.bizNo }];
}

/* ── 저장값 조립 — 폼(입력 편의형) → 행. 텍스트 N/A = '-' ── */
const orDash = (s: string): string => s.trim() || '-';
/** 행 → 폼('-' 는 빈 칸으로) */
export const undash = (s: string): string => (s === '-' ? '' : s);

/** 국내: 사업자번호 000-00-00000 · 해외등록번호 '-' · 국가 대한민국 / 해외: 사업자번호 '-' / 개인: 법인등록번호 '-'.
    거래처번호·관리번호·hasJournal·history 는 호출자(페이지)가 채운다 */
export function buildPartner(v: PartnerForm): Omit<PartnerRow, 'partnerNo' | 'mgmtNo' | 'hasJournal' | 'history'> {
  const domestic = v.region === '국내';
  return {
    internalCode: orDash(v.internalCode),
    type: v.type as PartnerType,
    name: v.name.trim(),
    nameEn: orDash(v.nameEn),
    bizNo: domestic ? formatBizNo(v.bizNo) : '-',
    corpNo: v.type === '개인' ? '-' : orDash(v.corpNo),
    ceo: orDash(v.ceo),
    region: v.region as Region,
    country: domestic ? DOMESTIC_COUNTRY : v.country.trim(),
    foreignRegNo: domestic ? '-' : v.foreignRegNo.trim(),
    phone: orDash(v.phone),
    bizType: orDash(v.bizType),
    bizItem: orDash(v.bizItem),
    address: v.address.trim() ? v.address : '-',
    accounts: v.accounts.map((a) => ({ ...a, accountNo: a.accountNo.trim(), holder: a.holder.trim() })),
    attachments: v.attachments.split(',').map((s) => s.trim()).filter(Boolean),
  };
}

/** 행 → 폼 초기값(수정) / 등록 기본값(법인·국내·대한민국) */
export function toForm(r?: PartnerRow): PartnerForm {
  if (!r) {
    return { type: '법인', internalCode: '', region: '국내', country: DOMESTIC_COUNTRY, foreignRegNo: '', bizNo: '', corpNo: '', name: '', nameEn: '', ceo: '', phone: '', bizType: '', bizItem: '', address: '', accounts: [], attachments: '' };
  }
  return {
    type: r.type, internalCode: undash(r.internalCode), region: r.region, country: r.country, foreignRegNo: undash(r.foreignRegNo),
    bizNo: undash(r.bizNo), corpNo: undash(r.corpNo), name: r.name, nameEn: undash(r.nameEn), ceo: undash(r.ceo), phone: undash(r.phone),
    bizType: undash(r.bizType), bizItem: undash(r.bizItem), address: undash(r.address),
    accounts: r.accounts.map((a) => ({ ...a })), attachments: r.attachments.join(', '),
  };
}

/** 입력 중 여부(취소 확인) — 첨부 CSV 는 구분자·공백을 정규화해 비교(DocumentsField 가 마운트 때 onChange 를 부른다) */
export function formSnapshot(v: PartnerForm): string {
  return JSON.stringify({ ...v, attachments: v.attachments.split(',').map((s) => s.trim()).filter(Boolean) });
}

/* ── 삭제 게이트 — 선택 중 연결 전표가 있는 거래처가 1건이라도 있으면 전체 중단(general_journal_model deleteGate 동형) ── */
export const DELETE_BLOCKED_MSG = '연결된 전표가 있는 거래처는 삭제할 수 없습니다.';
export function deleteGate(rows: readonly PartnerRow[], ids: readonly string[]): { ok: boolean; blocked: number } {
  const sel = new Set(ids);
  const blocked = rows.filter((r) => sel.has(r.partnerNo) && r.hasJournal).length;
  return { ok: ids.length > 0 && blocked === 0, blocked };
}

/** 논리삭제 — 목록에서 빼서 삭제분(deleted)으로 옮긴다(채번·중복 판정이 삭제분도 본다) */
export function logicalDelete(rows: readonly PartnerRow[], deleted: readonly PartnerRow[], ids: readonly string[]): { rows: PartnerRow[]; deleted: PartnerRow[] } {
  const del = new Set(ids);
  return { rows: rows.filter((r) => !del.has(r.partnerNo)), deleted: sortByNo([...deleted, ...rows.filter((r) => del.has(r.partnerNo))]) };
}

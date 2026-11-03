/* 자펀드보고양식관리(운용사ERP)(ADM-012) — 업무 규칙 순수 모듈. 페이지(sfund_report_form_manage.tsx)는 배선만 한다.
   출처 목업: 자펀드보고양식관리(운용사ERP).html 하단 script(openForm · openNewVersion · openHist · openDelete).

   시드 = 보고양식·가이드 조회(SRP-007)와 같은 데이터(src/dash/report_guide_data.ts) — 목업 메모 "두 화면이 같은 데이터를 보도록".
   버전 이력 규약은 공유 데이터를 따른다: `versions[0]` = 현재 버전, 그 뒤 = 과거 버전(최신 먼저).
     목업 스크립트는 현재 버전명을 행의 `ver` 에, 과거 버전만 `history` 에 두어 '이력 1건' 으로 셌다 —
     공유 데이터 기준으로는 현재 버전까지 세어 '이력 2건'(SRP-007 화면과 같은 숫자).
   - 수정 = 제목·설명·파일 단순 정정 — 이력을 추가하지 않는다(목업 메모). 이력이 있으면 현재 버전 설명·새 첨부만 행 값과 맞춘다(editForm).
   - 새 버전 등록 = 새 버전을 이력 맨 앞에 쌓고 현재 버전(설명·파일·등록일시)을 교체한다. 이력이 없던 양식은
     기존 현재 상태를 '이전 버전' 으로 먼저 보관한다(목업 `r.ver||'이전 버전'`).
   - 목록 순서 = 등록일시 최신순(목업 DATA.sort), No 는 정렬 뒤 1부터. 등록·새 버전 등록·삭제 뒤 다시 매긴다.
   - 등록일시·id 는 인자로 받는다(테스트 고정값 · 페이지는 현재 시각). */
import { REPORT_GUIDE_TABLE, GUIDE_HISTORY } from '../../report_guide_data';
import type { GuideVersion } from '../../report_guide_data';

export interface SfundReportForm {
  readonly id: string;
  readonly no: number;
  readonly title: string;   // 양식제목
  readonly desc: string;    // 설명('' = 없음 → 화면 '-')
  readonly file: string;    // 현재 양식 파일명(Download 대상). DocumentsField CSV 계약과 같은 문자열
  readonly reg: string;     // 등록일시 'YYYY-MM-DD HH:MM:SS'
  /** 버전 이력 — 첫 항목 = 현재 버전. 빈 배열 = 버전관리 전(목업 '이력없음') */
  readonly versions: readonly GuideVersion[];
}

export interface FormInput { title: string; desc: string; file: string }
export interface VersionInput { ver: string; desc: string; file: string }

/** 이력이 없던 양식에 새 버전을 올릴 때 기존 현재 상태에 붙이는 버전명(목업 폴백 문구 그대로) */
export const PREV_VERSION_LABEL = '이전 버전';

const str = (v: unknown) => String(v ?? '').trim();

/** 등록일시 최신순 + No 1부터. 'YYYY-MM-DD HH:MM:SS' 문자열 비교가 곧 시간순, 같으면 기존 순서(안정 정렬) */
export function renumber(rows: readonly SfundReportForm[]): SfundReportForm[] {
  return [...rows]
    .sort((a, b) => (b.reg < a.reg ? -1 : b.reg > a.reg ? 1 : 0))
    .map((r, i) => (r.no === i + 1 ? r : { ...r, no: i + 1 }));
}

/** 공유 시드(SRP-007) → 관리 행. 공유 행의 빈 설명은 null 이라 '' 로 맞춘다 */
export function seedForms(): SfundReportForm[] {
  return renumber(REPORT_GUIDE_TABLE.rows.map((r) => ({
    id: r.id, no: Number(r.no), title: str(r.title), desc: str(r.desc), file: str(r.file), reg: str(r.reg),
    versions: GUIDE_HISTORY[r.id] ?? [],
  })));
}

/** 'N'(최신 버전) 배지 · 이력 버튼 조건 */
export const hasHistory = (r: SfundReportForm): boolean => r.versions.length > 0;
export const histCount = (r: SfundReportForm): number => r.versions.length;
export const histLabel = (r: SfundReportForm): string => (hasHistory(r) ? `이력 ${String(histCount(r))}건` : '이력없음');

/** 새 버전 등록 폼의 '현재 버전' 안내 — 목업 `(r.ver||'(버전명 없음)')+' · '+r.reg+(r.file?' · '+r.file:'')` */
export function currentVersionSummary(r: SfundReportForm): string {
  const ver = r.versions[0]?.v ?? '(버전명 없음)';
  return [ver, r.reg, r.file].filter(Boolean).join(' · ');
}

export function addForm(rows: readonly SfundReportForm[], input: FormInput, at: { id: string; now: string }): SfundReportForm[] {
  const row: SfundReportForm = { id: at.id, no: 0, title: str(input.title), desc: str(input.desc), file: str(input.file), reg: at.now, versions: [] };
  return renumber([row, ...rows]);
}

/** 단순 정정 — 이력을 추가하지 않고 등록일시·순서도 그대로. 이력이 있는 양식은 현재 버전(versions[0])을 행 값과 맞춘다:
    설명은 항상, 파일은 새 첨부를 올렸을 때만(그대로 두거나 지웠으면 현재 버전 파일 유지). 과거 버전은 건드리지 않는다 —
    버전 이력 팝업 '현재' 행이 그리드와 어긋나지 않게(2026-11-02 조언자 지시). */
export function editForm(rows: readonly SfundReportForm[], id: string, input: FormInput): SfundReportForm[] {
  return rows.map((r) => {
    if (r.id !== id) return r;
    const desc = str(input.desc);
    const file = str(input.file);
    const [cur, ...past] = r.versions;
    const versions = cur ? [{ ...cur, desc, file: file && file !== r.file ? file : cur.file }, ...past] : r.versions;
    return { ...r, title: str(input.title), desc, file, versions };
  });
}

export function addVersion(rows: readonly SfundReportForm[], id: string, input: VersionInput, now: string): SfundReportForm[] {
  if (!rows.some((r) => r.id === id)) return [...rows];
  const desc = str(input.desc);
  const file = str(input.file);
  return renumber(rows.map((r) => {
    if (r.id !== id) return r;
    const kept = hasHistory(r) ? r.versions : [{ v: PREV_VERSION_LABEL, desc: r.desc, file: r.file, reg: r.reg }];
    return { ...r, desc, file, reg: now, versions: [{ v: str(input.ver), desc, file, reg: now }, ...kept] };
  }));
}

export function removeForm(rows: readonly SfundReportForm[], id: string): SfundReportForm[] {
  return renumber(rows.filter((r) => r.id !== id));
}

/* 프로그램관리 — 순수 모델(UI 없음). 출처: S0_108_프로그램관리.html `rows`(MENU_TREE 리프 파생)·`applyFilter`·삭제 게이트·도움말 `helpDoc`.
   프로그램 = 실제 실행 단위. 메뉴 리프에서 파생된 프로그램은 메뉴에 연결(linked)되어 **삭제 불가**, 사용자 추가(미연결) 프로그램만 삭제 가능(목업).
   도움말은 프로그램 단위로 작성·관리(화면 개요·캡처·항목 설명·처리 절차·FAQ·유의사항·첨부).
   ⚠ 백엔드 없음 — 화면 로컬 더미 상태만. 데이터 원천은 LNB 정본(`admin_menu_tree.programCatalog`) — 메뉴관리·권한 매트릭스와 같은 소스. */
import type { MenuRow } from './admin_menu_tree';
import { programCatalog } from './admin_menu_tree';

export interface HelpImage { name: string }
export interface HelpItem { label: string; desc: string }
export interface HelpFaq { q: string; a: string }
export interface HelpDoc {
  overview: string;      // 화면 개요(도움말 제공 시 필수)
  images: HelpImage[];   // 화면 캡처(이름만 — 백엔드 없음)
  items: HelpItem[];     // 화면 항목 설명
  steps: string[];       // 처리 절차
  faqs: HelpFaq[];       // FAQ
  notes: string;         // 유의사항
  files: string[];       // 첨부파일명
}
export const emptyHelpDoc = (): HelpDoc => ({ overview: '', images: [], items: [], steps: [], faqs: [], notes: '', files: [] });

export interface ProgramRow {
  id: string;            // 안정 키(리프 id 또는 'tmp-…')
  pid: string;           // 프로그램ID
  pname: string;         // 프로그램명
  gubun: string;         // 구분(대분류) — 미연결은 '공통'
  menuPath: string;      // 연결 메뉴 경로(미연결 '')
  use: boolean;
  linked: boolean;       // 메뉴 연결 여부(연결이면 삭제 불가)
  help: boolean;         // 도움말 제공
  helpDoc: HelpDoc;
  helpBy: string; helpAt: string;   // 도움말 최종 수정
  by: string; at: string;           // 최종 수정
}

/* 도움말 데모(목업: 리프 0·3·7·12 번째) */
const HELP_SEED_INDEX = [0, 3, 7, 12];
function seedHelp(pname: string): HelpDoc {
  return {
    overview: `이 프로그램은 ${pname} 기능을 제공합니다. 권한 보유자가 대상 정보를 조회·등록·수정합니다.`,
    images: [{ name: '화면_전체.png' }, { name: '등록모달.png' }],
    items: [{ label: '조회 조건', desc: '검색기준·검색어를 입력해 목록을 조회합니다.' }, { label: '[등록] 버튼', desc: '신규 항목 등록 모달을 엽니다.' }, { label: '사용여부 컬럼', desc: '여/부 배지로 사용 상태를 표시합니다.' }],
    steps: ['목록에서 대상을 조회한다.', '행을 선택하면 수정·삭제가 활성화된다.', '[등록]/[수정]으로 내용을 입력하고 저장한다.'],
    faqs: [{ q: '저장 후 수정이 안 됩니다.', a: '확정 상태에서는 수정이 제한됩니다. 담당자에게 확정 취소를 요청하세요.' }],
    notes: '권한 보유자만 등록·수정할 수 있습니다. 확정 후에는 수정이 제한됩니다.',
    files: ['업무매뉴얼_v1.2.pdf'],
  };
}

/** LNB 정본 리프 → 프로그램 목록 + 도움말 데모 4건 + 미연결 임시 프로그램 1건(삭제 가능 예시) */
export function demoPrograms(menuRows: readonly MenuRow[]): ProgramRow[] {
  const rows: ProgramRow[] = programCatalog(menuRows).map((p, i) => {
    const seeded = HELP_SEED_INDEX.includes(i);
    return {
      id: p.leafId, pid: p.pid, pname: p.pname, gubun: p.menuPath.split(' › ')[0] ?? '', menuPath: p.menuPath, use: p.use, linked: true,
      help: seeded, helpDoc: seeded ? seedHelp(p.pname) : emptyHelpDoc(), helpBy: seeded ? '김담당' : '', helpAt: seeded ? '2026-08-20 14:05' : '',
      by: '전산관리', at: '2026-08-16 10:22',
    };
  });
  rows.push({ id: 'tmp-1', pid: 'CO9001', pname: '(미사용) 임시 배치 프로그램', gubun: '공통', menuPath: '', use: false, linked: false, help: false, helpDoc: emptyHelpDoc(), helpBy: '', helpAt: '', by: '전산관리', at: '2026-08-25 09:10' });
  return rows;
}

export type ProgramField = 'pid' | 'pname';
export interface ProgramFilter { field?: ProgramField; kw?: string; help?: '' | 'y' | 'n'; use?: '' | '여' | '부'; gubun?: string }
/** 목업 applyFilter + 구분(브리프) */
export function filterPrograms(rows: readonly ProgramRow[], f: ProgramFilter): ProgramRow[] {
  const kw = (f.kw ?? '').trim().toLowerCase();
  const field = f.field ?? 'pid';
  return rows.filter((r) =>
    (!f.help || (f.help === 'y') === r.help)
    && (!f.use || (r.use ? '여' : '부') === f.use)
    && (!f.gubun || r.gubun === f.gubun)
    && (!kw || String(r[field]).toLowerCase().includes(kw)));
}

/** 구분 옵션 — 등장 순서 유지 */
export function gubunOptions(rows: readonly ProgramRow[]): string[] {
  return [...new Set(rows.map((r) => r.gubun).filter(Boolean))];
}

/** 삭제 게이트(목업 subAlert): 메뉴에 연결된 프로그램은 삭제 불가 — 사유 문구를 돌려준다, 가능하면 null */
export function deleteBlocker(r: Pick<ProgramRow, 'linked'>): string | null {
  return r.linked ? '메뉴에 연결된 프로그램은 삭제할 수 없습니다. 먼저 메뉴관리에서 이 프로그램의 연결(프로그램ID)을 해제한 뒤 삭제하세요.' : null;
}

/** 프로그램ID 중복(대소문자 무시). 수정 중인 자기 자신은 excludeId 로 제외 */
export function programPidTaken(rows: readonly Pick<ProgramRow, 'id' | 'pid'>[], pid: string, excludeId?: string): boolean {
  const n = pid.trim().toLowerCase();
  return rows.some((r) => r.id !== excludeId && r.pid.toLowerCase() === n);
}

/** 도움말 저장 전 정리(목업 hp-save): 앞뒤 공백 제거 + 빈 항목 제거. 입력은 그대로 두고 새 문서를 돌려준다 */
export function normalizeHelpDoc(d: HelpDoc): HelpDoc {
  const t = (s: string) => (s ?? '').trim();
  return {
    overview: t(d.overview),
    images: d.images.map((x) => ({ name: t(x.name) })).filter((x) => x.name),
    items: d.items.map((x) => ({ label: t(x.label), desc: t(x.desc) })).filter((x) => x.label || x.desc),
    steps: d.steps.map(t).filter(Boolean),
    faqs: d.faqs.map((x) => ({ q: t(x.q), a: t(x.a) })).filter((x) => x.q || x.a),
    notes: t(d.notes),
    files: d.files.map(t).filter(Boolean),
  };
}

/** 도움말 검증 — 제공(on)이면 화면 개요 필수. 오류 키 또는 null */
export const helpDocError = (on: boolean, d: HelpDoc): 'overview' | null => (on && !d.overview.trim() ? 'overview' : null);

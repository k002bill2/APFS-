/* 파일BOX(FRT005) 규칙 — 순수 함수(페이지·GNB 팝업은 배선만). 전부 새 배열을 돌려주고 입력을 바꾸지 않는다.
   출처: `파일BOX_목업.html` 스크립트 renderMy·renderSub·addMyFile·subfile-save. */
import type { MyFile, SubFile } from './file_box_data';

/** 바이트 → '320KB' · '1.8MB'. 크기를 모르는 행(업로드 직후 — 드롭존이 파일명만 준다)은 '-' */
export function fmtSize(size: number | null): string {
  if (size == null) return '-';
  if (size < 1024 * 1024) return String(Math.max(1, Math.round(size / 1024))) + 'KB';
  return (size / (1024 * 1024)).toFixed(1) + 'MB';
}

const norm = (s: string) => s.trim().toLowerCase();
const has = (value: string, q: string) => !q || value.toLowerCase().includes(q);

export type MyFilter = Readonly<{ name: string }>;
export type SubFilter = Readonly<{ org: string; fund: string; co: string; name: string }>;
export const MY_F0: MyFilter = Object.freeze({ name: '' });
export const SUB_F0: SubFilter = Object.freeze({ org: '', fund: '', co: '', name: '' });

/** 내 파일함 — 파일명 부분일치(목업 my-q) */
export function filterMy(rows: readonly MyFile[], f: MyFilter): MyFile[] {
  const q = norm(f.name);
  return rows.filter((r) => has(r.name, q));
}

/** 운용사 제출 파일 — 운용사·조합명·투자기업은 상세필터 select 값(정확일치), 파일명은 부분일치. 전부 AND */
export function filterSub(rows: readonly SubFile[], f: SubFilter): SubFile[] {
  const q = norm(f.name);
  return rows.filter((r) => (!f.org || r.org === f.org) && (!f.fund || r.fund === f.fund) && (!f.co || r.co === f.co) && has(r.name, q));
}

/** GNB 팝업 검색 한 칸 — 운용사·조합명·투자기업·파일명 중 하나라도 부분일치 */
export function filterSubKeyword(rows: readonly SubFile[], keyword: string): SubFile[] {
  const q = norm(keyword);
  return rows.filter((r) => !q || [r.org, r.fund, r.co, r.name].some((v) => has(v, q)));
}

/** 상세필터 선택지 — 중복 제거 + 가나다순 */
export function optionsOf(rows: readonly SubFile[], key: 'org' | 'fund' | 'co'): string[] {
  return [...new Set(rows.map((r) => r[key]))].sort((a, b) => a.localeCompare(b, 'ko'));
}

/** 업로드 — 새 파일을 맨 앞에(목업 unshift). 크기는 모름(null) */
export function addMyFiles(rows: readonly MyFile[], names: readonly string[], today: string, mkId: () => string): MyFile[] {
  return [...names.map((name) => ({ id: mkId(), name, size: null, date: today })), ...rows];
}

export function deleteMyFiles(rows: readonly MyFile[], ids: readonly string[]): MyFile[] {
  const drop = new Set(ids);
  return rows.filter((r) => !drop.has(r.id));
}

/* ── 운용사 제출 파일 추가·교체(목업 subfile 팝업) — 원본 편집이 아니라 담당자가 대신 보완하거나 잘못 낸 파일을 바꾼다 ── */
export type SupplementMode = 'add' | 'replace';
/** 구분 라디오 — 목업 select 문구 그대로, 첫째(추가)가 기본 */
export const SUPPLEMENT_MODES: readonly { code: SupplementMode; label: string }[] = [
  { code: 'add', label: '추가 업로드(누락분 보완)' },
  { code: 'replace', label: '교체(잘못 제출된 파일 대체)' },
];

export function supplementSub(rows: readonly SubFile[], p: Readonly<{ id: string; mode: SupplementMode; fileName: string; today: string; newId: string }>): SubFile[] {
  const i = rows.findIndex((r) => r.id === p.id);
  if (i < 0) return [...rows];
  const t = rows[i];
  if (p.mode === 'replace') return rows.map((r) => (r.id === p.id ? { ...r, name: p.fileName, size: null, date: p.today } : r));
  const added: SubFile = { id: p.newId, org: t.org, fund: t.fund, co: t.co, name: p.fileName, size: null, date: p.today };
  return [...rows.slice(0, i + 1), added, ...rows.slice(i + 1)];
}

/** 저장 검증 — 파일만 필수(목업 '파일을 선택하세요.'), 사유는 선택 */
export function validateSupplement(d: Readonly<{ fileName: string }>): { key: 'file'; msg: string } | null {
  return d.fileName.trim() ? null : { key: 'file', msg: '파일을 선택하세요.' };
}

/** 추가·교체 팝업 '대상' 칸(목업 subfile-target) */
export const targetLabel = (r: SubFile) => [r.org, r.fund, r.co, r.name].join(' · ');

/* ── 다운로드(백엔드 없음 — 목업 텍스트) ──
   1개 = '원본명.txt' 하나를 바로 · 여러 개 = ZIP 하나(운용사 제출은 운용사/조합명/투자기업 폴더).
   내용은 안내 텍스트라 확장자를 .txt 로 붙인다 — 원본 확장자 그대로 두면 깨진 PDF·XLSX 처럼 보인다. */
type DlRow = MyFile | SubFile;
export type DownloadPlan = Readonly<{ kind: 'file' | 'zip'; fileName: string; entries: readonly { path: string; text: string }[] }>;

const isSub = (r: DlRow): r is SubFile => 'org' in r;
const safeSeg = (s: string) => s.replace(/[\\/:*?"<>|]/g, '_').trim() || '_';

function placeholderText(r: DlRow): string {
  return [
    '[목업 파일] 실제 파일은 백엔드 연동 후 내려받을 수 있습니다.',
    `원본 파일명: ${r.name}`,
    `크기: ${fmtSize(r.size)} · 등록일: ${r.date}`,
    ...(isSub(r) ? [`운용사: ${r.org} · 조합명: ${r.fund} · 투자기업: ${r.co}`] : []),
  ].join('\n') + '\n';
}

/** 같은 경로가 겹치면 확장자(.txt) 앞에 ' (2)'·' (3)' — 이미 내보낸 경로 전부와 대조해 붙인 번호가
    다른 원래 이름('r (2)')과도 겹치지 않을 때까지 올린다(겹치면 압축 해제기가 덮어쓰거나 건너뛴다) */
function uniquePaths(paths: readonly string[]): string[] {
  const used = new Set<string>();
  return paths.map((p) => {
    let candidate = p;
    for (let n = 2; used.has(candidate); n++) candidate = p.replace(/(\.txt)$/, ` (${String(n)})$1`);
    used.add(candidate);
    return candidate;
  });
}

export function downloadPlan(rows: readonly DlRow[], ymd: string): DownloadPlan {
  const raw = rows.map((r) => (isSub(r) ? [r.org, r.fund, r.co, r.name] : [r.name]).map(safeSeg).join('/') + '.txt');
  const paths = uniquePaths(raw);
  const entries = rows.map((r, i) => ({ path: paths[i], text: placeholderText(r) }));
  if (rows.length === 1) return { kind: 'file', fileName: safeSeg(rows[0].name) + '.txt', entries };
  const label = rows.some(isSub) ? '운용사 제출 파일' : '내 파일함';
  return { kind: 'zip', fileName: `파일BOX_${label}_${ymd}.zip`, entries };
}

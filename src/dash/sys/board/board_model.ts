/* 게시판관리(ADM-013) — 순수 모델(UI 없음). 출처: 게시판관리.html 하단 스크립트
   `status`·`filtered`·`openPublish`·`openDelete`·`openPostForm`(bodyOn·저장 검증·nr 조립).
   업무 규칙: 저장 = 미게시로만 저장 · [게시] = 미게시 행만 확정 · 게시된 글을 수정하면 다시 미게시 ·
   상태 = 기준일(TODAY 고정) 대비 게시기간으로 게시예정/게시중/게시종료.
   ⚠ 실제 게시·팝업 송출이 아니다 — 화면 로컬 더미 상태만 바꾼다. */
import { safeUrl } from '../../fields/safeUrl';
import { parseFileNames } from '../../fields/file_names';
import { TODAY, CLK_NONE, GENERAL_KIND } from './board_data';
import type { Audience, ClickSpec, DispType, LinkKind, LinkTarget, PostKind, PostRow } from './board_data';

export const POST_STATUSES = ['미게시', '게시예정', '게시중', '게시종료'] as const;
export type PostStatus = typeof POST_STATUSES[number];
/* 목업 배지: 게시중=초록(on) · 게시예정=주황(wait) · 게시종료=회색(end) · 미게시=점선(draft — StatusBadge 에 점선이 없어 info) */
export const STATUS_TONE: Readonly<Record<PostStatus, 'success' | 'warning' | 'muted' | 'info'>> = Object.freeze({
  '미게시': 'info', '게시예정': 'warning', '게시중': 'success', '게시종료': 'muted',
});

/** 목업 status() — 미게시 → (기준일 < 시작) 게시예정 → (기준일 > 종료) 게시종료 → 게시중. 시작일·종료일 당일은 게시중. */
export function postStatus(r: Pick<PostRow, 'pub' | 'from' | 'to'>, today: string = TODAY): PostStatus {
  if (!r.pub) return '미게시';
  if (today < r.from) return '게시예정';
  if (today > r.to) return '게시종료';
  return '게시중';
}

/** 게시 종류 표시값 — 없으면 '일반' 한 개. */
export const kindLabels = (r: Pick<PostRow, 'kinds'>): string[] => (r.kinds.length ? [...r.kinds] : [GENERAL_KIND]);
/** 한 글에 붙은 게시 종류 수의 최대값(일반 글 = 0) — 목록 '게시 종류' 칸 폭을 정한다. */
export const maxKindCount = (rows: readonly Pick<PostRow, 'kinds'>[]): number => rows.reduce((m, r) => Math.max(m, r.kinds.length), 0);

export interface PostFilter { from?: string; to?: string; aud?: string; kind?: string; status?: string; q?: string }
/** 목업 filtered() — 등록기간(빈 값 = 열린 경계) · 게시대상('전체' 대상 글은 모든 구분에 보인다) · 게시 종류 · 상태 · 제목 부분일치.
    결과는 등록일 최신순(새 배열, 같은 날은 원래 순서). */
export function filterPosts(rows: readonly PostRow[], f: PostFilter, today: string = TODAY): PostRow[] {
  const q = (f.q ?? '').trim();
  const out = rows.filter((r) => {
    if (f.from && r.reg < f.from) return false;
    if (f.to && r.reg > f.to) return false;
    if (f.aud && !r.aud.includes(f.aud as Audience) && !r.aud.includes('전체')) return false;
    if (f.kind && (f.kind === GENERAL_KIND ? r.kinds.length > 0 : !r.kinds.includes(f.kind as PostKind))) return false;
    if (f.status && postStatus(r, today) !== f.status) return false;
    if (q && !r.title.includes(q)) return false;
    return true;
  });
  return out.sort((a, b) => (a.reg < b.reg ? 1 : a.reg > b.reg ? -1 : 0));
}

/** 상태별 건수(툴바 칩 facet count) */
export function statusCounts(rows: readonly PostRow[], today: string = TODAY): Record<PostStatus, number> {
  const c: Record<PostStatus, number> = { '미게시': 0, '게시예정': 0, '게시중': 0, '게시종료': 0 };
  for (const r of rows) c[postStatus(r, today)]++;
  return c;
}

/* ── 게시 확정 ── */
/** 게시 게이트 — 미게시 행만 대상. blocked = 이미 게시된 건수(목업 "이미 게시된 N건은 제외합니다"). */
export function publishGate(targets: readonly PostRow[]): { ok: PostRow[]; blocked: number } {
  const ok = targets.filter((r) => !r.pub);
  return { ok, blocked: targets.length - ok.length };
}
/** 확인창 행별 안내(목업 openPublish) */
export function publishNote(r: Pick<PostRow, 'from' | 'to'>, today: string = TODAY): string {
  if (today < r.from) return `${r.from}부터 게시`;
  if (today > r.to) return '게시기간 지남 — 화면에 안 보임';
  return '바로 게시';
}
/** 게시 확정 — ids 중 미게시 행에만 게시 정보를 단다(이미 게시된 행은 그대로). 새 배열. */
export function publishPosts(rows: readonly PostRow[], ids: readonly string[], at: string, by: string): PostRow[] {
  const set = new Set(ids);
  return rows.map((r) => (set.has(r.id) && !r.pub ? { ...r, pub: { at, by } } : r));
}

/* ── 삭제 ── */
export function deletePosts(rows: readonly PostRow[], ids: readonly string[]): PostRow[] {
  const set = new Set(ids);
  return rows.filter((r) => !set.has(r.id));
}
/** 함께 내려가는 팝업·배너 수(목업 openDelete `xpCount` 합) */
export function popupCount(rows: readonly PostRow[], ids: readonly string[]): number {
  const set = new Set(ids);
  return rows.reduce((n, r) => n + (set.has(r.id) ? r.kinds.length : 0), 0);
}

/* ── 등록·수정 ── */
/** 본문 입력 노출 — 일반 글이거나 표시 형태가 '게시글 내용'일 때만(목업 bodyOn) */
export const showBody = (kinds: readonly PostKind[], dispType: DispType): boolean => kinds.length === 0 || dispType === 'text';

/** 웹주소 검증 — 목업 `/^https?:\/\/.+/` + safeUrl(nav) 통과(스킴 난독화 방어 — fields/safeUrl.ts) */
export function validClickUrl(url: string): boolean {
  const u = url.trim();
  return /^https?:\/\/\S/.test(u) && safeUrl(u, 'nav') !== undefined;
}

const IMG_EXT = /\.(jpe?g|png|gif)$/i;
/** 첨부 중 이미지(표시 형태 '이미지' 후보) */
export const imageFiles = (csv: string): string[] => parseFileNames(csv).filter((n) => IMG_EXT.test(n));
/** select 현재값 — 후보에 있으면 그대로, 없으면 첫 후보(목업 select 기본 선택), 후보가 없으면 '' */
export const pickOption = (cur: string, options: readonly string[]): string => (options.includes(cur) ? cur : options[0] ?? '');

/** 등록창 편집본 */
export interface PostDraft {
  from: string; to: string; aud: Audience[]; kinds: PostKind[]; title: string; body: string; file: string;
  dispType: DispType; img: string; link: LinkKind; url: string; linkFile: string; target: LinkTarget;
}
/** 편집본 초기값 — 목업 openPostForm(신규: 시작일=기준일·대상 '전체' / 수정: 저장값, 표시 형태 미지정이면 종류 유무로) */
export function draftOf(r: PostRow | null, today: string = TODAY): PostDraft {
  if (!r) return { from: today, to: '', aud: ['전체'], kinds: [], title: '', body: '', file: '', dispType: 'text', img: '', link: 'none', url: '', linkFile: '', target: 'new' };
  const ck = r.click ?? CLK_NONE;
  const dispType: DispType = r.disp?.type ?? (r.kinds.length ? 'img' : 'text');
  return { from: r.from, to: r.to, aud: [...r.aud], kinds: [...r.kinds], title: r.title, body: r.body, file: r.file,
    dispType, img: r.disp?.img ?? '', link: ck.link, url: ck.url, linkFile: ck.file, target: ck.target };
}

export type DraftErrKey = 'title' | 'period' | 'aud' | 'img' | 'url' | 'linkFile';
/** 저장 검증 — 목업 fm-save 순서·문구 그대로. 첫 위반 1건(없으면 null). 이미지·연결 파일은 첨부 후보 기준. */
export function validateDraft(d: PostDraft): { key: DraftErrKey; msg: string } | null {
  if (!d.title.trim()) return { key: 'title', msg: '제목을 입력하세요' };
  if (!d.from || !d.to) return { key: 'period', msg: '게시기간을 입력하세요' };
  if (d.to < d.from) return { key: 'period', msg: '종료일이 시작일보다 빠를 수 없습니다' };
  if (!d.aud.length) return { key: 'aud', msg: '게시대상을 선택하세요' };
  if (!d.kinds.length) return null;   // 일반 글은 팝업·배너 설정을 쓰지 않는다
  if (d.dispType === 'img' && !pickOption(d.img, imageFiles(d.file))) return { key: 'img', msg: '팝업·배너에 띄울 이미지를 첨부파일에서 골라 주세요' };
  if (d.link === 'url' && !validClickUrl(d.url)) return { key: 'url', msg: '웹주소를 http:// 또는 https://로 시작하게 입력하세요' };
  if (d.link === 'file' && !pickOption(d.linkFile, parseFileNames(d.file))) return { key: 'linkFile', msg: '눌렀을 때 열 파일을 첨부파일에서 골라 주세요' };
  return null;
}

/** 편집본 → 저장 행(목업 nr). 항상 미게시(pub null). 수정이면 id·등록일·작성자 유지, 신규면 등록일=기준일·작성자=로그인 사용자.
    본문은 노출 조건일 때만 남기고, 일반 글이면 표시 형태·클릭 시 이동을 비운다. */
export function buildPost(d: PostDraft, base: { id: string; reg: string; writer: string }): PostRow {
  const any = d.kinds.length > 0;
  const files = parseFileNames(d.file);
  const click: ClickSpec = !any ? CLK_NONE : {
    link: d.link,
    url: d.link === 'url' ? d.url.trim() : '',
    file: d.link === 'file' ? pickOption(d.linkFile, files) : '',
    target: d.target,
  };
  return {
    id: base.id, pub: null, reg: base.reg, aud: [...d.aud], title: d.title.trim(), from: d.from, to: d.to,
    file: files.join(', '), writer: base.writer, body: showBody(d.kinds, d.dispType) ? d.body : '',
    kinds: [...d.kinds],
    disp: !any ? null : d.dispType === 'text' ? { type: 'text' } : { type: 'img', img: pickOption(d.img, imageFiles(d.file)) },
    click,
  };
}

/** 저장 반영 — 수정은 그 자리 교체(게시 중이던 글은 미게시로 내려간다), 신규는 맨 앞. wasPublished = 토스트 안내용. */
export function savePost(rows: readonly PostRow[], d: PostDraft, opts: { editId: string | null; newId: string; writer: string; today?: string }): { rows: PostRow[]; row: PostRow; wasPublished: boolean } {
  const prev = opts.editId ? rows.find((r) => r.id === opts.editId) ?? null : null;
  if (prev) {
    const row = buildPost(d, { id: prev.id, reg: prev.reg, writer: prev.writer });
    return { rows: rows.map((r) => (r.id === prev.id ? row : r)), row, wasPublished: !!prev.pub };
  }
  const row = buildPost(d, { id: opts.newId, reg: opts.today ?? TODAY, writer: opts.writer });
  return { rows: [row, ...rows], row, wasPublished: false };
}

/* ── 미리보기 본문 ── */
const INLINE_TYPES = new Set(['a']);   // Slate 인라인 요소(링크) — 문단을 끊지 않는다
type SNode = { text?: string; type?: string; children?: SNode[] };
const leafText = (n: SNode): string => (typeof n.text === 'string' ? n.text : (n.children ?? []).map(leafText).join(''));
function slateLines(nodes: readonly SNode[]): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    const kids = Array.isArray(n?.children) ? n.children : [];
    const nested = kids.some((k) => Array.isArray(k?.children) && !INLINE_TYPES.has(k.type ?? ''));
    if (nested) out.push(...slateLines(kids));
    else { const t = leafText(n).trim(); if (t) out.push(t); }
  }
  return out;
}
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&nbsp;': ' ' };
/** 본문 → 문단 텍스트 배열(서식 없음). 값이 Slate JSON(`[`…)이면 노드 트리에서, 아니면 HTML 태그를 걷어 문단을 나눈다.
    미리보기는 이 텍스트만 React 텍스트로 그린다 — 저장된 HTML 을 DOM 에 그대로 주입하지 않는다(XSS). */
export function bodyParagraphs(body: string): string[] {
  const s = (body ?? '').trim();
  if (!s) return [];
  if (s.startsWith('[')) {
    try { const v = JSON.parse(s); if (Array.isArray(v)) return slateLines(v as SNode[]); } catch { /* JSON 이 아니면 HTML 로 처리 */ }
  }
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .split('\n').map((t) => t.trim()).filter(Boolean);
}

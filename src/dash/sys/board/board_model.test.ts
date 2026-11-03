import { describe, expect, it } from 'vitest';
import { demoPosts, TODAY, LOGIN_WRITER, CLK_NONE } from './board_data';
import type { PostRow } from './board_data';
import {
  postStatus, kindLabels, filterPosts, statusCounts, publishGate, publishNote, publishPosts, deletePosts, popupCount,
  showBody, validClickUrl, imageFiles, pickOption, draftOf, validateDraft, buildPost, savePost, bodyParagraphs,
} from './board_model';
import type { PostDraft } from './board_model';

const rows = demoPosts();
const by = (id: string): PostRow => rows.find((r) => r.id === id)!;
const ids = (rs: readonly PostRow[]) => rs.map((r) => r.id);
const pubAt = (from: string, to: string) => ({ pub: { at: 'x', by: 'y' }, from, to });

describe('데모 데이터(목업 DATA.post → 화면 행)', () => {
  it('12건 · 기준일 2026-10-28 고정', () => { expect(rows).toHaveLength(12); expect(TODAY).toBe('2026-10-28'); });
  it('게시 종류 xw·xz·xb → kinds, 없으면 일반', () => {
    expect(by('p8').kinds).toEqual(['팝업창']);
    expect(by('p1').kinds).toEqual(['팝업존']);
    expect(by('p9').kinds).toEqual(['배너']);
    expect(by('p3').kinds).toEqual([]);
    expect(kindLabels(by('p3'))).toEqual(['일반']);
  });
  it('표시 형태 미지정 + 종류 있음 = 이미지(image_<id>.png 를 첨부에 포함), 지정 text 는 유지, 일반 글은 null', () => {
    expect(by('p8').disp).toEqual({ type: 'img', img: 'image_p8.png' });
    expect(by('p8').file).toBe('연말_출자금_납입일정.pdf, image_p8.png');
    expect(by('p2').disp).toEqual({ type: 'text' });
    expect(by('p2').file).toBe('');
    expect(by('p3').disp).toBeNull();
  });
  it('호출마다 새 배열·새 객체', () => {
    const a = demoPosts(), b = demoPosts();
    expect(a).not.toBe(b); expect(a[0]).not.toBe(b[0]); expect(a[0].aud).not.toBe(b[0].aud);
  });
});

describe('postStatus — 기준일 대비 게시기간', () => {
  it('데모: p8 미게시 · p1 게시중 · p3 게시예정 · p5 게시종료', () => {
    expect(postStatus(by('p8'))).toBe('미게시');
    expect(postStatus(by('p1'))).toBe('게시중');
    expect(postStatus(by('p3'))).toBe('게시예정');
    expect(postStatus(by('p5'))).toBe('게시종료');
  });
  it('경계: 시작일 당일·종료일 당일은 게시중, 하루 전/후는 예정/종료', () => {
    expect(postStatus(pubAt(TODAY, '2026-12-31'))).toBe('게시중');
    expect(postStatus(pubAt('2026-01-01', TODAY))).toBe('게시중');
    expect(postStatus(pubAt('2026-10-29', '2026-12-31'))).toBe('게시예정');
    expect(postStatus(pubAt('2026-01-01', '2026-10-27'))).toBe('게시종료');
  });
  it('게시 확정 전이면 기간과 무관하게 미게시', () => {
    expect(postStatus({ pub: null, from: '2026-01-01', to: '2026-12-31' })).toBe('미게시');
  });
  it('기준일 인자로 재계산', () => { expect(postStatus(by('p1'), '2026-12-01')).toBe('게시종료'); });
});

describe('filterPosts — 목업 filtered()', () => {
  it('조건 없음 = 전체, 등록일 최신순, 입력 불변', () => {
    const before = ids(rows);
    const out = filterPosts(rows, {});
    expect(out).toHaveLength(12);
    expect(out.map((r) => r.reg)).toEqual([...out.map((r) => r.reg)].sort().reverse());
    expect(ids(rows)).toEqual(before);
    expect(out).not.toBe(rows);
  });
  it('등록기간 — 양 끝 포함, 한쪽만 있으면 열린 경계', () => {
    expect(ids(filterPosts(rows, { from: '2026-10-24', to: '2026-10-27' })).sort()).toEqual(['p1', 'p2', 'p8']);
    expect(filterPosts(rows, { to: '2025-12-31' }).map((r) => r.id)).toEqual(['p12']);
    expect(filterPosts(rows, { from: '2026-10-20' })).toHaveLength(4);
  });
  it("게시대상 — 그 구분 또는 '전체' 대상 글", () => {
    const out = ids(filterPosts(rows, { aud: '농금원' }));
    expect(out).toContain('p5');
    expect(out).not.toContain('p4');   // 수탁기관 전용
    expect(out).toHaveLength(11);
  });
  it("게시 종류 — '일반' = 종류 없음, 그 외 = 그 종류 포함", () => {
    expect(ids(filterPosts(rows, { kind: '일반' })).sort()).toEqual(['p3', 'p5', 'p6', 'p7']);
    expect(ids(filterPosts(rows, { kind: '배너' })).sort()).toEqual(['p10', 'p11', 'p12', 'p9']);
    expect(ids(filterPosts(rows, { kind: '팝업창' })).sort()).toEqual(['p2', 'p8']);
  });
  it('상태·제목 부분일치', () => {
    expect(ids(filterPosts(rows, { status: '미게시' }))).toEqual(['p8']);
    expect(ids(filterPosts(rows, { q: '바로가기' })).sort()).toEqual(['p10', 'p11', 'p9']);
    expect(filterPosts(rows, { q: '  ' })).toHaveLength(12);
  });
  it('statusCounts 합 = 행 수', () => {
    const c = statusCounts(rows);
    expect(c['미게시']).toBe(1);
    expect(c['미게시'] + c['게시예정'] + c['게시중'] + c['게시종료']).toBe(12);
  });
});

describe('게시 확정 — 미게시만', () => {
  it('publishGate: 미게시만 ok, 나머지는 blocked 건수', () => {
    const g = publishGate([by('p8'), by('p1'), by('p2')]);
    expect(ids(g.ok)).toEqual(['p8']);
    expect(g.blocked).toBe(2);
    expect(publishGate([by('p1')]).ok).toHaveLength(0);
  });
  it('publishNote: 시작 전 / 기간 지남 / 바로', () => {
    expect(publishNote(by('p8'))).toBe('2026-11-10부터 게시');
    expect(publishNote(by('p5'))).toBe('게시기간 지남 — 화면에 안 보임');
    expect(publishNote(by('p1'))).toBe('바로 게시');
  });
  it('publishPosts: 대상 미게시 행만 게시 정보, 이미 게시된 행은 그대로, 입력 불변', () => {
    const out = publishPosts(rows, ['p8', 'p1'], '2026-10-28 10:00', LOGIN_WRITER);
    expect(out.find((r) => r.id === 'p8')!.pub).toEqual({ at: '2026-10-28 10:00', by: LOGIN_WRITER });
    expect(out.find((r) => r.id === 'p1')!.pub).toBe(by('p1').pub);
    expect(postStatus(out.find((r) => r.id === 'p8')!)).toBe('게시예정');
    expect(by('p8').pub).toBeNull();
  });
});

describe('선택 삭제', () => {
  it('deletePosts: 지정 id 만 제거, 입력 불변', () => {
    const out = deletePosts(rows, ['p8', 'p9']);
    expect(out).toHaveLength(10);
    expect(ids(out)).not.toContain('p8');
    expect(rows).toHaveLength(12);
  });
  it('popupCount: 함께 내려가는 팝업·배너 수', () => {
    expect(popupCount(rows, ['p8', 'p9', 'p3'])).toBe(2);
    expect(popupCount(rows, ['p3'])).toBe(0);
  });
});

describe('등록창 규칙', () => {
  it('showBody: 일반 글 또는 표시 형태=게시글 내용', () => {
    expect(showBody([], 'img')).toBe(true);
    expect(showBody(['팝업창'], 'text')).toBe(true);
    expect(showBody(['팝업창'], 'img')).toBe(false);
  });
  it('validClickUrl: http(s)만 + safeUrl 통과', () => {
    expect(validClickUrl('https://www.mafra.go.kr')).toBe(true);
    expect(validClickUrl('http://apfs.kr/a?b=1')).toBe(true);
    expect(validClickUrl('www.mafra.go.kr')).toBe(false);
    expect(validClickUrl('https://')).toBe(false);
    expect(validClickUrl('javascript:alert(1)')).toBe(false);
    expect(validClickUrl('java\tscript:alert(1)')).toBe(false);
    expect(validClickUrl('data:text/html,<b>x</b>')).toBe(false);
    expect(validClickUrl('ftp://host/file')).toBe(false);
  });
  it('imageFiles·pickOption: 이미지 첨부만 · 현재값 없으면 첫 후보', () => {
    expect(imageFiles('a.pdf, b.PNG, c.jpeg, d.gif, e.hwp')).toEqual(['b.PNG', 'c.jpeg', 'd.gif']);
    expect(pickOption('c', ['a', 'c'])).toBe('c');
    expect(pickOption('z', ['a', 'c'])).toBe('a');
    expect(pickOption('z', [])).toBe('');
  });
  it('draftOf: 신규 기본값 / 수정은 저장값', () => {
    expect(draftOf(null)).toMatchObject({ from: TODAY, to: '', aud: ['전체'], kinds: [], dispType: 'text', link: 'none', target: 'new' });
    expect(draftOf(by('p8'))).toMatchObject({ kinds: ['팝업창'], dispType: 'img', img: 'image_p8.png', link: 'file', linkFile: '연말_출자금_납입일정.pdf' });
    expect(draftOf(by('p3')).dispType).toBe('text');
  });
});

describe('validateDraft — 목업 저장 검증 순서·문구', () => {
  const ok: PostDraft = { ...draftOf(null), title: '공지', to: '2026-11-30' };
  it('일반 글 정상 = null', () => { expect(validateDraft(ok)).toBeNull(); });
  it('제목 → 게시기간 → 순서 → 게시대상', () => {
    expect(validateDraft({ ...ok, title: '  ' })).toEqual({ key: 'title', msg: '제목을 입력하세요' });
    expect(validateDraft({ ...ok, to: '' })).toEqual({ key: 'period', msg: '게시기간을 입력하세요' });
    expect(validateDraft({ ...ok, to: '2026-10-27' })).toEqual({ key: 'period', msg: '종료일이 시작일보다 빠를 수 없습니다' });
    expect(validateDraft({ ...ok, to: TODAY })).toBeNull();
    expect(validateDraft({ ...ok, aud: [] })?.key).toBe('aud');
    expect(validateDraft({ ...ok, title: '', aud: [] })?.key).toBe('title');
  });
  it('일반 글은 팝업·배너 설정을 검사하지 않는다', () => {
    expect(validateDraft({ ...ok, dispType: 'img', link: 'url', url: 'bad' })).toBeNull();
  });
  it('팝업·배너: 이미지 첨부 없음 / 웹주소 형식 / 연결 파일 없음', () => {
    const xp: PostDraft = { ...ok, kinds: ['배너'], dispType: 'img', file: 'a.pdf' };
    expect(validateDraft(xp)?.key).toBe('img');
    expect(validateDraft({ ...xp, file: 'a.pdf, b.png' })).toBeNull();
    expect(validateDraft({ ...xp, dispType: 'text', link: 'url', url: 'mafra.go.kr' })).toEqual({ key: 'url', msg: '웹주소를 http:// 또는 https://로 시작하게 입력하세요' });
    expect(validateDraft({ ...xp, dispType: 'text', link: 'url', url: 'https://www.mafra.go.kr' })).toBeNull();
    expect(validateDraft({ ...xp, dispType: 'text', file: '', link: 'file' })?.key).toBe('linkFile');
    expect(validateDraft({ ...xp, dispType: 'text', link: 'file' })).toBeNull();
  });
});

describe('저장 — 항상 미게시, 수정하면 다시 미게시', () => {
  it('수정: id·등록일·작성자 유지, pub null, wasPublished', () => {
    const d = { ...draftOf(by('p1')), title: '개정 반영(수정)' };
    const r = savePost(rows, d, { editId: 'p1', newId: 'new', writer: LOGIN_WRITER });
    expect(r.wasPublished).toBe(true);
    expect(r.row).toMatchObject({ id: 'p1', reg: '2026-10-27', writer: '홍길동', pub: null, title: '개정 반영(수정)' });
    expect(postStatus(r.row)).toBe('미게시');
    expect(r.rows).toHaveLength(12);
    expect(r.rows.findIndex((x) => x.id === 'p1')).toBe(rows.findIndex((x) => x.id === 'p1'));
    expect(by('p1').pub).not.toBeNull();
  });
  it('신규: 맨 앞 · 등록일=기준일 · 작성자=로그인 사용자', () => {
    const d: PostDraft = { ...draftOf(null), title: '새 공지', to: '2026-11-30' };
    const r = savePost(rows, d, { editId: null, newId: 'p13', writer: LOGIN_WRITER });
    expect(r.rows[0]).toMatchObject({ id: 'p13', reg: TODAY, writer: LOGIN_WRITER, pub: null, disp: null });
    expect(r.rows[0].click).toEqual(CLK_NONE);
    expect(r.rows).toHaveLength(13);
    expect(r.wasPublished).toBe(false);
  });
  it('buildPost: 이미지 표시면 본문 비움 · 일반 글이면 표시 형태·클릭 비움 · 웹주소/파일 정리', () => {
    const base = { id: 'x', reg: TODAY, writer: LOGIN_WRITER };
    const img = buildPost({ ...draftOf(null), title: 't', to: TODAY, body: '<p>b</p>', kinds: ['팝업존'], dispType: 'img', file: 'a.pdf, z.png', link: 'url', url: ' https://a.kr ' }, base);
    expect(img.body).toBe('');
    expect(img.disp).toEqual({ type: 'img', img: 'z.png' });
    expect(img.click).toEqual({ link: 'url', url: 'https://a.kr', file: '', target: 'new' });
    const gen = buildPost({ ...draftOf(null), title: 't', to: TODAY, body: '<p>b</p>', dispType: 'img', link: 'url', url: 'https://a.kr' }, base);
    expect(gen.body).toBe('<p>b</p>');
    expect(gen.disp).toBeNull();
    expect(gen.click).toEqual(CLK_NONE);
    const file = buildPost({ ...draftOf(null), title: 't', to: TODAY, kinds: ['배너'], dispType: 'text', file: 'a.pdf, b.hwp', link: 'file', linkFile: 'gone.pdf', target: 'self' }, base);
    expect(file.click).toEqual({ link: 'file', url: '', file: 'a.pdf', target: 'self' });
  });
});

describe('bodyParagraphs — 미리보기 본문(서식 없는 문단)', () => {
  it('목업 HTML: 문단 분리 · 태그 제거 · 엔티티 복원', () => {
    expect(bodyParagraphs(by('p2').body)).toEqual(['정기점검으로 11월 1일(토) 22:00~24:00 서비스 이용이 일시 중단됩니다.', '이용에 불편을 드려 죄송합니다.']);
    expect(bodyParagraphs('<p>A &amp; B<br>C</p>')).toEqual(['A & B', 'C']);
    expect(bodyParagraphs('<p>&lt;script&gt;</p>')).toEqual(['<script>']);
  });
  it('에디터 Slate JSON: 블록마다 한 줄, 목록은 항목마다, 링크(인라인)는 문단 안', () => {
    const v = JSON.stringify([
      { type: 'p', children: [{ text: '안내 ' }, { type: 'a', url: 'https://a.kr', children: [{ text: '링크' }] }, { text: ' 끝' }] },
      { type: 'ul', children: [{ type: 'li', children: [{ type: 'lic', children: [{ text: '하나' }] }] }, { type: 'li', children: [{ type: 'lic', children: [{ text: '둘' }] }] }] },
      { type: 'p', children: [{ text: '  ' }] },
    ]);
    expect(bodyParagraphs(v)).toEqual(['안내 링크 끝', '하나', '둘']);
  });
  it('빈 값 = [] · 깨진 JSON 은 HTML 처리', () => {
    expect(bodyParagraphs('')).toEqual([]);
    expect(bodyParagraphs('[미완성')).toEqual(['[미완성']);
  });
});

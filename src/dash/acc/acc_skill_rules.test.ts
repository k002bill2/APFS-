/* 회계 화면 스킬 규약 가드 — 2026-10-30 점검에서 빠져 있던 3종(회계 대분류 루트: 대상이 baseinfo·slip·ledger 중분류).
   ① 목록 단축키(⌘P·⌥D·⌘⏎)는 상세필터(Sheet)가 열린 동안 끈다 — apfs-grid "단축키". 드로어가 덮은 뒤 그리드가 인쇄됐다(실측).
   ② AUTO_SIZE_CONTENT 그리드는 잔여폭 흡수 컬럼 1개(flex:1 + minWidth = width + suppressAutoSize, maxWidth 없음)
      — apfs-aggrid PR #362. 없으면 프레임이 컬럼 합보다 넓을 때 행이 마지막 컬럼에서 끝나 우측이 빈다(2560 실측 139px).
   ③ 삭제전표 거래처 칸 = 말줄임 렌더러 — display:flex 셀은 AG Grid 기본 말줄임이 안 걸려 글자가 '…' 없이 잘렸다. */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sep } from 'node:path';
import { readSrc, walkDash } from '../test_src';

const LIST_PAGES = [
  'account_code_manage.tsx', 'closing_form_manage.tsx',
  'general_journal_manage.tsx', 'deleted_journal_manage.tsx', 'suspense_manage.tsx',
  'missing_evidence_manage.tsx', 'journal_search_manage.tsx',
  /* 고정자산(ACC-018) */
  'depreciation_manage.tsx',
  /* 장부조회(ACC-009~014) — 재무상태표·손익계산서는 단축키가 공용 골격 statement_kit 에 있다 */
  'daily_monthly_manage.tsx', 'subledger_manage.tsx', 'general_ledger_manage.tsx', 'trial_balance_manage.tsx', 'statement_kit.tsx',
  /* 결산관리 */
  'closing_journal_manage.tsx', 'fiscal_rollover_manage.tsx',
  /* 농식품경영체(ACC-023·024) */
  'agrifood_entity_manage.tsx', 'ir_info_manage.tsx',
  /* 설정 — 휴일관리(ACC-025) holiday_manage.tsx 는 상세필터 없음(2026-11-06 사용자 결정) → 대상 아님 */
  'partner_manage.tsx',   // ACC-026
  /* 자금관리(ACC-019~022) · 유무형자산(ACC-017) — 2026-11-09 점검에서 목록 누락 확인(코드는 이미 !filterOpen) */
  'account_balance_manage.tsx', 'bank_account_manage.tsx', 'contribution_status_manage.tsx', 'daily_cash_manage.tsx', 'fixed_asset_manage.tsx',
];

describe('① 회계 목록 단축키 — 상세필터가 열린 동안 끔', () => {
  it.each(LIST_PAGES)('%s', (f) => {
    const src = readSrc(f);
    const calls = src.match(/useHotkey\(HOTKEYS\.(print|export|register)\.combo[^;]*;/g) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const c of calls) {
      /* enabled 식 안의 이름(listKeys 등)은 그 const 정의로 펼친다 — `listKeys && tab === 'summary'` 같은 합성식도 판정 */
      const expr = c.match(/enabled: ([^,}]*)/)?.[1].trim() ?? '';   // 쉼표 뒤 skipInDialog 등 다른 옵션은 제외
      const named = expr.replace(/\b[A-Za-z_]\w*\b/g, (w) => src.match(new RegExp(`const ${w} = ([^;]*);`))?.[1] ?? w);
      expect(named, c).toMatch(/!filterOpen/);
    }
  });
});

describe('② AUTO_SIZE_CONTENT 회계 그리드 — 잔여폭 흡수 컬럼 1개', () => {
  const autoSized = walkDash()
    .filter((p) => p.includes(`${sep}acc${sep}`) && p.endsWith('.tsx'))
    .filter((p) => readFileSync(p, 'utf8').includes('autoSizeStrategy={AUTO_SIZE_CONTENT}'));

  it('대상이 있다(경로가 바뀌어 0건 통과하지 않게)', () => { expect(autoSized.length).toBeGreaterThan(0); });

  it.each(autoSized)('%s', (p) => {
    const stretch = readFileSync(p, 'utf8').split('\n').filter((l) => l.includes('headerName:') && l.includes('suppressAutoSize: true'));
    expect(stretch).toHaveLength(1);
    expect(stretch[0]).toMatch(/flex: 1, minWidth: (\d+), width: \1, suppressAutoSize: true/);
    expect(stretch[0]).not.toMatch(/maxWidth/);
  });
});

/* ④ 푸터 페이저 = ‹ 이전 · 페이지 번호 · 다음 › — apfs-grid "푸터 골드 양식"(IconBtn chevron + PageBtn).
   2026-11-09 점검: 11-06 신규 6화면이 ‹ › 만 두어 몇 쪽인지·어느 쪽인지 보이지 않았다(회계 밖은 28곳 중 25곳이 번호). */
const PAGER_PAGES = [
  'closing_journal_manage.tsx', 'fixed_asset_manage.tsx', 'general_journal_manage.tsx', 'suspense_manage.tsx',
  'bank_account_manage.tsx', 'contribution_status_manage.tsx', 'agrifood_entity_manage.tsx', 'ir_info_manage.tsx',
  'holiday_manage.tsx', 'partner_manage.tsx',
  /* 2026-11-09 2차 — 10-28~11-03 화면 */
  'account_code_manage.tsx', 'deleted_journal_manage.tsx', 'missing_evidence_manage.tsx', 'journal_search_manage.tsx',
];
describe('④ 회계 페이저 — 페이지 번호 버튼', () => {
  it.each(PAGER_PAGES)('%s', (f) => {
    const src = readSrc(f);
    expect(src).toMatch(/<PageBtn key=\{i\} n=\{i \+ 1\} active=\{i === page\.current\} onClick=\{\(\) => apiRef\.current\?\.paginationGoToPage\(i\)\} \/>/);
    expect(src).toMatch(/aria-current=\{active \? 'page' : undefined\}/);
  });
  /* 쪽이 많은 화면 = 공용 생략형 GridPager(`1 … 5 6 7 … 37`, 2026-11-09 사용자 결정). 보조원장 실데모 ~720행 = 37쪽 —
     번호 전부면 버튼 37개라 '현재 / 전체' 텍스트로 두었던 것을 공용 페이저로 바꿨다. */
  it('보조원장 = GridPager', () => {
    expect(readSrc('subledger_manage.tsx')).toMatch(/<GridPager current=\{page\.current\} total=\{page\.total\} onGo=\{\(i\) => apiRef\.current\?\.paginationGoToPage\(i\)\} \/>/);
  });
  it.each(walkDash().filter((p) => p.includes(`${sep}acc${sep}`) && p.endsWith('.tsx')).map((p) => [p.split(sep).pop() as string, p] as const))(
    '%s — "현재 / 전체" 텍스트 페이저 없음', (_f, p) => {
      expect(readFileSync(p, 'utf8')).not.toMatch(/String\(page\.current \+ 1\) \+ ' \/ ' \+ String\(page\.total\)/);
    });
});

/* ⑤ 데이터 연동 전(no-op) 항목은 적용 칩을 만들지 않는다 — apfs-detail-filter "no-op 항목은 칩을 만들지 않는다".
   계좌잔액(2026-11-09 점검): 미결재포함·잔액여부가 행을 거르지 않는데 칩이 떠 필터가 걸린 것처럼 보였다. */
describe('⑤ no-op 필터 항목 — 적용 칩 없음', () => {
  const src = readSrc('account_balance_manage.tsx');
  const noop = [...src.matchAll(/<Noop(?:Label|Check) label="([^"]+)"/g)].map((m) => m[1]);
  it('no-op 항목이 있다(이름이 바뀌어 0건 통과하지 않게)', () => { expect(noop.length).toBeGreaterThan(0); });
  it.each(noop)('%s', (label) => {
    const chips = src.slice(src.indexOf('const chips: AppliedFilter[] = ['), src.indexOf('];', src.indexOf('const chips: AppliedFilter[] = [')));
    expect(chips).not.toContain(`label: '${label}'`);
  });
});

/* ⑥ 단일 대상 액션(수정)은 1건일 때만 노출 — 2건 이상이면 숨긴다(비활성 아님). apfs-aggrid "단일 대상 액션 = single 게이트".
   2026-11-09 점검: 휴일관리·회계거래처관리만 disabled 로 남아 같은 회계 메뉴 안에서 동작이 갈렸다(회계 밖 사용 0곳). */
describe('⑥ 선택 바 [수정] — 비활성 대신 숨김', () => {
  const accTsx = walkDash().filter((p) => p.includes(`${sep}acc${sep}`) && p.endsWith('.tsx'));
  it.each(accTsx.map((p) => [p.split(sep).pop() as string, p] as const))('%s', (_f, p) => {
    expect(readFileSync(p, 'utf8')).not.toMatch(/disabled=\{selCount !== 1\}/);
  });
});

/* ⑦ 표시 옵션(Σ 소계·합계 토글 · 금액 단위)은 툴바 우측 — 필터 칩 줄(filterChips)·상세필터에 두지 않는다
   (2026-11-09 사용자 결정 (a)). 같은 자금관리 안에서 계좌잔액은 필터 칩, 출자금현황은 Button 클래스를 복사한 로컬 토글 +
   상세필터 '단위'(바꾸면 적용 칩이 생김)로 갈려 있었다. 토글 = UI.Button `pressed`(aria-pressed), 단위 = `단위: X` 캡션 +
   SegTabs(iam/sfund/fund_stats 선례). */
describe('⑦ 표시 옵션 = 툴바 우측 토글', () => {
  const accTsx = walkDash().filter((p) => p.includes(`${sep}acc${sep}`) && p.endsWith('.tsx'));
  it.each(accTsx.map((p) => [p.split(sep).pop() as string, p] as const))('%s — 칩 줄·드로어·복사 버튼에 표시 옵션 없음', (_f, p) => {
    const src = readFileSync(p, 'utf8');
    expect(src).not.toMatch(/className="ui-btn /);                          // Button 클래스를 복사한 로컬 토글 금지
    expect(src).not.toMatch(/<DrawerField label="단위"/);                    // 단위는 상세필터가 아니라 툴바
    expect(src).not.toMatch(/filterChips=\{[^\n]*label: '[^']*(소계|합계)/); // 소계·합계 토글은 필터 칩이 아니다
  });
  it('계좌잔액 소계표시 · 출자금현황 합계 = Button pressed', () => {
    expect(readSrc('account_balance_manage.tsx')).toMatch(/<Button [^>]*leadingIcon="sigma" pressed=\{showSubtotal\}/);
    expect(readSrc('contribution_status_manage.tsx')).toMatch(/<Button [^>]*leadingIcon="sigma" pressed=\{sumOn\}/);
  });
  it('출자금현황 단위 = 툴바 SegTabs', () => {
    expect(readSrc('contribution_status_manage.tsx')).toMatch(/<SegTabs size="sm" value=\{unit\}/);
  });
});

/* ⑨ 푸터 = FooterActions 하나 — apfs-grid "푸터 액션 4종은 항시 노출·순서 고정"(2026-09-17 사용자 결정, 인쇄 = 그리드만).
   회기생성/전기이월이 설계서 '하단도구 2개'를 이유로 IconBtn 2개를 직접 두어 인쇄·⌘P(printGrid)가 빠졌다 — ⌘P 가 브라우저
   기본 인쇄로 GNB 까지 찍었다(2026-11-09 점검). footer_hotkey_hints 가드는 FooterActions 소비처만 보므로 여기서 막는다. */
describe('⑨ 회계 푸터 = FooterActions', () => {
  const footers = walkDash().filter((p) => p.includes(`${sep}acc${sep}`) && p.endsWith('.tsx')).filter((p) => readFileSync(p, 'utf8').includes('footerRight='));
  it('대상이 있다', () => { expect(footers.length).toBeGreaterThan(10); });
  it.each(footers.map((p) => [p.split(sep).pop() as string, p] as const))('%s', (_f, p) => {
    expect(readFileSync(p, 'utf8')).toMatch(/footerRight=\{<FooterActions /);
  });
});

/* ⑩ 툴바 SplitButton = 같은 1차 액션(등록)의 대체 경로 묶음만 — apfs-grid "허용되는 combo ①".
   2026-11-09 사용자 결정: 감가상각 [저장 ▾ 계정과목 설정] · 자금일보 [자금일보 전자결재 ▾ 결재라인설정]은 성격이 다른 설정 화면을
   ▾ 안에 숨겨 분리했다 — 설정 진입은 별도 outline 버튼(1차 액션 오른쪽 · 조회 왼쪽). iconOnly(푸터 인쇄 combo)는 대상 아님. */
describe('⑩ 툴바 SplitButton = 등록 대체 경로만', () => {
  const accTsx = walkDash().filter((p) => p.includes(`${sep}acc${sep}`) && p.endsWith('.tsx'));
  const splits = accTsx.flatMap((p) => (readFileSync(p, 'utf8').match(/<SplitButton\b[\s\S]*?\/>/g) ?? [])
    .filter((s) => !/\biconOnly\b/.test(s))
    .map((s) => [p.split(sep).pop() as string, s] as const));
  it('대상이 있다', () => { expect(splits.length).toBeGreaterThan(0); });
  it.each(splits)('%s', (_f, s) => {
    const labels = [s.match(/label="([^"]+)"/)?.[1] ?? '', ...[...s.matchAll(/label: '([^']+)'/g)].map((m) => m[1])];
    for (const l of labels) expect(l, s).toMatch(/(등록|입력|업로드)$/);
  });
  it.each([
    ['depreciation_manage.tsx', '저장', '계정과목 설정'],
    ['daily_cash_manage.tsx', '자금일보 전자결재', '결재라인설정'],
  ])('%s — [%s] 다음 [%s] outline 버튼, 그 다음 조회', (f, main, setting) => {
    const bar = readSrc(f).match(/toolbarRight=\{<>([\s\S]*?)<\/>\}/)?.[1] ?? '';
    const iMain = bar.indexOf(`>${main}</Button>`);
    const iSet = bar.search(new RegExp(`<Button variant="outline" size="sm" leadingIcon="[\\w-]+" onClick=\\{[^\\n]*?\\}>${setting}</Button>`));
    const iRefresh = bar.indexOf('icon="refresh"');
    expect(iMain).toBeGreaterThan(-1);
    expect(iSet).toBeGreaterThan(iMain);
    expect(iRefresh).toBeGreaterThan(iSet);
  });
});

describe('③ 삭제전표 긴 텍스트 칸 — 말줄임 렌더러', () => {
  const src = readSrc('deleted_journal_manage.tsx');
  it('textCell = truncate span', () => { expect(src).toMatch(/const textCell = [^\n]*className="min-w-0 truncate"/); });
  /* 거래처(140 고정) · 적요(flex, 1280 에선 minWidth 180 에 묶여 잘렸다) */
  it.each(['partner', 'memo'])('%s 컬럼이 textCell 을 쓴다', (k) => {
    expect(src.split('\n').find((l) => l.includes(`field: '${k}'`))).toMatch(/cellRenderer: textCell/);
  });
});

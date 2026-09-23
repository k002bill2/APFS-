import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { APFS_DATA } from './data';
import { resolveSchema, ALL_SCHEMAS } from './schemas';
import { resolveFilterField } from './schemas/filter_field';
import { REPORT_TABS } from './all_report_status_model';
import { SOURCE_COUNTS as PROFILE_COUNTS, PROVENANCE as PROFILE_PROV, formatProfileUnit } from './company_profile_data';
import { SOURCE_COUNTS as STATS_COUNTS, SALES_SCALE_ROWS, INVEST_TYPE_ROWS, REGION_ROWS, PROVENANCE as STATS_PROV } from './investee_invest_stats_model';
import { RECOVERY_MODES, SOURCE_COUNTS as RECOVERY_COUNTS, recoverySummary, PROVENANCE as RECOVERY_PROV, DETAIL_ROWS_IR, DETAIL_ROWS_ALL, formatRecoveryUnit } from './invest_recovery_detail_model';
import { PROVENANCE as REPORT_PROV } from './all_report_status_model';
import { RATE, PCT_LABEL, FORMULA, CALC_BY_NO, baseAmount } from './mgmt_fee_detail_model';

/* 투자자산관리 > 투자기업정보(7) · 운용사 모니터링(6) · 자펀드 관리(6) 라우트 결선 + **출처 충실성** 불변식.
   (사용자 이미지 정본 2026-09-15 — 대분류 3 / 리프 19)

   ⚠ 이 파일의 핵심 ①: **라우트 키를 MENU에서 파생**한다. 테스트에도 스키마에도 리터럴을
   손으로 적으면 양쪽이 똑같이 NFD여도 통과하면서, NFC로 정규화하는 실제 내비게이션
   (app.tsx hashRoute → normalize('NFC'))만 조용히 DEFAULT_SCHEMA로 떨어진다.
   MENU label(NFC)에서 파생한 뒤 기대 리터럴과 대조해 양방향을 모두 막는다.

   ⚠ 이 파일의 핵심 ②: **라우트 → 어느 목업(S1_NN)이 출처인가**를 못 박는다. 파일 존재만 보면
   S1_35/S1_02 같은 "있긴 있는 다른 화면"으로 바꿔치기해도 통과한다(2026-09-15 실제 사고).
   기대 S1 번호 표 + 파일 존재 + provenance 경로가 저장소 상대경로인지를 함께 본다.

   나머지 한 축: route 키 규약은 `leaf.path || leaf.label` 이다
   (data.ts ALLMENU · shell flattenMenu · generic_list findMenuContext 공통). */

type MenuNode = { label: string; path?: string; children?: MenuNode[] };

const asset = (APFS_DATA.MENU as MenuNode[]).find((m) => m.label === '투자자산관리')!;
const groupOf = (label: string) => asset.children!.find((g) => g.label === label)!;
const routesOf = (label: string) => groupOf(label).children!.map((l) => l.path || l.label);
const labelsOf = (label: string) => groupOf(label).children!.map((l) => l.label);

const MOCKUP_DIR = 'docs/mockups/01_투자자산관리';

/* 기대값: [메뉴 라벨, 라우트 키, 출처 목업 파일 | null(원천 없음), 렌더 경로].
   출처 파일은 docs/메뉴구성도_v0.2.md 의 `현 시스템 매칭` 열이 정본이다(생성물이므로 임의 수정 금지).
   render: 'schema' = 스키마 주도 GenericListPage / 'typed' = app.tsx 가 전용 페이지로 분기. */
type Leaf = [label: string, route: string, source: string | null, render: 'schema' | 'typed'];

const 투자기업정보: Leaf[] = [
  /* ⚠ 스키마 출처가 목업이 아닌 유일한 리프. 아래 `투자기업정보(통합) 예외` 테스트 참조 —
     화면(S1_30)과 등록/수정 양식(clipboard 캡처)의 출처가 서로 다르다. */
  ['투자기업정보(통합)',    '투자기업정보(통합)',      null,                                  'typed'],
  ['투자기업명세서(통합)',  '투자기업명세서(통합)',    'S1_31_투자기업정보_전체_.html',       'schema'],
  ['투자기업고용현황(통합)', '투자기업 고용현황보고',   'S1_32_투자기업_고용현황보고.html',     'schema'],
  ['전체 투자실적',         '전체 투자실적',           'S1_33_전체_투자실적.html',            'schema'],
  ['투자실적현황(투자기업)', '투자실적 현황(투자기업)', 'S1_34_투자실적_현황_투자기업_.html',   'typed'],
  ['투자금 회수현황',       '투자금 회수현황',         'S1_36_투자_및_회수_상세정보.html',     'typed'],
  ['우수투자기업 관리',     '우수투자기업 관리',       null,                                  'schema'],
];
const 운용사모니터링: Leaf[] = [
  ['운용사 명세서',          '운용사 명세서',        'S1_37_운용사별_재무제표.html',        'schema'],
  ['운용사 재무정보 조회',   '운용사 재무정보 조회', 'S1_38_운용사_재무정보_조회.html',     'schema'],
  ['투자금 실사보고 조회',   '투자금 실사보고',      'S1_40_투자금실사보고.html',           'schema'],
  ['사후관리기록 관리',      '사후관리기록 관리',    'S1_42_사후관리기록.html',             'schema'],
  ['관리보수/성과보수 조회', '관리보수관리',         'S1_43_관리보수관리.html',             'schema'],
  ['자펀드 전체 보고현황',   '전체 보고현황',        'S1_44_전체_보고현황.html',            'typed'],
];
/* 자펀드 관리 6리프 — 이미 전용 React 페이지다. 이번 작업의 회귀 가드(재구현 금지). */
const 자펀드관리: [string, string][] = [
  ['자펀드 관리', 'subfund'],
  ['출자/분배조회(자펀드)', 'gp-contribution'],
  ['출자/분배조회(농금원)', 'apfs-contribution'],
  ['자펀드 투자실적현황', 'fund-invest-status'],
  ['자펀드 수탁관리', 'custody-verify'],
  ['종합통계(확정)', 'fund-stats'],
];

const ALL_LEAVES = [...투자기업정보, ...운용사모니터링];
const SCHEMA_ROUTES = ALL_LEAVES.map(([, r]) => r);
/* 출처가 **명시적으로 배제된** 목업. 같은 이름의 다른 화면으로 조용히 바꿔치기되는 것을 막는다
   (docs/메뉴구성도_v0.2.md:46 이 S1_35 불일치를 이미 기록해 뒀다). */
const FORBIDDEN_SOURCES = ['S1_35_투자금_회수현황.html', 'S1_02_운용사_명세.html'];

describe('메뉴 IA — 라벨·순서 보존', () => {
  it('투자기업정보 7리프의 라벨·순서가 이미지 정본과 같다', () => {
    expect(labelsOf('투자기업정보')).toEqual(투자기업정보.map(([l]) => l));
  });
  it('운용사 모니터링 6리프의 라벨·순서가 이미지 정본과 같다', () => {
    expect(labelsOf('운용사 모니터링')).toEqual(운용사모니터링.map(([l]) => l));
  });
  it('자펀드 관리 6리프의 라벨·순서·전용 route가 보존된다', () => {
    expect(labelsOf('자펀드 관리')).toEqual(자펀드관리.map(([l]) => l));
    expect(routesOf('자펀드 관리')).toEqual(자펀드관리.map(([, r]) => r));
  });
  it('MENU에서 파생한 라우트 키가 기대 리터럴과 일치한다(NFC 정규화 포함)', () => {
    expect(routesOf('투자기업정보')).toEqual(투자기업정보.map(([, r]) => r));
    expect(routesOf('운용사 모니터링')).toEqual(운용사모니터링.map(([, r]) => r));
    // 파생값과 기대 리터럴이 **둘 다** NFC 인지 확인 — 한쪽만 NFD면 위 toEqual 이 이미 깨지지만,
    // 양쪽이 같이 NFD 인 경우는 이 단언만이 잡는다.
    for (const r of [...routesOf('투자기업정보'), ...routesOf('운용사 모니터링')])
      expect(r, r).toBe(r.normalize('NFC'));
  });
});

describe('라우트 → 스키마 결선 (DEFAULT_SCHEMA 폴백 금지)', () => {
  /* DEFAULT_SCHEMA 는 영문 제네릭 5컬럼(항목명·금액·변동률·상태·추이)이다. 한글 업무 화면이
     여기로 떨어지면 에러 없이 "깨진 화면"만 보인다 — provenance.sourceSystem 이 유일한 신호다.
     전용 페이지로 그리는 4리프도 스키마는 레지스트리에 남겨 둔다(등록부 + provenance 기록). */
  it.each(SCHEMA_ROUTES)('%s 는 전용 스키마로 해석된다', (route) => {
    const s = resolveSchema(route);
    expect(s.provenance.sourceSystem, `${route} → ${s.provenance.sourceSystem}`).not.toBe('DEFAULT');
    expect(s.route).toBe(route);
    expect(s.columns.length).toBeGreaterThan(0);
  });
});

describe('출처(provenance) 충실성 — 어느 목업에서 왔는가', () => {
  /* 원천이 없는 신규 화면은 가짜 파일명 대신 sourceSystem:'NEW' + captureFile:'' 로 기록한다. */
  it('우수투자기업 관리는 원천 없음을 NEW 로 명시하고 행 0건이다', () => {
    const s = resolveSchema('우수투자기업 관리');
    expect(s.provenance.sourceSystem).toBe('NEW');
    expect(s.provenance.captureFile).toBe('');
    // sample:[] (빈 배열) = "원천에 행이 0건". 미선언이면 generic_list 가 합성 더미를 만든다.
    expect(s.sample, '빈 배열이어야 빈 표로 그려진다').toEqual([]);
  });

  const sourced = ALL_LEAVES.filter((l): l is [string, string, string, Leaf[3]] => l[2] !== null);

  it.each(sourced.map(([label, route, file]) => [route, file, label] as const))(
    '%s 의 출처는 %s 다',
    (route, file) => {
      const p = resolveSchema(route).provenance;
      // ① 기대한 바로 그 목업인가 — 파일 존재만 보면 S1_35/S1_02 바꿔치기를 못 잡는다(둘 다 존재한다).
      expect(p.captureFile, `${route} 의 출처가 기대 목업과 다르다`).toBe(`${MOCKUP_DIR}/${file}`);
      // ② 저장소 상대경로인가 — /Users/... 절대경로는 다른 기기에서 검증이 불가능하다.
      expect(p.captureFile.startsWith('/'), `${route}: 절대경로 금지`).toBe(false);
      // ③ 실제로 있는 파일인가.
      expect(existsSync(p.captureFile), `${route}: ${p.captureFile} 없음`).toBe(true);
    },
  );

  /* 화면을 전용 페이지가 그리는 4리프 — 출처는 그 데이터 모듈의 PROVENANCE 가 기록한다.
     스키마 provenance 만 보면 이 4리프의 출처 바꿔치기를 놓친다. */
  it.each([
    ['투자기업정보(통합)',      PROFILE_PROV,  'S1_30_투자기업정보.html'],
    ['투자실적 현황(투자기업)', STATS_PROV,    'S1_34_투자실적_현황_투자기업_.html'],
    ['투자금 회수현황',         RECOVERY_PROV, 'S1_36_투자_및_회수_상세정보.html'],
    ['전체 보고현황',           REPORT_PROV,   'S1_44_전체_보고현황.html'],
  ] as const)('%s 전용 페이지의 데이터 모듈 출처는 %#2$s 다', (route, prov, file) => {
    expect(prov.captureFile, route).toBe(`${MOCKUP_DIR}/${file}`);
    expect(existsSync(prov.captureFile), `${route}: ${prov.captureFile} 없음`).toBe(true);
  });

  /* 투자기업정보(통합) 예외 — 한 라우트에 출처가 둘이다. 화면은 S1_30(위 테스트), 등록/수정
     21필드는 현행시스템 양식 clipboard 캡처. 스키마 provenance 를 S1_30 으로 고쳐 적으면
     그 21필드의 진짜 출처가 지워진다(출처 위조). 그래서 서로 다른 값인 것이 정상이다. */
  it('투자기업정보(통합) 스키마는 등록/수정 양식 캡처 출처를 그대로 보존한다', () => {
    const p = resolveSchema('투자기업정보(통합)').provenance;
    expect(p.sourceSystem).toBe('FFMS');
    expect(p.captureFile).toBe('clipboard-2026-06-29-154620.png');
    expect(resolveSchema('투자기업정보(통합)').fields.length).toBe(21);
  });

  it('명시적으로 배제된 목업(S1_35 · S1_02)을 출처로 쓰는 라우트가 없다', () => {
    const files = [
      ...SCHEMA_ROUTES.map((r) => [r, resolveSchema(r).provenance.captureFile] as const),
      ['투자기업정보(통합) 모델', PROFILE_PROV.captureFile] as const,
      ['투자실적현황 모델', STATS_PROV.captureFile] as const,
      ['투자금 회수현황 모델', RECOVERY_PROV.captureFile] as const,
      ['전체 보고현황 모델', REPORT_PROV.captureFile] as const,
    ];
    for (const [where, f] of files)
      for (const bad of FORBIDDEN_SOURCES)
        expect(f.includes(bad), `${where} 가 ${bad} 를 출처로 쓰고 있다`).toBe(false);
  });
});

describe('원문 행 충실성 — 합성 더미 금지', () => {
  /* 스키마 주도 9리프: sample(원문 리터럴 행)이 반드시 있어야 한다. 없으면 generic_list.makeRows 가
     결정적 더미 20행을 만들고, 그 20행이 실데이터처럼 보인다. */
  const schemaLeaves = ALL_LEAVES.filter(([, , , render]) => render === 'schema');

  it.each(schemaLeaves.map(([, route]) => route))('%s 는 원문 리터럴 sample 을 갖는다', (route) => {
    expect(resolveSchema(route).sample, `${route}: sample 미선언 = 합성 더미 20행`).toBeDefined();
  });

  /* 행 수 — 원문 실측치. 늘어나면 창작 행이 끼었다는 뜻이고, 줄어들면 원문을 잃은 것이다. */
  it.each([
    ['투자기업명세서(통합)', 4],
    ['투자기업 고용현황보고', 3],
    ['전체 투자실적', 1],
    ['운용사 명세서', 22],
    ['운용사 재무정보 조회', 2],
    ['투자금 실사보고', 7],
    ['사후관리기록 관리', 3],
    ['관리보수관리', 1],
    ['우수투자기업 관리', 0],
  ] as const)('%s 의 행 수는 원문 그대로 %i건이다', (route, n) => {
    expect(resolveSchema(route).sample!.length).toBe(n);
  });

  /* 샘플 값 지점검 — 키 remap 이 어긋나면 셀이 조용히 빈칸이 된다(에러 없음).
     "행 수는 맞는데 값이 비어 있는" 상태를 잡으려면 실제 값을 봐야 한다. */
  it('고용현황 1행은 S1_32 원문 값 그대로다', () => {
    const r = resolveSchema('투자기업 고용현황보고').sample![0];
    expect(r.investee).toBe('(주)그린팜테크');
    expect(r.salesAmt).toBe(12_500_000_000);
    expect(r.totalEmployees).toBe(85);
    expect(r.youthEmployees).toBe(32);
    expect(r.isUploaded).toBe('완료');
  });
  it('운용사 명세서는 S1_37(운용사별 재무제표) 원문 값이다 — S1_02 운용사 명세가 아니다', () => {
    const s = resolveSchema('운용사 명세서');
    expect(s.columns.map((c) => c.label)).toContain('투자기업');   // S1_02 에는 없는 축
    const r = s.sample![0];
    expect(r.gp).toBe('KB증권(주)');
    expect(r.investee).toBe('(주)선양');
    expect(r.baseYm).toBe('2012-12');
    expect(r.totalAssets).toBe(17_792_580_021);
  });
  it('전체 투자실적은 회수실적 4컬럼(2단 헤더)을 보존한다', () => {
    const s = resolveSchema('전체 투자실적');
    const recovery = s.columns.filter((c) => c.group === '회수실적').map((c) => c.label);
    expect(recovery).toEqual(['회수원금', '회수수익', '회수총액', '감액금액']);
    const r = s.sample![0];
    expect(r.investee).toBe('(주)진바이오텍');
    expect(r.recoverTotal).toBe(7_500_000_000);
    /* 원문이 null 인 2컬럼 — 비율을 계산해 채우지 않는다. 표시는 원문과 같이 `-`.
       ⚠ type 은 'rate' 가 아니라 'text' 다: 'rate' 면 Cell 이 DeltaBadge 로 보내
       `Number('')===0` 이 되어 **값이 없는데 "0" 하락 배지**가 뜬다(2026-09-16 Codex 5R P2). */
    expect(r.agriInvestRatio).toBe('-');
    expect(r.fundInvestRatio).toBe('-');
    for (const k of ['agriInvestRatio', 'fundInvestRatio'])
      expect(s.columns.find((c) => c.key === k)!.type, k).toBe('text');
  });
  it('사후관리기록은 S1_42 원문 값·코드 도메인을 쓴다', () => {
    const s = resolveSchema('사후관리기록 관리');
    expect(s.fields.find((f) => f.key === 'majorCat')!.options).toEqual(['일반 사후관리', '제재조치']);
    expect(s.fields.find((f) => f.key === 'deliveryType')!.options).toEqual(['회의', '공문']);
    expect(s.sample![1].recordType).toBe('투자비율위반');
  });
  it('투자금 실사보고의 잔여일수는 숫자가 아니라 원문 상태 문구다', () => {
    const s = resolveSchema('투자금 실사보고');
    expect(s.columns.find((c) => c.key === 'remainDays')!.type).toBe('text');
    expect(s.sample!.map((r) => r.remainDays)).toContain('보고 대상 제외');
  });
  it('관리보수관리 1행은 S1_43 원문 값 그대로다', () => {
    const r = resolveSchema('관리보수관리').sample![0];
    expect(r.gp).toBe('제이비인베스트먼트(주)');
    expect(r.amount).toBe(191_482_240);
    expect(r.isConfirmed).toBe('미확정');
  });
});

describe('전용 페이지 분기 (app.tsx)', () => {
  const app = readFileSync(new URL('./app.tsx', import.meta.url), 'utf8');
  /* 분기 리터럴은 MENU 에서 파생한다 — app.tsx 와 테스트가 **둘 다** NFD 면 하드코딩 비교는
     통과하면서 런타임(NFC 정규화)만 DEFAULT_SCHEMA 로 떨어진다(이 파일 머리말 ⚠①). */
  const routeOf = (label: string) => {
    const all = [...groupOf('투자기업정보').children!, ...groupOf('운용사 모니터링').children!];
    return (all.find((l) => l.label === label)!.path || label).normalize('NFC');
  };

  it('자펀드 관리 6리프의 기존 전용 route 분기가 유지된다', () => {
    for (const [, route] of 자펀드관리) expect(app, route).toContain(`route === "${route}"`);
  });

  /* 전용 컴포넌트가 정당한 4리프 — 원문이 한 화면에 여러 표/여러 조회기준을 담아
     PageSchema(columns 1벌)로 표현되지 않는 화면들이다. */
  it.each([
    ['자펀드 전체 보고현황', 'AllReportStatus'],
    ['투자기업정보(통합)', 'InvesteeProfile'],
    ['투자실적현황(투자기업)', 'InvesteeInvestStats'],
    ['투자금 회수현황', 'InvestRecoveryDetail'],
  ] as const)('%s 는 전용 페이지 %s 로 분기된다', (label, component) => {
    const route = routeOf(label);
    expect(app, route).toContain(`route === "${route}"`);
    expect(app).toContain(component);
  });

  it('나머지 9리프는 전용 분기를 만들지 않는다(GenericListPage 스키마 경로)', () => {
    const typed = new Set(ALL_LEAVES.filter(([, , , r]) => r === 'typed').map(([, route]) => route));
    for (const route of SCHEMA_ROUTES.filter((r) => !typed.has(r)))
      expect(app, route).not.toContain(`route === "${route}"`);
  });
});

describe('전용 페이지의 원문 섹션·행 수', () => {
  it('S1_44 전체 보고현황은 원문 6개 표를 모두 싣는다', () => {
    expect(REPORT_TABS.length).toBe(6);
    expect(REPORT_TABS.map((t) => t.label)).toEqual(
      ['투자심의', '수시보고', '조합원총회', '관리보수', '운용사 출자배분', '농금원 출자배분']);
  });
  it('S1_44 각 표의 행 수는 원문 그대로다(관리보수는 "조회된 데이터가 없습니다" → 0건)', () => {
    const byKey = Object.fromEntries(REPORT_TABS.map((t) => [t.key, t]));
    expect(byKey.review.rows.length).toBe(1);
    expect(byKey.occasional.rows.length).toBe(1);
    expect(byKey.meeting.rows.length).toBe(1);
    expect(byKey.mgmtFee.rows.length).toBe(0);
    expect(byKey.gpContribution.rows.length).toBe(12);
    expect(byKey.apfsContribution.rows.length).toBe(1);
  });
  it('S1_44 운용사 출자배분은 2단 헤더와 소계·합계 2줄을 보존한다', () => {
    const t = REPORT_TABS.find((x) => x.key === 'gpContribution')!;
    expect([...new Set(t.columns.map((c) => c.group).filter(Boolean))]).toEqual(['기타조합원', '모태펀드']);
    expect(t.pinnedBottom!.map((r) => r.no)).toEqual(['소계', '합계']);
    // rowspan 으로 병합돼 있던 식별 컬럼이 행마다 다시 펼쳐졌는지 — 비어 있으면 2행부터 빈칸이다.
    expect(t.rows[11].gp).toBe('KB증권(주)');
    expect(t.rows[11].commitTotal).toBe(32_000_000_000);
  });

  it('S1_30 투자기업정보(통합)은 3섹션을 원문 건수 그대로 싣는다', () => {
    // 원문 `<th scope="row">` 는 34개지만 마지막 하나는 여성기업여부 행의 **빈 채움 셀**이라 항목이 아니다.
    expect(PROFILE_COUNTS).toEqual({ overview: 33, financial: 2, shareholder: 4 });
  });

  it('S1_34 투자실적현황은 집계표 3장을 원문 행 수 그대로 싣는다', () => {
    // 블록 2개(투자건수·투자금액) × (연도 16 + 합계 1) = 34
    expect(STATS_COUNTS.salesScale).toBe(34);
    expect(STATS_COUNTS.investType).toBe(34);
    expect(STATS_COUNTS.region).toBe(19);   // 소재지 18 + 합계
    expect(SALES_SCALE_ROWS[0]).toMatchObject({ block: '투자건수', label: '2010년' });
    expect(SALES_SCALE_ROWS[0].values).toEqual([18, 3, 0, 2, 13, 5, 41]);
    expect(REGION_ROWS[0]).toMatchObject({ no: 1, region: '서울' });
    expect(REGION_ROWS[0].values).toEqual([533, '34.5 %', 6638, '35.7 %']);
  });
  it('S1_36 투자금 회수현황은 조회기준 2모드를 각각 원문 컬럼·행 수로 싣는다', () => {
    expect(RECOVERY_MODES.map((m) => m.label)).toEqual(['투자및회수', '전체거래']);
    expect(RECOVERY_COUNTS).toEqual({ ir: 21, all: 24 });
    expect(RECOVERY_MODES[0].columns.length).toBe(14);
    expect(RECOVERY_MODES[1].columns.length).toBe(13);
    // 모드마다 컬럼이 다르다는 것이 전용 페이지의 존재 이유다.
    expect(RECOVERY_MODES[0].columns.map((c) => c.key)).toContain('ccode');
    expect(RECOVERY_MODES[1].columns.map((c) => c.key)).toContain('shares');
  });
  it('S1_36 합계 4줄은 원문 renderFoot() 값과 같다(항상 투자및회수 기준)', () => {
    const s = recoverySummary();
    expect(s.map((x) => x.label)).toEqual(['투자', '회수', '수익', '회수총액']);
    expect(s[0].prin).toBe(16_000_123_464);
    expect(s[1].prin).toBe(11_764_603_464);
    expect(s[1].prof).toBe(4_297_866_647);
    expect(s[3].prin).toBe(11_764_603_464);
    expect(s[3].prof).toBe(4_297_866_647);
  });
});

describe('스키마 레지스트리 — 고아(도달 불가) 누적 방지', () => {
  /* 레지스트리에는 있는데 MENU 어느 리프도 가리키지 않는 스키마 = 화면에서 도달 불가한 고아다.
     방치하면 원문이 갈릴 때 어느 쪽이 정본인지 알 수 없게 된다 — 실제로 `투자및회수상세정보` 가
     S1_36 을 출처로 적은 채 `투자금 회수현황`(같은 S1_36)과 나란히 남아 있었고 컬럼은 서로 달랐다.

     ⚠ 현재 고아는 **17건**이다(`투자및회수상세정보` 삭제로 20→19, `투심승인정보조회` 삭제로 19→18 —
       S1_28 은 투심보고 통계 리프(review_stats.tsx)로 대체(#255), `정기보고회수내역` 삭제로 18→17 —
       S1_29 는 정기보고 리프의 탭(regular_recovery.tsx)으로 옮겼다). 대부분은 현행(as-is) 화면 이름으로
     만들어졌다가 to-be 리프가 전용 페이지(`path:`)로 가면서 도달 불가가 된 레거시다
     (예: `정기보고` 스키마 vs 리프 `정기보고 → path:"regular-report"`).
     **이번 변경의 범위가 아니라 전수 정리는 하지 않았다.** 대신 "더 늘지 않는다"만 못 박는다 —
     새 고아를 만들면 이 테스트가 깨지고, 해결책은 상한을 올리는 것이 아니라
     ① MENU 에 연결하거나 ② 삭제하는 것이다. */
  const ORPHAN_BASELINE = 17;

  const menuKeys = (() => {
    const keys = new Set<string>();
    const walk = (nodes: MenuNode[]) => {
      for (const n of nodes) {
        if (n.children) walk(n.children);
        else keys.add((n.path || n.label).normalize('NFC'));
      }
    };
    walk(APFS_DATA.MENU as MenuNode[]);
    return keys;
  })();
  const orphans = ALL_SCHEMAS.map((s) => s.route).filter((r) => !menuKeys.has(r.normalize('NFC'))).sort();

  it(`MENU 에 연결되지 않은 스키마가 ${ORPHAN_BASELINE}건을 넘지 않는다(레거시 기준선 — 늘리지 말 것)`, () => {
    expect(orphans.length, `고아 목록: ${orphans.join(' · ')}`).toBeLessThanOrEqual(ORPHAN_BASELINE);
  });

  it('삭제된 `투자및회수상세정보` 가 되살아나지 않는다(도달 불가 + S1_36 출처 중복)', () => {
    expect(ALL_SCHEMAS.some((s) => s.route === '투자및회수상세정보')).toBe(false);
  });

  it('이번 작업의 13리프는 하나도 고아가 아니다', () => {
    for (const route of SCHEMA_ROUTES) expect(orphans, route).not.toContain(route);
  });
});

describe('S1_36 — 커밋된 행이 목업 파일 안에 실재하는가', () => {
  /* 사용자 지목 원본(`~/Downloads/통합 2/…/S1_36_…html`)과 저장소 사본은 바이트 동일이다
     (md5 d5d9d0f6…, 2026-09-16 확인). 그 파일을 테스트가 **직접 읽어** 커밋된 값이 실제로
     원문에 있는 문자열인지 본다 — 행 수만 세는 가드는 값이 바뀌어도 통과한다.
     목업이 갱신되면 이 테스트가 깨지고, 그때 해야 할 일은 기대값 수정이 아니라 **재파싱**이다. */
  const html = readFileSync(RECOVERY_PROV.captureFile, 'utf8');

  it('목업 파일이 provenance 경로에 있고 두 데이터 배열을 갖는다', () => {
    expect(html).toContain('var DATA_IR=');
    expect(html).toContain('var DATA_ALL=');
  });

  it('투자및회수 21행의 약정번호·거래일자·거래원금이 모두 원문에 있다', () => {
    for (const r of DETAIL_ROWS_IR) {
      expect(html, `약정번호 ${r.ag}`).toContain(String(r.ag));
      expect(html, `거래일자 ${r.tdate}`).toContain(String(r.tdate));
      expect(html, `거래원금 ${r.prin}`).toContain(String(r.prin));
    }
  });

  it('두 모드의 컬럼 라벨이 원문 COLS_IR/COLS_ALL 헤더 문자열과 일치한다', () => {
    for (const m of RECOVERY_MODES)
      for (const c of m.columns) expect(html, `${m.label} 헤더 ${c.label}`).toContain(`'${c.label}'`);
  });
});

describe('상세필터 라벨 — 표를 조용히 0건으로 만드는 tag 폴백 금지', () => {
  /* `resolveFilterField` 3단계: 라벨이 fields/columns 어디에도 없고 년도·일자·구분 휴리스틱에도
     안 걸리면 **kind:'tag'** 로 떨어진다. 그러면 `rowMatchesFilters` 가 그 라벨을 `row.category`
     와 대조하는데, 업무 화면의 category 는 엔티티명(예: '실사보고')이라 **절대 일치하지 않는다**
     → 사용자가 필터를 켜는 순간 표가 에러 없이 0건이 된다(2026-09-16 Codex 지적으로 발견).

     ⚠ 레거시 4건은 이번 범위 밖이라 고치지 않았다. 기준선으로 고정해 **더 늘지 않게만** 막는다 —
     새로 추가하면 이 테스트가 깨지고, 해결책은 목록에 넣는 것이 아니라 **컬럼/필드 라벨과
     정확히 같은 라벨을 쓰거나 그 필터를 빼는 것**이다. */
  const LEGACY_TAG_FILTERS = ['조합원총회', '(운용사)출자배분관리', '조합원정보등록', '투자기업정보'];

  const offenders = ALL_SCHEMAS
    .map((sc) => [sc.route, (sc.filters ?? []).filter((l) => {
      const f = resolveFilterField(l, sc);
      return f.kind === 'tag' && !f.columnKey;
    })] as const)
    .filter(([, bad]) => bad.length > 0);

  it('tag 로 떨어지는 필터를 가진 스키마는 레거시 4건뿐이다', () => {
    const routes = offenders.map(([r]) => r).sort();
    expect(routes, offenders.map(([r, b]) => `${r}: ${b.join('·')}`).join(' | ')).toEqual([...LEGACY_TAG_FILTERS].sort());
  });

  it('이번 작업의 13리프에는 하나도 없다', () => {
    for (const route of SCHEMA_ROUTES) {
      const sc = resolveSchema(route);
      for (const l of sc.filters ?? []) {
        const f = resolveFilterField(l, sc);
        expect(f.kind === 'tag' && !f.columnKey, `${route} 의 필터 '${l}' 가 표를 0건으로 만든다`).toBe(false);
      }
    }
  });
});

describe('ColumnSpec 선언이 실제로 ColDef 에 전달되는가', () => {
  /* `group`·`note`·`pinned` 는 types.ts 가 선언만 해 두고 매퍼가 흘려버리면 **에러 없이 무시된다**
     (2026-09-15 group/note, 2026-09-16 pinned — 셋 다 실제로 그 상태였다).
     매퍼 소스에 전달 코드가 있는지 문자열로 확인한다 — 렌더 테스트 없이 잡을 수 있는 최소 가드. */
  it.each([
    ['generic_list.tsx', ['c.pinned', 'foldGroups']],
    ['all_report_status.tsx', ['c.pinned', 'foldGroups']],
    ['invest_recovery_detail.tsx', ['c.pinned']],
  ] as const)('%s 가 %s 를 ColDef 로 넘긴다', (file, needles) => {
    const src = readFileSync(new URL('./' + file, import.meta.url), 'utf8');
    for (const n of needles) expect(src, `${file}: ${n} 미전달`).toContain(n);
  });

  it('S1_31 은 단일 헤더다 — group 을 선언하지 않는다(원문 colspan 0건)', () => {
    expect(resolveSchema('투자기업명세서(통합)').columns.some((c) => c.group)).toBe(false);
  });

  it('2단 헤더를 선언한 스키마는 원문이 실제로 2단인 것뿐이다', () => {
    const grouped = ALL_SCHEMAS.filter((sc) => sc.columns.some((c) => c.group)).map((sc) => sc.route).sort();
    // 전체 투자실적 = 회수실적 4컬럼 · 투자실적 현황(투자기업) = 소재지별 표 2단 헤더
    expect(grouped).toEqual(['전체 투자실적', '투자실적 현황(투자기업)']);
  });
});
describe('S1_34 — 원문이 배선한 동작만 구현한다', () => {
  /* 원문 스크립트 실측(2026-09-16):
     · `투자실적구분` → `.gridblock` 토글이 있다 → 우리도 표를 전환한다.
     · `건수기준` → **전환 로직이 없다**. 두 블록(투자건수·투자금액)은 항상 함께 그려진다.
       한때 이 컨트롤로 블록을 하나만 남겼는데 보고서 절반을 숨기는 창작 동작이었다(Codex 3라운드 P1).
     · `계정구분·연도기준·데이터기준` → select 에 option 0개 → 컨트롤을 만들지 않는다.
     · 금액단위 원/백만원/억원 → `fmtEok` 로 억원 base 를 환산한다 → 토글을 둔다. */
  const stats = readFileSync(new URL('./investee_invest_stats.tsx', import.meta.url), 'utf8');

  it('건수기준으로 블록을 걸러내지 않는다(두 블록 모두 렌더)', () => {
    expect(stats).not.toContain("filter((r) => r.block === block)");
    expect(stats).not.toMatch(/const BLOCKS\s*=/);
  });

  it('금액단위 토글과 원문 환산식(억원 base)을 갖는다', () => {
    expect(stats).toContain("STAT_UNITS");
    expect(stats).toContain("eok * 100");     // 백만원
    expect(stats).toContain("eok * 1e8");     // 원
  });

  it('두 블록의 행이 모델에 모두 살아 있다(각 17행)', () => {
    for (const rows of [SALES_SCALE_ROWS, INVEST_TYPE_ROWS]) {
      expect(rows.filter((r) => r.block === '투자건수').length).toBe(17);
      expect(rows.filter((r) => r.block === '투자금액').length).toBe(17);
    }
  });
});

describe('금액 단위 — 선언이 화면까지 닿는가 · 화면별 표기 규칙', () => {
  /* `unitToggle` 도 group·note·pinned 와 같은 부류였다: 스키마가 선언해도 GenericListPage 가
     읽지 않아 금액이 원 원시값으로 굳어 있었다(2026-09-16 Codex 4R P1). */
  const gl = readFileSync(new URL('./generic_list.tsx', import.meta.url), 'utf8');

  it('GenericListPage 가 schema.unitToggle 을 실제로 소비한다', () => {
    expect(gl).toContain('schema.unitToggle');
    expect(gl).toContain('amountHeader(');   // 헤더에 선택 단위 표기
    expect(gl).toContain('toUnit(');         // 엑셀이 선택 단위를 따른다
  });

  it('unitToggle 을 선언한 스키마는 금액 컬럼을 실제로 갖는다(빈 토글 금지)', () => {
    for (const sc of ALL_SCHEMAS.filter((x) => x.unitToggle))
      expect(sc.columns.some((c) => c.type === 'amount'), `${sc.route}: 금액 컬럼 없이 unitToggle`).toBe(true);
  });

  /* S1_36 은 공용 formatUnit(백만원 2자리)이 아니라 **원문 applyUnit** 을 따른다:
     원 0자리 · 백만원 1자리 · 억원 2자리 (`nf(w/1e6,1)` · `nf(w/1e8,2)`). */
  it('S1_36 금액 표기 자릿수가 원문과 같다', () => {
    expect(formatRecoveryUnit(1_000_008_000, '원')).toBe('1,000,008,000');
    expect(formatRecoveryUnit(1_000_008_000, '백만원')).toBe('1,000.0');   // 공용 formatUnit 이면 1,000.01
    expect(formatRecoveryUnit(1_000_008_000, '억원')).toBe('10.00');
  });
});

describe('원문 tfoot 합계 — 필터가 켜지면 내린다', () => {
  /* 소계·합계는 **캡처한 리터럴**이라 부분집합으로 재계산할 수 없다(합계 행 약정총액은 12행의
     합이 아니라 조합 약정액이다). 필터가 켜지면 내리고 푸터에 사유를 적는다.
     ⚠ 판정은 **필터 상태**여야 한다 — 행 수 비교로 하면 필터가 전 행과 일치할 때(선택지가
     하나뿐인 운용사 등) 플래그가 꺼져 전체 기준 합계가 남는다(2026-09-16 Codex 6R P2). */
  const src = readFileSync(new URL('./all_report_status.tsx', import.meta.url), 'utf8');

  it('행 수 비교로 판정하지 않는다', () => {
    expect(src).not.toContain('visible.length !== tab.rows.length');
  });
  it('필터 상태 5종으로 판정한다', () => {
    const m = src.match(/const filtered = ([^;]+);/);
    expect(m, 'filtered 파생값을 찾지 못했다').toBeTruthy();
    for (const k of ['fGp', 'fSubFund', 'fFrom', 'fTo', 'fText']) expect(m![1], k).toContain(k);
  });
  it('엑셀도 같은 규칙을 따른다(전체 기준 합계를 붙이지 않는다)', () => {
    expect(src).toContain('...(pinnedBottom ?? [])');
  });
});

describe('화면별 금액 표기 규칙 — 목업이 정본이다', () => {
  /* 저장 base(원)는 공유하지만 **자릿수는 목업마다 다르다**. 공용 formatUnit(2자리)을 모든 화면에
     쓰면 원문과 값이 달라진다(2026-09-16 Codex 4R·7R). 화면별 포맷터의 자릿수를 못 박는다. */
  it('S1_30 기업개요: 백만원 정수 · 억원 1자리 (원문 fmt(n,u))', () => {
    expect(formatProfileUnit(17_792_580_021, '백만원')).toBe('17,793');
    expect(formatProfileUnit(17_792_580_021, '억원')).toBe('177.9');
    expect(formatProfileUnit(17_792_580_021, '원')).toBe('17,792,580,021');
  });

  it('S1_36 투자금 회수현황: 백만원 1자리 · 억원 2자리 (원문 applyUnit)', () => {
    expect(formatRecoveryUnit(17_792_580_021, '백만원')).toBe('17,792.6');
    expect(formatRecoveryUnit(17_792_580_021, '억원')).toBe('177.93');
  });

  it('두 규칙이 서로 다르다 — 하나로 합치면 한쪽이 원문과 어긋난다', () => {
    expect(formatProfileUnit(17_792_580_021, '억원')).not.toBe(formatRecoveryUnit(17_792_580_021, '억원'));
  });

  it('엑셀 숫자서식이 값의 실제 자릿수를 따른다(고정 1자리 금지)', () => {
    const gl = readFileSync(new URL('./generic_list.tsx', import.meta.url), 'utf8');
    expect(gl).not.toContain("Number.isInteger(v) ? '#,##0' : '#,##0.0'");
    expect(gl).toContain("'0'.repeat(");
  });
});


/* ─────────────────────────────────────────────────────────────────────────
   상세 팝업 2종(S1_43 관리보수보고 상세조회 · S1_40 체크리스트 조회) — 원문 대조
   ───────────────────────────────────────────────────────────────────────── */
describe('S1_43 관리보수보고 상세조회 팝업 — 원문 대조', () => {
  const html = readFileSync('docs/mockups/01_투자자산관리/S1_43_관리보수관리.html', 'utf8');

  it('상수가 원문 그대로다 (RATE · 보수율 표기 · 산식)', () => {
    expect(html).toContain('var RATE=0.025');
    expect(RATE).toBe(0.025);
    expect(PCT_LABEL).toBe('2.5%');
    // 원문 formula 는 pctStr 을 끼워 만든다 — 결과 문자열이 원문 조각과 일치하는지 본다
    expect(FORMULA).toBe('투자잔액(분기말잔액)*2.5%*일수/365');
    expect(html).toContain("var formula='투자잔액(분기말잔액)*'+pctStr+'*일수/365'");
  });

  it('산출내역 값이 원문 DATA 안에 실재한다', () => {
    const calc = CALC_BY_NO['1'];
    expect(calc).toBeDefined();
    expect(html).toContain("span:'2025-01-01~2025-12-31'");
    expect(html).toContain('days:365');
    expect(html).toContain('base:8509289613');
    expect(html).toContain('baseConfirmed:true');
    expect(calc.span).toBe('2025-01-01~2025-12-31');
    expect(calc.days).toBe(365);
    expect(calc.base).toBe(8509289613);
    expect(calc.baseConfirmed).toBe(true);
  });

  /* ⚠ 이 팝업에서 가장 조용히 틀릴 수 있는 곳. baseConfirmed 를 뒤집으면 역산값 7,659,289,600 이
     **경고 없이** 기준금액으로 표시된다 — 목업 주석이 정확히 그 불일치를 경고하고 있다. */
  it('기준금액은 실캡처 값이고 역산값이 아니다', () => {
    const amount = 191482240;                       // 원문 DATA no:1 의 amt
    expect(html).toContain('amt:191482240');
    expect(baseAmount(CALC_BY_NO['1'], amount)).toBe(8509289613);
    expect(Math.round(amount / RATE)).toBe(7659289600);   // 역산값 — 쓰이면 안 된다
    expect(baseAmount(CALC_BY_NO['1'], amount)).not.toBe(7659289600);
  });

  it('baseConfirmed 가 false 면 역산값으로 떨어진다(원문 분기 보존)', () => {
    const unconfirmed = { ...CALC_BY_NO['1'], baseConfirmed: false };
    expect(baseAmount(unconfirmed, 191482240)).toBe(7659289600);
  });

  it('팝업 kv 9항목 라벨이 원문 dl 순서와 같다', () => {
    const modal = readFileSync(new URL('./mgmt_fee_detail_modal.tsx', import.meta.url), 'utf8');
    for (const l of ['운용사', '자펀드', '보고구분', '지급구분', '지급일자', '금액', '지출내역', '산출내역', '삭감내역']) {
      // 원문 dt 는 class 를 가질 수 있다(`<dt class="row-b">삭감내역</dt>`)
      expect(html, `원문 dt ${l}`).toMatch(new RegExp('<dt[^>]*>' + l + '</dt>'));
      expect(modal, `팝업 kv ${l}`).toContain("l: '" + l + "'");
    }
  });

  it('산출내역 표 7개 헤더가 원문 그대로다', () => {
    const modal = readFileSync(new URL('./mgmt_fee_detail_modal.tsx', import.meta.url), 'utf8');
    for (const h of ['기준', '일자', '기준금액', '일수', '보수율', '관리보수금액', '계산산식']) {
      expect(modal, `헤더 ${h}`).toContain('>' + h);
    }
  });

  /* 목업 주석이 못박은 규칙: "확정 여부를 다루는 관리 화면이므로 금액 단위전환 토글은 규칙상 미적용" */
  it('관리보수관리는 단위 토글이 없다(원문 규칙)', () => {
    expect(resolveSchema('관리보수관리').unitToggle).toBeUndefined();
  });
});

describe('S1_40 투자금실사보고서 체크리스트 팝업 — 원문 대조', () => {
  const html = readFileSync('docs/mockups/01_투자자산관리/S1_40_투자금실사보고.html', 'utf8');
  const modal = readFileSync(new URL('./due_dilig_checklist_modal.tsx', import.meta.url), 'utf8');

  it('원문에 openChecklist 와 날짜 형식 링크 조건이 있다', () => {
    expect(html).toContain('function openChecklist(r)');
    expect(html).toContain('if(/^\\d{4}-\\d{2}-\\d{2}$/.test(r.due))');
  });

  it('팝업 kv 8항목 라벨이 원문 dl 순서와 같다', () => {
    for (const l of ['투자조합명', '투자기업', '투자일자', '투자금액', '투자형태', '실사일', '실사회계법인']) {
      expect(html, `원문 dt ${l}`).toContain('<dt>' + l + '</dt>');
      expect(modal, `팝업 kv ${l}`).toContain("l: '" + l + "'");
    }
    expect(html).toContain('<dt>체크리스트<button');   // 체크리스트만 dt 안에 ⚠마커가 붙는다
    expect(modal).toContain("l: '체크리스트'");
  });

  it('체크리스트 없는 행의 표기가 원문 그대로다', () => {
    expect(html).toContain('- (체크리스트 없음)');
    expect(modal).toContain('- (체크리스트 없음)');
  });

  /* 원문은 `투자금액`·`실사회계법인` 을 `dd.empty` 리터럴 `-` 로 둔다 — 행에서 값을 끌어오면 창작이다.
     (스키마에 그 두 컬럼 자체가 없다는 사실로 이중 확인한다) */
  it('투자금액·실사회계법인은 목록 컬럼이 아니고 팝업에서 리터럴 -다', () => {
    expect(html).toContain('<dt>투자금액</dt><dd class="empty">-</dd>');
    expect(html).toContain('<dt>실사회계법인</dt><dd class="empty">-</dd>');
    const keys = resolveSchema('투자금 실사보고').columns.map((c) => c.key);
    expect(keys).not.toContain('investAmount');
    expect(keys).not.toContain('auditFirm');
  });

  /* ⚠ 여기서 갈린다. 원문 **설명문**(doc-sub)은 "모니터링하고 확정 처리하는 조회 화면"이라 적지만,
     목업 자체는 그 액션을 **구현하지 않았다**: 확정 컨트롤도 핸들러도 없고, 281행이 확정여부 값을
     "캡처 밖 실값 미확인 — 전부 '-' 표시"로 못박는다. 즉 업무 의도에는 있으나 **무엇을 어떤 UI로
     어떤 값으로** 그릴지가 원천에 없다 → 만들면 창작이다.
     판별자는 S1_43 과의 구조 대조다: S1_43 은 확정 select(`data-cfm`)를 실제로 갖고 S1_40 은 없다. */
  it('확정 처리 UI 가 목업에 구현돼 있지 않다 (S1_43 과 대조)', () => {
    expect(html).toContain('확정 처리하는 조회 화면');                 // 설명문에는 있다
    expect(html).toContain("수정일시·확정여부·비고 3개 컬럼은 캡처 밖"); // 그러나 값은 캡처 밖
    expect(html).not.toContain('data-cfm');                          // 확정 컨트롤 없음
    expect(html).not.toContain('cellsel');
    expect(html.match(/cfm:null/g) ?? []).toHaveLength(7);           // 7행 전부 확정여부 null
    const s43 = readFileSync('docs/mockups/01_투자자산관리/S1_43_관리보수관리.html', 'utf8');
    expect(s43).toContain('data-cfm');                               // 대조군: S1_43 은 갖고 있다
  });

  it('확정 액션이 화면에도 없다', () => {
    const s = resolveSchema('투자금 실사보고');
    expect(s.fields).toHaveLength(0);                     // fields 가 있으면 등록/수정 모달이 켜진다
    expect((s.sample ?? []).every((r) => r.isConfirmed === '-')).toBe(true);
  });
});


describe('inlineSelect(셀 안 select) — 선언이 화면까지 닿는가', () => {
  /* group·note·pinned·unitToggle·CompanyProfileModal.row 에 이어 **여섯 번째** 같은 부류가 되지 않도록
     소비처를 못박는다: 스키마가 선언해도 GenericListPage 가 읽지 않으면 조용히 평상 셀로 남는다. */
  const gl = readFileSync(new URL('./generic_list.tsx', import.meta.url), 'utf8');
  const html = readFileSync('docs/mockups/01_투자자산관리/S1_43_관리보수관리.html', 'utf8');

  it('GenericListPage 가 c.inlineSelect 를 렌더러 분기로 소비한다', () => {
    expect(gl).toContain('c.inlineSelect');
    expect(gl).toContain('InlineSelectCell');
  });

  it('값 변경이 rows(SSOT)에 반영된다 — 그리드 node 만 고치지 않는다', () => {
    expect(gl).toContain('const setCellValue');
    expect(gl).toContain('setRows((prev) => prev.map((r) => (r.id === id');
  });

  /* 마우스 없이 값을 바꿀 수 있어야 한다: 셀 Enter 로 select 에 초점을 넣고,
     초점이 들어간 뒤에는 그리드가 ↑↓ 를 가로채지 않는다. 둘 중 하나만 있으면 키보드로 조작 불가다. */
  it('키보드 경로 2단이 모두 배선돼 있다 (Enter 진입 · 키 가로채기 해제)', () => {
    expect(gl).toContain("querySelector?.('select')?.focus()");
    expect(gl).toContain('suppressKeyboardEvent');
    expect(gl).toContain("tagName === 'SELECT'");
  });

  it('관리보수관리 확정여부가 원문 옵션 2종을 원문 순서로 갖는다', () => {
    const col = resolveSchema('관리보수관리').columns.find((c) => c.key === 'isConfirmed');
    expect(col?.inlineSelect).toEqual(['확정', '미확정']);
    // 원문 option 순서: 확정 먼저, 미확정 다음
    expect(html).toContain("<option'+(r.cfm==='확정'?' selected':'')+'>확정</option><option'+(r.cfm==='미확정'?' selected':'')+'>미확정</option>");
    expect(html).toContain("DATA[+s.getAttribute('data-cfm')].cfm=s.value");
  });

  /* 원문은 배지(cfmTag)를 **정의만 하고 쓰지 않는다** — select 가 그 자리를 차지한다.
     둘 다 그리면 같은 값이 한 셀에 두 번 나온다. */
  it('원문은 확정여부 셀에 배지를 그리지 않는다(select 가 대체)', () => {
    expect(html).toContain('function cfmTag(s)');          // 정의는 있고
    expect(html).not.toContain('cfmTag(r.cfm)');           // 호출은 없다
  });

  it('inlineSelect 선언 컬럼의 값 도메인이 sample 행과 맞는다', () => {
    for (const sc of ALL_SCHEMAS) {
      for (const c of sc.columns) {
        if (!c.inlineSelect) continue;
        for (const r of sc.sample ?? [])
          expect(c.inlineSelect, `${sc.route}.${c.key} 행 값 '${r[c.key]}'`).toContain(String(r[c.key]));
      }
    }
  });

  /* fields 를 채우면 `editable` 이 켜져 원문에 없는 등록 버튼이 생긴다 — inlineSelect 를 쓴 이유 그 자체다. */
  it('inlineSelect 를 쓰는 화면은 fields 가 비어 있다(등록 버튼 금지)', () => {
    for (const sc of ALL_SCHEMAS.filter((x) => x.columns.some((c) => c.inlineSelect)))
      expect(sc.fields, `${sc.route}: inlineSelect 화면에 fields`).toHaveLength(0);
  });
});

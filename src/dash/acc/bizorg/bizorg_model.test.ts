/* 농식품경영체(ACC-023·ACC-024) 순수 모델 + 더미 불변식. */
import { describe, it, expect } from 'vitest';
import { demoEntities, demoIrs, GP_FUNDS, ALL_FUNDS, FIN_YMS } from './bizorg_data';
import type { Shareholder } from './bizorg_data';
import {
  filterEntities, filterIrs, validatePeriod, PERIOD_ERROR, EMPTY_ENTITY_FILTER, EMPTY_IR_FILTER,
  ratioPct, debtRatio, opMargin, summarizeHolders, fundOptions, withGp, participantCount, participantRows,
  sortGovSupports, govSupportTotal, sortMaterials, GOV_TOTAL_LABEL,
} from './bizorg_model';
import type { GovSupport, BizMaterial } from './bizorg_data';
import { PERIOD_ERROR as SLIP_PERIOD_ERROR } from '../slip/deleted_journal_model';

const ENTS = demoEntities();
const IRS = demoIrs();

describe('더미 불변식', () => {
  it('경영체 18건 · IR 10건', () => { expect(ENTS).toHaveLength(18); expect(IRS).toHaveLength(10); });
  it('사업자번호 형식·유일', () => {
    for (const e of ENTS) expect(e.bizNo).toMatch(/^\d{3}-\d{2}-\d{5}$/);
    expect(new Set(ENTS.map((e) => e.bizNo)).size).toBe(ENTS.length);
  });
  it('재무 3개년 · 자본 = 자산 − 부채', () => {
    for (const e of ENTS) {
      expect(e.financials.map((f) => f.ym)).toEqual([...FIN_YMS]);
      for (const f of e.financials) expect(f.equity).toBe(f.assets - f.liabilities);
    }
  });
  it('부채비율이 3개년 모두 같은 경영체가 없다(단일 배율 스케일 금지)', () => {
    for (const e of ENTS) expect(new Set(e.financials.map((f) => debtRatio(f))).size, e.id).toBe(3);
  });
  it('주식구분(= 상세 상장구분)은 설계서 코드 상장/비상장만 — 시장명 필드 없음', () => {
    for (const e of ENTS) { expect(['상장', '비상장']).toContain(e.stockKind); expect(e).not.toHaveProperty('market'); }
  });
  it('주주 3~5명', () => { for (const e of ENTS) expect(e.shareholders.length).toBeGreaterThanOrEqual(3); for (const e of ENTS) expect(e.shareholders.length).toBeLessThanOrEqual(5); });
  it('지분율 합계 100 이 아닌 경영체는 EN07 하나(경고 시연용)', () => {
    expect(ENTS.filter((e) => !summarizeHolders(e.shareholders).ratioOk).map((e) => e.id)).toEqual(['EN07']);
  });
  it('경영체 운용사·자펀드 쌍이 GP_FUNDS 에 있다', () => { for (const e of ENTS) expect(GP_FUNDS[e.gp]).toContain(e.fund); });
  it('IR 운용사·자펀드 쌍이 GP_FUNDS 에 있다', () => { for (const r of IRS) expect(GP_FUNDS[r.gp]).toContain(r.fund); });
  it('참가경영체 id 가 모두 경영체로 풀린다', () => {
    const ids = new Set(ENTS.map((e) => e.id));
    for (const r of IRS) for (const x of r.participants) expect(ids.has(x.entityId)).toBe(true);
  });
  it('IR id 유일 · 참가경영체 1건 이상', () => {
    expect(new Set(IRS.map((r) => r.id)).size).toBe(IRS.length);
    for (const r of IRS) expect(r.participants.length).toBeGreaterThan(0);
  });
  it('호출마다 새 배열(원본 불변)', () => { expect(demoIrs()[0].participants).not.toBe(demoIrs()[0].participants); });
});

describe('경영체 필터', () => {
  it('빈 필터 = 전체, 기업명 가나다순', () => {
    const r = filterEntities(ENTS, EMPTY_ENTITY_FILTER);
    expect(r).toHaveLength(18);
    expect(r.map((e) => e.name)).toEqual([...r.map((e) => e.name)].sort((a, b) => a.localeCompare(b, 'ko')));
  });
  it('기업명 부분일치(대소문자 무시·공백 트림)', () => {
    expect(filterEntities(ENTS, { ...EMPTY_ENTITY_FILTER, name: ' 영농조합 ' }).every((e) => e.name.includes('영농조합'))).toBe(true);
    expect(filterEntities(ENTS, { ...EMPTY_ENTITY_FILTER, name: '영농조합' })).toHaveLength(3);
  });
  it('select 조건 AND', () => {
    const r = filterEntities(ENTS, { ...EMPTY_ENTITY_FILTER, corpKind: '법인', womenYn: '해당', useYn: 'Y' });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.corpKind === '법인' && e.womenYn === '해당' && e.useYn === 'Y')).toBe(true);
    expect(filterEntities(ENTS, { ...EMPTY_ENTITY_FILTER, stockKind: '상장' }).map((e) => e.stockKind)).toEqual(['상장', '상장']);
    expect(filterEntities(ENTS, { ...EMPTY_ENTITY_FILTER, auditYn: 'N', useYn: 'N' }).every((e) => e.auditYn === 'N' && e.useYn === 'N')).toBe(true);
  });
});

describe('IR 필터·기간', () => {
  it('기본 정렬 IR일자 내림차순', () => {
    const d = filterIrs(IRS, EMPTY_IR_FILTER).map((r) => r.date);
    expect(d).toEqual([...d].sort().reverse());
  });
  it('기간 포함 경계', () => {
    const r = filterIrs(IRS, { ...EMPTY_IR_FILTER, from: '2026-04-16', to: '2026-04-28' });
    expect(r.map((x) => x.id).sort()).toEqual(['IR01', 'IR02']);
  });
  it('기간 검증 — 삭제전표와 같은 문구', () => {
    expect(PERIOD_ERROR).toBe(SLIP_PERIOD_ERROR);
    expect(validatePeriod('2026-05-01', '2026-04-01')).toBe(PERIOD_ERROR);
    expect(validatePeriod('2026-04-01', '2026-04-01')).toBeNull();
    expect(validatePeriod('', '2026-04-01')).toBeNull();
  });
  it('IR명·장소 부분일치, 운용사·자펀드·사용여부 정확일치', () => {
    expect(filterIrs(IRS, { ...EMPTY_IR_FILTER, name: '개별' }).every((r) => r.name.includes('개별'))).toBe(true);
    expect(filterIrs(IRS, { ...EMPTY_IR_FILTER, place: 'aT센터' }).map((r) => r.id).sort()).toEqual(['IR01', 'IR06']);
    expect(filterIrs(IRS, { ...EMPTY_IR_FILTER, gp: '바다숲캐피탈' }).every((r) => r.gp === '바다숲캐피탈')).toBe(true);
    expect(filterIrs(IRS, { ...EMPTY_IR_FILTER, fund: '한결 푸드테크 투자조합' }).map((r) => r.id).sort()).toEqual(['IR02', 'IR10']);
    expect(filterIrs(IRS, { ...EMPTY_IR_FILTER, useYn: 'N' }).map((r) => r.id)).toEqual(['IR07']);
  });
  it('참가수 = 참가 배열 길이', () => {
    expect(participantCount(IRS.find((r) => r.id === 'IR06')!)).toBe(5);
  });
});

describe('운용사 → 자펀드 연동', () => {
  it('운용사 미선택 = 전체 자펀드, 선택 = 그 운용사 자펀드만', () => {
    expect(fundOptions('')).toEqual(ALL_FUNDS);
    expect(fundOptions('푸른들자산운용')).toEqual(['푸른들 청년창업 농식품 조합']);
    expect(fundOptions('없는운용사')).toEqual([]);
  });
  it('운용사가 바뀌면(해제 포함) 자펀드 리셋, 같으면 유지', () => {
    const f = { ...EMPTY_IR_FILTER, gp: '바다숲캐피탈', fund: '바다숲 수산혁신 1호 조합' };
    expect(withGp(f, '한결벤처파트너스')).toMatchObject({ gp: '한결벤처파트너스', fund: '' });
    expect(withGp(f, '')).toMatchObject({ gp: '', fund: '' });
    expect(withGp(f, '바다숲캐피탈')).toBe(f);
  });
});

describe('재무비율', () => {
  it('소수 1자리 · 분모 0 = null', () => {
    expect(ratioPct(1, 3)).toBe(33.3);
    expect(ratioPct(2, 3)).toBe(66.7);
    expect(ratioPct(5, 0)).toBeNull();
    expect(ratioPct(-12, 100)).toBe(-12);
  });
  it('부채비율 = 부채/자본, 영업이익률 = 영업이익/매출', () => {
    const f = { ym: '2025.12', assets: 300, liabilities: 120, equity: 180, revenue: 400, opIncome: 30, netIncome: 21 };
    expect(debtRatio(f)).toBe(66.7);
    expect(opMargin(f)).toBe(7.5);
    expect(opMargin({ ...f, revenue: 0 })).toBeNull();
    expect(debtRatio({ ...f, equity: 0 })).toBeNull();
    expect(opMargin({ ...f, revenue: -10 })).toBeNull();
  });
  it('자본잠식(자본 음수) → 부채비율 N/A', () => {
    const f = { ym: '2025.12', assets: 100, liabilities: 130, equity: -30, revenue: 50, opIncome: -5, netIncome: -4 };
    expect(debtRatio(f)).toBeNull();
    expect(ratioPct(130, -30)).toBeNull();
  });
  it('EN12 2023.12 매출 0 → 영업이익률 N/A', () => {
    expect(opMargin(ENTS.find((e) => e.id === 'EN12')!.financials[0])).toBeNull();
  });
});

describe('주주 합계', () => {
  const h = (name: string, ratio: number): Shareholder => ({ name, relation: '기타', stockType: '보통주', shares: ratio * 1000, ratio, parValue: 500, acquiredAt: '2020-01-01', note: '' });
  it('지분율 내림차순 + 합계', () => {
    const s = summarizeHolders([h('가', 20), h('나', 50), h('다', 30)]);
    expect(s.rows.map((r) => r.name)).toEqual(['나', '다', '가']);
    expect(s.totalShares).toBe(100_000);
    expect(s.totalRatio).toBe(100);
    expect(s.ratioOk).toBe(true);
  });
  it('부동소수 합(33.3+33.3+33.4)도 100 으로 본다', () => {
    expect(summarizeHolders([h('a', 33.3), h('b', 33.3), h('c', 33.4)]).ratioOk).toBe(true);
  });
  it('100 이 아니면 경고 플래그', () => {
    const s = summarizeHolders([h('a', 50), h('b', 48.5)]);
    expect(s.totalRatio).toBe(98.5);
    expect(s.ratioOk).toBe(false);
  });
});

describe('참가경영체 행', () => {
  it('상담일자 → 기업명 순, 경영체 정보 결합', () => {
    const rows = participantRows(IRS.find((r) => r.id === 'IR10')!, ENTS);
    expect(rows.map((r) => r.consultDate)).toEqual(['2026-10-22', '2026-10-22', '2026-10-23']);
    expect(rows[0].name.localeCompare(rows[1].name, 'ko')).toBeLessThan(0);
    expect(rows.every((r) => r.entity !== null)).toBe(true);
  });
  it('못 찾는 id 는 entity null', () => {
    const ir = { ...IRS[0], participants: [{ entityId: 'ZZ', consultDate: '2026-01-01', consultKind: '집합' as const, opinion: '', manager: '' }] };
    expect(participantRows(ir, ENTS)[0]).toMatchObject({ entity: null, name: '-' });
  });
});

describe('정부지원사업·사업계획서/홍보자료', () => {
  it('경영체마다 0~4건, EN18 은 둘 다 0건, id 유일', () => {
    for (const e of ENTS) {
      expect(e.govSupports.length).toBeLessThanOrEqual(4);
      expect(e.materials.length).toBeLessThanOrEqual(4);
    }
    const en18 = ENTS.find((e) => e.id === 'EN18')!;
    expect(en18.govSupports).toEqual([]);
    expect(en18.materials).toEqual([]);
    expect(ENTS.some((e) => e.govSupports.length === 4)).toBe(true);
    const ids = ENTS.flatMap((e) => [...e.govSupports.map((g) => g.id), ...e.materials.map((m) => m.id)]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('데이터 형식 — 사업연도 YYYY · 지원기간 YYYY.MM~YYYY.MM · 수정일자 YYYY.MM.DD', () => {
    for (const e of ENTS) {
      for (const g of e.govSupports) { expect(g.year).toMatch(/^\d{4}$/); expect(g.period).toMatch(/^\d{4}\.\d{2}~\d{4}\.\d{2}$/); }
      for (const m of e.materials) expect(m.updatedAt).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    }
  });
  const g = (year: string, period: string, name: string, amount: number): GovSupport =>
    ({ id: name, year, name, agency: 'x', supportType: '보조금', period, amount, status: '진행', note: '' });
  it('정부지원 정렬 — 사업연도 내림차순 → 지원기간 내림차순 → 사업명', () => {
    const r = sortGovSupports([g('2024', '2024.01~2024.12', '나', 10), g('2026', '2026.01~2026.12', '다', 20), g('2024', '2024.05~2024.12', '가', 30), g('2024', '2024.05~2024.12', '라', 5)]);
    expect(r.map((x) => x.name)).toEqual(['다', '가', '라', '나']);
  });
  it('지원금액 합계', () => {
    expect(govSupportTotal([g('2024', '2024.01~2024.12', 'a', 180), g('2025', '2025.01~2025.12', 'b', 250)])).toBe(430);
    expect(govSupportTotal([])).toBe(0);
  });
  it('지원금액 합계 — 취소 건 제외', () => {
    const cancelled = { ...g('2025', '2025.05~2026.04', 'c', 150), status: '취소' as const };
    expect(govSupportTotal([g('2024', '2024.01~2024.12', 'a', 180), cancelled, g('2025', '2025.01~2025.12', 'b', 250)])).toBe(430);
    expect(govSupportTotal([cancelled])).toBe(0);
  });
  it('합계 행 라벨이 취소 제외를 드러낸다', () => { expect(GOV_TOTAL_LABEL).toBe('합계(취소 제외)'); });
  it('자료 정렬 — 수정일자 내림차순 → 자료명', () => {
    const m = (title: string, updatedAt: string): BizMaterial => ({ id: title, kind: '홍보자료', title, fileName: `${title}.pdf`, updatedAt });
    expect(sortMaterials([m('나', '2025.03.10'), m('다', '2026.01.15'), m('가', '2025.03.10')]).map((x) => x.title)).toEqual(['다', '가', '나']);
  });
});

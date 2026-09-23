/* 조기경보 > 기업정보 2리프 — 원문 여러 화면을 **탭으로 통합**한 조회 전용 페이지.
   - 투자기업정보(NICE평가정보) = 탭 3: S2_65 기업개요 · S2_66 투자기업사업장정보 · S2_67 법정관리및화의정보
   - 투자기업신용정보 조회     = 탭 2: S2_69 신용등급 · S2_68 현금흐름등급
   데이터·컬럼은 risk_corp_info_data.ts(원문 파싱 실측)가 SSOT, 표 규약은 risk_grid.tsx, 바깥 양식은 risk_page_kit.tsx.

   목업 → 우리 규약
   - 원문 화면 N개 → 탭 N개(WAI-ARIA Tabs). 탭 라벨 = 원문 `<h1>`. 활성 탭만 마운트(AG Grid 폭 0 초기화 방지).
     세 원문이 **같은 검색박스**(기준일자 · 구분 · 운용사/자펀드)를 가져 드로어 하나를 공유하되,
     운용사/자펀드 선택지는 탭(원문 화면)마다 원문 스크립트 표본이 달라 탭을 바꾸면 대상 선택을 비운다.
   - 구분 = 운용사/자펀드 2종 고정(원문 설계메모 확정, '전체' 없음). 대상 라벨은 원문 스크립트처럼 구분을 따라 바뀐다.
   - 구분=자펀드 + 대상 선택 → 행의 자펀드 컬럼으로 **실제로 거른다**. 운용사 대상·기준일자는 행에 대응 컬럼이 없어
     `· 데이터 연동 후 적용` 캡션을 단다(무신호 무효 필터 금지 — apfs-detail-filter).
   - 원문 `조회` 버튼은 없다(필터 즉시 반영). `엑셀` 은 푸터 내보내기 아이콘 + ⌥D(활성 탭 표를 그대로).
   - 행 선택 없음(조회 전용 — 원문의 행 하이라이트는 액션이 없는 표시 전용이었다) · KPI 배지 행·카드뷰 없음.
   - ⚠검토필요 마커: S2_69 `CRI기준일자` 헤더 1건(원문 유지 마커, 문구 그대로). 원문 스캐폴딩·설계메모는 옮기지 않는다. */
import React, { useMemo, useState } from 'react';
import { mn, useMask } from './mask';
import { toast } from './ui/sonner';
import { RiskPage, TabBar, TabPanel } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import { exportTables } from './risk_excel';
import { NICE_TABS, CREDIT_TABS, GUBUN_OPTIONS, CORP_BASE_DATE } from './risk_corp_info_data';
import type { CorpTab, Gubun } from './risk_corp_info_data';

function CorpInfoTabsPage({ label, tabs, idBase, onNav }: { label: string; tabs: CorpTab[]; idBase: string; onNav?: (r: string) => void }) {
  const masked = useMask();
  const [tabId, setTabId] = useState(tabs[0].id);
  const [date, setDate] = useState(CORP_BASE_DATE);
  const [gubun, setGubun] = useState<Gubun>('운용사');
  const [target, setTarget] = useState('');
  const tab = tabs.find((t) => t.id === tabId) ?? tabs[0];

  const switchTab = (id: string) => { setTabId(id); setTarget(''); };
  const reset = () => { setDate(CORP_BASE_DATE); setGubun('운용사'); setTarget(''); };

  /* 구분=자펀드 + 대상 → 행의 자펀드 컬럼으로 거른다. 그 외(운용사 대상 · 자펀드 컬럼 없는 탭)는 no-op */
  const targetFilters = gubun === '자펀드' && !!tab.fundKey;
  const rows = useMemo(
    () => (targetFilters && target ? tab.table.rows.filter((r) => r[tab.fundKey!] === target) : tab.table.rows),
    [tab, targetFilters, target],
  );

  const filters: FilterSpec[] = [
    { label: '기준일자', kind: 'day', value: date, onChange: setDate, allLabel: '', noop: true },
    { label: '구분', kind: 'select', value: gubun, onChange: (v) => { setGubun(v as Gubun); setTarget(''); }, options: GUBUN_OPTIONS, allLabel: null },
    /* 원문 라벨 '운용사/자펀드' 는 구분 선택에 따라 '운용사'/'자펀드' 로 바뀐다(원문 스크립트 동적 관계) */
    { label: gubun, kind: 'select', value: target, onChange: setTarget, options: tab.targets[gubun], noop: !targetFilters },
  ];

  const hasAmount = tab.table.cols.some((c) => c.kind === 'amount');
  const exportExcel = () => {
    exportTables(`${label}_${tab.label}`, [{ name: tab.label, table: tab.table, rows }], null, masked);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage group="기업정보" label={label} route={label} onNav={onNav}
      filters={filters} onReset={reset}
      unitCaption={hasAmount ? '단위: 원' : undefined}
      footerLeft={<span>{`기준일자 ${date ? mn(date) : '-'} · ${tab.label} 총 ${mn(String(rows.length))}건`}</span>}
      onExport={exportExcel}>
      <TabBar tabs={tabs.map((t) => ({ id: t.id, label: t.label }))} value={tab.id} onChange={switchTab} idBase={idBase} label={label} />
      <TabPanel idBase={idBase} value={tab.id}>
        <ReadGrid key={tab.id} table={tab.table} rows={rows} ariaLabel={tab.label} />
      </TabPanel>
    </RiskPage>
  );
}

/** 투자기업정보(NICE평가정보) — S2_65 + S2_66 + S2_67 */
export function CorpNiceInfo({ onNav }: { onNav?: (r: string) => void }) {
  return <CorpInfoTabsPage label="투자기업정보(NICE평가정보)" tabs={NICE_TABS} idBase="nice" onNav={onNav} />;
}

/** 투자기업신용정보 조회 — S2_69 + S2_68 */
export function CorpCreditInfo({ onNav }: { onNav?: (r: string) => void }) {
  return <CorpInfoTabsPage label="투자기업신용정보 조회" tabs={CREDIT_TABS} idBase="credit" onNav={onNav} />;
}

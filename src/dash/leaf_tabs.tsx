/* leaf_tabs.tsx — 메뉴 리프 하나에 원문 화면이 둘 이상일 때, 그 화면들을 **탭으로 오가게** 묶는 얇은 부품.

   왜 필요한가: docs/메뉴구성도_v0.2.md 에서 한 리프가 원본 2개를 가리키면 한 화면 안에서 둘 다 도달 가능해야 한다
   (수시보고 확인 = S1_04 + S5_117 · 정기보고 = S1_06 + S1_29 · 자펀드 수탁관리 = S1_26 + S1_27).
   각 원본은 이미 **자기 GridFrame(툴바·필터·푸터)을 가진 완결 페이지**라 한 프레임으로 합치면 두 화면의 툴바를
   섞어야 한다. 그래서 선례 report_bucheo(탭 = 원문 h1, 탭별로 툴바가 바뀜)와 같은 모양을 **페이지 교체**로 만든다:
   리프 래퍼가 탭 상태를 갖고 활성 탭의 페이지만 마운트하며, 각 페이지는 받은 slot 의 탭 바를 본문 첫머리에 그린다.

   계약
   - 페이지의 `tabs` prop 은 **opt-in** — 넘기지 않으면 종전 화면 그대로다(탭 바 없음 · 자기 제목/브레드크럼/즐겨찾기).
   - 넘기면 제목·브레드크럼·즐겨찾기 route 는 **리프**의 것을 쓴다(카드 제목 = 메뉴 리프 라벨, apfs-grid 타이틀 규약).
   - 활성 탭만 마운트한다 — display:none 패널 안의 AG Grid 는 폭 0 으로 초기화된다(risk_page_kit TabPanel 주석).
   - 탭을 바꾸면 페이지가 교체되며 탭 버튼도 새로 마운트된다 → 사용자가 바꾼 경우에만 새 탭 버튼으로 초점을 옮긴다
     (키보드 ←/→ 조작 중 초점이 document 로 떨어지지 않게). */
import React, { useEffect, useRef, useState } from 'react';
import { TabBar, TabPanel } from './risk_page_kit';

export interface LeafTabsSlot {
  /** 탭 바(TabBar) — 페이지가 본문 첫머리에 그린다 */
  bar: React.ReactNode;
  idBase: string;
  /** 활성 탭 id(TabPanel aria 연결) */
  value: string;
  /** 탭을 품은 메뉴 리프 라벨 = 카드 제목 */
  label: string;
  crumbs: string[];
  /** 즐겨찾기 route = 메뉴 리프 route */
  route: string;
}

export interface LeafTab<T extends string> { id: T; label: string }

export function useLeafTabs<T extends string>({ tabs, initial, idBase, label, crumbs, route }: {
  tabs: readonly LeafTab<T>[]; initial: T; idBase: string; label: string; crumbs: string[]; route: string;
}): { tab: T; slot: LeafTabsSlot } {
  const [tab, setTab] = useState<T>(initial);
  const userChanged = useRef(false);
  useEffect(() => {
    if (!userChanged.current) return;
    userChanged.current = false;
    document.getElementById(`${idBase}-tab-${tab}`)?.focus();
  }, [tab, idBase]);
  const bar = (
    <TabBar tabs={tabs.map((t) => ({ id: t.id, label: t.label }))} value={tab}
      onChange={(id) => { if (id !== tab) { userChanged.current = true; setTab(id as T); } }}
      idBase={idBase} label={label} />
  );
  return { tab, slot: { bar, idBase, value: tab, label, crumbs, route } };
}

/** 페이지 본문 래퍼 — slot 이 있으면 탭 바 + tabpanel, 없으면 본문 그대로(종전 DOM 불변) */
export function LeafTabBody({ slot, children }: { slot?: LeafTabsSlot; children: React.ReactNode }) {
  if (!slot) return <>{children}</>;
  return (
    <>
      {slot.bar}
      <TabPanel idBase={slot.idBase} value={slot.value}>{children}</TabPanel>
    </>
  );
}

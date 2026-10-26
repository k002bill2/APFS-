/* 투자기업정보(통합) — 조회 전용 3섹션 화면 (투자자산관리 > 투자기업정보, route `investee-profile`).
   출처: docs/mockups/01_투자자산관리/S1_30_투자기업정보.html (2026-09-15 파싱 실측)

   왜 전용 페이지인가: S1_30 은 **목록이 아니라 기업 1건의 상세**다 — 기업개요 kv(34항목) +
   재무제표(2행) + 주주명부(4행, 보통주/우선주 2단 헤더). `PageSchema` 는 `columns` 가 한 벌이라
   이 셋을 담지 못하고, 억지로 평평한 리스트로 접으면 "비슷해 보이는 다른 화면"이 된다.

   이전 상태(2026-09-15 이전): 이 라우트가 스키마 주도 GenericListPage 로 떨어져 **합성 더미 20행**을
   보여 줬다. 원문에 없는 행이라 전부 제거하고 원문 3섹션을 그대로 싣는다.

   데이터·표 마크업은 `company_profile_model.tsx` 가 SSOT 다(같은 원문을 팝업도 쓴다 — 복사 금지).
   스키마 `schemas/investee_profile_schema.ts` 는 삭제하지 않는다: 라우트 레지스트리(resolveSchema)가
   DEFAULT_SCHEMA 로 떨어지지 않게 하는 등록부이자, clipboard 캡처 기반 등록/수정 양식의
   provenance 기록이다(그 21필드는 S1_30 이 아니라 별도 캡처가 출처다 — 출처를 바꿔 적지 않는다).

   조회 대상 = 적용 필터 칩 1개(값만, '농식품모태펀드 › KB증권 › …', × = 전체로 해제 — 2026-10-14 사용자 지시,
   다른 화면 필터 스타일 통일). wide — 최대 480px, 좁으면 2줄(구분자 'NBSP› ' 라 › 가 줄 끝에 붙는다). 툴바 우측 = 금액 단위 · 상세필터(드로어, 4항목 noop) · 조회(toast 만). */
import { useState } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { useHotkey, HOTKEYS } from '../../use-hotkey';   // ⌘P 인쇄(푸터 툴팁 힌트와 짝)
import { printGrid } from '../../print_grid';
import { CompanyProfileBody } from './company_profile_model';
import { SOURCE_COUNTS, CO_NAME } from './company_profile_data';
import { UNITS, DEFAULT_UNIT } from '../../schemas/unit';
import type { Unit } from '../../schemas/unit';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본
import { toast } from '../../ui/sonner';

const { Button, SegTabs, IconBtn } = UI;

/* 원문 S1_30 검색박스의 값(= 기본값) — 문자열·옵션은 원문 그대로(창작 금지).
   원문 각 select 에 옵션이 하나씩뿐이다(모펀드만 농식품모태펀드/MOAF 2개). */
const QUERY_FIELDS = [
  { label: '모펀드', value: '농식품모태펀드' },
  { label: '운용사', value: 'KB증권' },
  { label: '자펀드', value: '현대동양농식품사모투자전문회사' },
  { label: '투자기업', value: CO_NAME },
] as const;
const MF_OPTIONS = ['농식품모태펀드', 'MOAF'];
const GP_OPTIONS = ['KB증권'];
const FUND_OPTIONS = ['현대동양농식품사모투자전문회사'];
const CO_OPTIONS = [CO_NAME];

/* 상세필터 드로어 필드 — regular_report_manage 의 DrawerField 패턴 그대로(noop = 미연동 캡션) */
function DrawerField({ label, noop, children }: { label: string; noop?: boolean; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </label>
  );
}

export function InvesteeProfile({ onNav }: { onNav?: (r: string) => void }) {
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  useHotkey(HOTKEYS.print.combo, printGrid);
  /* 조회 대상 4종 SSOT — 적용 필터 칩과 상세필터 드로어가 공유한다. 실데이터가 1건뿐이라 본문은 바뀌지 않는다 */
  const [fMf, setFMf] = useState<string>(QUERY_FIELDS[0].value);
  const [fGp, setFGp] = useState<string>(QUERY_FIELDS[1].value);
  const [fFund, setFFund] = useState<string>(QUERY_FIELDS[2].value);
  const [fCo, setFCo] = useState<string>(QUERY_FIELDS[3].value);
  const [filterOpen, setFilterOpen] = useState(false);
  const resetFilters = () => { setFMf(QUERY_FIELDS[0].value); setFGp(QUERY_FIELDS[1].value); setFFund(QUERY_FIELDS[2].value); setFCo(QUERY_FIELDS[3].value); };
  /* 칩 × = 네 항목 모두 '전체'('') 로 해제 — 전부 비면 칩 자체가 사라진다(초기화=원문 기본값 복원과는 별개) */
  const clearFilters = () => { setFMf(''); setFGp(''); setFFund(''); setFCo(''); };
  /* 조회 — 필터를 기본값으로 되돌리지 않는다(선택한 조회 대상 유지) */
  const refresh = () => { toast.success('조회되었습니다'); };
  const path = [fMf, fGp, fFund, fCo];
  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '투자기업정보', '투자기업정보(통합)']}
      title="투자기업정보(통합)"
      favRoute="investee-profile"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={[{ label: '조회 대상', value: path.some(Boolean) ? path.map((v) => v || '전체').join('\u00a0› ') : '', wide: true, onClear: clearFilters }]}
      toolbarRight={<>
        <span className="text-muted-foreground" style={{ fontSize: 13 }}>금액 단위</span>
        <SegTabs size="sm" options={UNITS as unknown as string[]} value={unit} onChange={(v: string) => setUnit(v as Unit)} />
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={(
        <span>
          {`기업개요 ${SOURCE_COUNTS.overview}항목 · 재무제표 ${SOURCE_COUNTS.financial}건 · 주주명부 ${SOURCE_COUNTS.shareholder}건 (원문 그대로)`}
        </span>
      )}
      footerRight={<FooterActions />}>
      {/* 원문이 세 표를 세로로 쌓는 상세 화면이라 탭으로 나누지 않는다 — 한 기업의 단면을 한 번에 본다 */}
      <div style={{ padding: '16px 2px 8px' }}>
        <CompanyProfileBody variant="page" unit={unit} />
      </div>

      {/* 상세필터 드로어 — 선례 regular_report_manage 와 동일(Sheet right · DrawerSelect).
          실데이터가 (주)선양 1건뿐이라 4항목 모두 noop 캡션으로 "적용해도 본문은 그대로"임을 알린다 */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">조회 대상 투자기업을 고르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={MF_OPTIONS} /></DrawerField>
            <DrawerField label="운용사" noop><DrawerSelect value={fGp} onChange={setFGp} options={GP_OPTIONS} /></DrawerField>
            <DrawerField label="자펀드" noop><DrawerSelect value={fFund} onChange={setFFund} options={FUND_OPTIONS} /></DrawerField>
            <DrawerField label="투자기업" noop><DrawerSelect value={fCo} onChange={setFCo} options={CO_OPTIONS} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </GridFrame>
  );
}

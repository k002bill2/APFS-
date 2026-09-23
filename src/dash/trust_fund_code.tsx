/* 수탁보고 > 자펀드 수탁 > 자펀드코드 조회 — 원문 S3_99 조합코드 관리(편집형 목록).
   카드 제목·브레드크럼은 메뉴 리프 라벨(자펀드코드 조회)이다 — 원문 h1(조합코드 관리)이 아니다(apfs-grid 타이틀 규약).

   목업 → 우리 규약
   - 검색박스 수탁기관(옵션 1개 농협중앙회, '전체' 없음) → 상세필터 드로어. 행에 수탁기관 칸이 없어 조회 조건으로만.
   - 목록 5열: NO · 조합이름 · 수탁기관조합코드(입력칸) · 자조합수탁/모태수탁(체크박스). 원문 DATA 4행 그대로
     (원문 주석 "1행은 원본 실데이터, 이하 데모 행" — 원문에 있는 행이라 개수를 바꾸지 않는다).
   - 입력칸·체크박스 값은 **행 state 가 SSOT** — 셀 안 컨트롤 값을 행에 즉시 반영하고, 엑셀·저장이 그 값을 쓴다
     (체크박스는 제어형, 입력칸은 캐럿 보존을 위해 defaultValue + onChange).
     체크값은 Cell 계약상 'Y'/'N'.
   - 목록바 [저장] + 원문 검토필요 마커(저장 버튼은 원문 추론 배치) → 툴바 액션(상세필터 오른쪽). 저장은 원문처럼 토스트.
   - 원문 [조회] 는 즉시 반영이라 두지 않는다. 엑셀은 푸터 내보내기(⌥D). 행 선택 없음(선택이 만드는 액션이 없다). */
import React, { useCallback, useMemo, useState } from 'react';
import { UI } from './components';
import { mn, MT, useMask } from './mask';
import { toast } from './ui/sonner';
import { Checkbox } from './ui/checkbox';
import { ReviewMarker } from './review_marker';
import { RiskPage } from './risk_page_kit';
import type { FilterSpec } from './risk_page_kit';
import { ReadGrid } from './risk_grid';
import type { CellRenderers } from './risk_grid';
import { exportTables } from './risk_excel';
import type { Row } from './risk_table_meta';
import { FUND_CODE_TABLE, FUND_CODE_ORGS, FUND_CODE_SAVE_NOTE } from './trust_sub_data';

const { Button } = UI;
const LABEL = '자펀드코드 조회';

export function TrustFundCode({ onNav }: { onNav?: (r: string) => void }) {
  const masked = useMask();
  const [rows, setRows] = useState<Row[]>(FUND_CODE_TABLE.rows);
  const [org, setOrg] = useState<string>(FUND_CODE_ORGS[0]);

  /* 불변 갱신 — 원문 DATA 배열을 건드리지 않는다 */
  const patch = useCallback((id: string, key: string, v: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: v } : r)));
  }, []);

  /* 참조 안정 필수 — 바뀌면 ReadGrid 컬럼 정의가 다시 만들어진다(폭 되돌림) */
  /* 접근名에 행 이름을 싣되 마스크 ON 이면 행 번호로 대신한다(<MT> 가 가린 값이 aria-label 로 새지 않게) */
  const who = useCallback((r: Row) => (masked ? `${String(r.no)}번 행` : String(r.nm)), [masked]);
  const renderers = useMemo<CellRenderers>(() => {
    const check = (key: 'sub' | 'mo', label: string) => (r: Row) => (
      <Checkbox checked={r[key] === 'Y'} aria-label={`${who(r)} ${label}`}
        onCheckedChange={(c) => patch(r.id, key, c === true ? 'Y' : 'N')} />
    );
    return {
      /* 마스크 ON 이면 입력칸(원값이 value 로 노출)을 그리지 않고 <MT> 표시만 — 가린 채 편집하는 화면은 없다 */
      code: (r) => (masked ? <MT>{String(r.code ?? '')}</MT> : (
        /* 비제어(defaultValue) — 행 state 는 onChange 로 계속 갱신(엑셀·저장 SSOT)하되, 값을 다시 써 넣지 않는다.
           제어형이면 그리드가 셀을 비동기로 다시 그리며 value 를 덮어 중간 편집 시 캐럿이 끝으로 튄다(2026-09-23 실측) */
        <input type="text" defaultValue={String(r.code ?? '')} aria-label={`${who(r)} 수탁기관조합코드`}
          onChange={(e) => patch(r.id, 'code', e.target.value)}
          className="text-center tabular-nums"
          style={{ width: '100%', maxWidth: 170, height: 30, padding: '0 8px', borderRadius: 7, border: '1px solid var(--border-strong)', background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5, fontFamily: 'inherit' }} />
      )),
      sub: check('sub', '자조합수탁'),
      mo: check('mo', '모태수탁'),
    };
  }, [patch, who, masked]);

  const filters: FilterSpec[] = [
    { label: '수탁기관', kind: 'select', value: org, onChange: setOrg, options: FUND_CODE_ORGS, allLabel: null, noop: true },
  ];
  /* 드로어 초기화·새로고침 공용 — 조회 조건만 되돌린다(편집 중인 행 값은 저장 대상이라 지우지 않는다) */
  const reset = () => setOrg(FUND_CODE_ORGS[0]);
  const save = () => toast.success('조합코드가 저장되었습니다 (목업)');
  const exportExcel = () => {
    exportTables(LABEL, [{ name: LABEL, table: FUND_CODE_TABLE, rows }], null, masked);
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <RiskPage system="수탁보고" group="자펀드 수탁" label={LABEL} route={LABEL} onNav={onNav}
      filters={filters} onReset={reset}
      actions={
        <span className="inline-flex items-center gap-1">
          <Button variant="outline" size="sm" leadingIcon="check" onClick={save}>저장</Button>
          <ReviewMarker rec={FUND_CODE_SAVE_NOTE.rec} dat={FUND_CODE_SAVE_NOTE.dat} label="저장" />
        </span>
      }
      footerLeft={<span>수탁기관 <MT>{org}</MT> · 총 {mn(String(rows.length))}건</span>}
      onExport={exportExcel}>
      <ReadGrid table={FUND_CODE_TABLE} rows={rows} ariaLabel={LABEL} cellRenderers={renderers} />
    </RiskPage>
  );
}

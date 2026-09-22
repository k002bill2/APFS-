/* 운용사별 조기경보 재무정보 — 읽기전용 팝업
   출처: docs/mockups/02_조기경보/S2_47_운용사별_조기경보_조회.html 의 `openFinPop`(= S2_48 화면).
   목업 설계메모: "운용사별 조기경보 재무정보"는 독립 메뉴가 아니라 **이 팝업 하나로만** 존재한다.

   구성(목업 → 우리 규약):
   - modal-head(제목 + who2 한 줄)  → `DialogHeader` 제목 + 부제(운용사명 · 운용사구분 · 기준년월)
   - unitbar(원/백만원/억원)         → `SegTabs size="sm"`, 기본 `원`. 저장 base = **원**(목업 `data-base` 동일)
   - 섹션 ①재무정보 ②손익정보       → kv 그리드(금액, 단위 토글 반영). 음수는 `--danger-text`
   - 섹션 ③정량지표                  → kv 그리드(금액 아님 — 원문 문자열 그대로, 단위 변환 대상 아님)
   - 섹션 ④기준년월별 추이           → 가로 스크롤 표 7열 + 하단 `단위 : {선택단위}` 캡션
   - 섹션 ⑤지표등급 변경정보         → 2단 헤더 표(변경일자·정량지표 rowSpan / 등급 colSpan 2 / 변경사유 rowSpan), 본문 빈 상태
   - ⚠검토필요 마커 3건              → 목업 `data-rec`/`data-dat` 원문 그대로 전수 이식(단위바·정량지표·등급)

   ⚠ 팝업 값은 **구조 시연용 표본**이다 — 목업이 원문에서 확인된 유일한 표본((유)동문파트너스)을 모든 행에
     재사용한다고 명시했다. 행마다 달라지는 실데이터가 아니며, 신규 데이터를 창작하지 않는다.
   ⚠ 목업은 `엑셀`·`출력`을 modal-head 우측에 뒀지만, 우리 `DialogContent` 는 헤더 우측 상단에 자체 닫기(X)를
     **절대배치**하므로 같은 자리에 버튼을 두면 겹친다 → DS 골드(`subfund_spec_modal.tsx`)대로 **푸터**에 둔다.
     항목·동작(엑셀 다운로드 / 인쇄 / 닫기)은 목업과 같다. */
import React, { useState } from 'react';
import { UI } from './components';
import { mn, MT, useMask } from './mask';
import { fmt } from './aggrid_theme';   // 숫자 표기 SSOT(정수=콤마) — 자체 포매터 재구현 금지
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';

const { Button, SegTabs } = UI;

/* ── 금액 단위 — 저장 base = 원(목업 `data-base`). 목업 `fmtAmt` 의 자릿수를 그대로 따른다:
      원=콤마 정수 · 백만원=소수 1자리 · 억원=소수 2자리 ── */
type Unit = '원' | '백만원' | '억원';
const UNITS: Unit[] = ['원', '백만원', '억원'];
const UNIT_DIV: Record<Unit, number> = { 원: 1, 백만원: 1e6, 억원: 1e8 };
const UNIT_DIGITS: Record<Unit, number> = { 원: 0, 백만원: 1, 억원: 2 };
/* null → '-' (형제 `fund_early_warning_yield_modal.tsx` 의 `money` 와 동형). **나눗셈 전에** 판정한다 —
   null/1e6 은 0 이라 백만원·억원에서 조용히 `0` 으로 찍히고, 원 단위에선 `fmt(null)` 이 던진다. */
function money(won: number | null, unit: Unit): string {
  if (won == null) return '-';
  if (unit === '원') return mn(fmt(won));
  const d = UNIT_DIGITS[unit];
  return mn((won / UNIT_DIV[unit]).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }));
}

/* 목업 `.review[data-rec][data-dat]` ⚠검토필요 마커 3건(금액 단위·정량지표·등급)은
   **이식하지 않는다** — 2026-09-21 사용자 지시("이 i 들은 구현하지마").
   원문 미정의 사항 자체는 남아 있다: 표시금액 base=원 가정 · 정량지표 단위 미표기 ·
   등급코드 CDTP 미확인. 화면에 띄우지 않을 뿐이라 실개발 전 확인은 여전히 필요하다. */

/* ── 표본 데이터 — 목업 `FIN`/`PROFIT`/`RATIO`/`TREND` 값 그대로(base = 원) ── */
const FIN: [string, number][] = [
  ['유동자산', 900_125_478], ['유동부채', 387_763_257], ['부채총계', 387_763_257],
  ['자본금', 100_000_000], ['자본잉여금', 0], ['이익잉여금', 2_298_206_548],
  ['자본조정', 0], ['자산총계', 3_065_370_755], ['자본총계', 2_677_607_498],
];
const PROFIT: [string, number][] = [
  ['매출액', 0], ['영업이익', -59_765_440], ['당기순이익', -59_964_734],
];
/* 정량지표 — 금액이 아니라 **문자열 그대로**다(원문에 단위 표기가 없어 값만 제공). 단위 토글 대상 아님. */
const RATIO: [string, string][] = [
  ['자본충실도', '2,677.61'], ['부채비율', '14.48'],
  ['총자산수익률', '-1.11'], ['자기자본이익률', '-1.15'],
];
/* 기준년월별 추이 — 목업 TREND 1행. 키 순서 = 표 헤더 순서 */
const TREND_HEAD = ['기준년월', '당기순이익', '기초자기자본', '기말자기자본', '기초자산총계', '기말자산총계', '자본총계'];
const TREND: { ym: string; v: number[] }[] = [
  { ym: '2024-12', v: [725_759_455, 2_112_747_248, 2_798_906_703, 2_658_672_413, 2_951_863_032, 2_798_906_703] },
];

/* ── 프리미티브(골드 `subfund_spec_modal.tsx` / `custody_confirm_detail_modal.tsx` 복사 관례) ── */
function Section({ title, unitNote, children }: { title: string; unitNote?: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="flex items-center gap-2 text-lg font-bold border-b-2 border-border pb-2 mt-0 mb-3">
        {title}
        {unitNote && <span className="ml-auto text-caption font-semibold" style={{ fontSize: 12.5 }}>{unitNote}</span>}
      </h3>
      {children}
    </section>
  );
}

const KV_COLS: React.CSSProperties = { gridTemplateColumns: '150px minmax(0,1fr)' };
const DT_STYLE: React.CSSProperties = { padding: '8px 12px', fontSize: 13 };
const negStyle = (neg: boolean): React.CSSProperties | undefined => (neg ? { color: 'var(--danger-text)' } : undefined);

/* kv 그리드 — 라벨(dt)은 비마스킹(축), 값(dd)은 `mn()`/`<MT>` 마스킹. 단위 낱말은 축이라 비마스킹. */
function KvGrid({ items, unit }: { items: [string, number][]; unit: Unit }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {items.map(([l, v]) => (
        <div key={l} className="grid bg-card" style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{l}</dt>
          <dd className="m-0 flex items-baseline justify-end gap-1 min-w-0 tabular font-semibold"
            style={{ padding: '8px 12px', fontSize: 14, ...negStyle(v < 0) }}>
            {money(v, unit)}<span className="text-caption font-normal" style={{ fontSize: 11.5 }}>{unit}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* 정량지표 kv — 값이 문자열(단위 미상)이라 단위 토글과 무관. 음수(-로 시작)는 danger 색. */
function RatioGrid({ items }: { items: [string, string][] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border border border-border overflow-hidden m-0" style={{ borderRadius: 8 }}>
      {items.map(([l, v]) => (
        <div key={l} className="grid bg-card" style={KV_COLS}>
          <dt className="m-0 flex items-center bg-[color:var(--grid-header)] font-bold text-muted-foreground" style={DT_STYLE}>{l}</dt>
          <dd className="m-0 flex items-center justify-end min-w-0 tabular font-semibold"
            style={{ padding: '8px 12px', fontSize: 14, ...negStyle(v.startsWith('-')) }}>{mn(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold text-center whitespace-nowrap';
const TD = 'border border-border';
const CELL: React.CSSProperties = { padding: '7px 9px' };

/* ④ 기준년월별 추이 — 가로 스크롤은 이 표의 래퍼 안에만 둔다(모달 전체가 밀리지 않게) */
function TrendTable({ unit }: { unit: Unit }) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 820 }}>
          <caption className="sr-only">기준년월별 추이</caption>
          <thead>
            <tr>{TREND_HEAD.map((h) => <th key={h} scope="col" className={TH} style={CELL}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {TREND.map((t) => (
              <tr key={t.ym}>
                {/* 기준년월은 축(행 식별자)이지만 날짜 데이터라 mn() 경유 — 헤더는 비마스킹 */}
                <td className={`${TD} text-center`} style={CELL}>{mn(t.ym)}</td>
                {t.v.map((v, i) => (
                  <td key={TREND_HEAD[i + 1]} className={`${TD} text-right tabular`} style={{ ...CELL, ...negStyle(v < 0) }}>{money(v, unit)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-caption" style={{ fontSize: 11.5, marginTop: 5 }}>{`단위 : ${unit}`}</div>
    </>
  );
}

/* ⑤ 지표등급 변경정보 — 2단 헤더(변경일자·정량지표 rowSpan2 / 등급 colSpan2 / 변경사유 rowSpan2).
   본문은 목업 그대로 **빈 상태**다(원문에 데이터 없음). */
function GradeChangeTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontSize: 13, minWidth: 560 }}>
        <caption className="sr-only">지표등급 변경정보 — 등급은 변경 전/후 2단 헤더</caption>
        <thead>
          <tr>
            <th rowSpan={2} scope="col" className={TH} style={CELL}>변경일자</th>
            <th rowSpan={2} scope="col" className={TH} style={CELL}>정량지표</th>
            <th colSpan={2} scope="colgroup" className={TH} style={CELL}>
              등급
            </th>
            <th rowSpan={2} scope="col" className={TH} style={CELL}>변경사유</th>
          </tr>
          <tr>
            <th scope="col" className={TH} style={CELL}>변경 전</th>
            <th scope="col" className={TH} style={CELL}>변경 후</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={5} className={`${TD} text-center text-muted-foreground`} style={{ padding: '22px 9px' }}>조회된 등급 변경 내역이 없습니다.</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────
   팝업 본체
────────────────────────────── */
export function GpEarlyWarningFinModal({ gp, kind, ym, onClose }: { gp: string; kind: string; ym: string; onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>('원');   // 목업 기본값 = 저장 base
  const masked = useMask();
  const dlgRef = React.useRef<DialogHandle>(null);

  /* 엑셀 — 화면이 그리는 소스 **전부**를 직렬화한다(재무정보·손익정보·정량지표·추이·등급변경).
     한쪽만 넣으면 "화면엔 보이는데 엑셀엔 없는" 누락이 난다(apfs-spec-popup 규약 6).
     금액은 단위 무관 **원 단위 원값**(골드 subfund_spec_modal 동형). 마스크 ON이면 숫자 0 · 텍스트 ''. */
  const excel = () => {
    const num = (v: number) => (masked ? 0 : v);
    const txt = (v: string) => (masked ? '' : v);
    const rows: (string | number)[][] = [
      ['운용사명', txt(gp)], ['운용사구분', txt(kind)],
      ...(ym ? [['기준년월', txt(ym)]] : []),          // 기준년월 미선택이면 행 자체를 뺀다(형제 팝업과 동형)
      [],
      ['재무정보', '금액(원)'], ...FIN.map(([l, v]) => [l, num(v)]), [],
      ['손익정보', '금액(원)'], ...PROFIT.map(([l, v]) => [l, num(v)]), [],
      ['정량지표', '값'], ...RATIO.map(([l, v]) => [l, txt(v)]), [],
      ['기준년월별 추이(단위: 원)'], TREND_HEAD,
      ...TREND.map((t) => [txt(t.ym), ...t.v.map(num)]), [],
      ['지표등급 변경정보'], ['변경일자', '정량지표', '등급(변경 전)', '등급(변경 후)', '변경사유'],
      ['조회된 등급 변경 내역이 없습니다.'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 24 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '조기경보 재무정보');
    XLSX.writeFile(wb, `운용사별_조기경보_재무정보${ym ? `_${ym}` : ''}.xlsx`);   // 기준년월 미선택이면 접미사 없이
    toast.success('재무정보 엑셀을 내려받았습니다');
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명을 한 래퍼로 묶어 좌측에 나란히(DialogHeader 가 justify-between 이라 안 묶으면 우측 끝으로 밀린다) */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">운용사별 조기경보 재무정보</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">
              {/* 기준년월은 미선택('')일 수 있다 — 그때는 부제에서 통째로 뺀다("기준년월 " 만 남으면 고장처럼 보인다) */}
              {/* 운용사구분도 행 데이터라 마스킹한다 — 괄호는 축이라 마스킹 밖에 둔다(그리드 `txtCol('kind')` 와 동형) */}
              운용사명 : <MT>{gp}</MT> (<MT>{kind}</MT>){ym ? <> · 기준년월 {mn(ym)}</> : null}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          {/* 단위바 — 목업 `.unitbar`(라벨 + seg + ⚠마커) */}
          <div className="flex items-center justify-end gap-2 mb-3">
            <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>금액 단위</span>
            <SegTabs size="sm" value={unit} onChange={(v: string) => setUnit(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
          </div>

          <Section title="재무정보" unitNote={`(단위: ${unit})`}><KvGrid items={FIN} unit={unit} /></Section>
          <Section title="손익정보" unitNote={`(단위: ${unit})`}><KvGrid items={PROFIT} unit={unit} /></Section>
          <Section title="정량지표"><RatioGrid items={RATIO} /></Section>
          <Section title="기준년월별 추이" unitNote={`(단위: ${unit})`}><TrendTable unit={unit} /></Section>
          <Section title="지표등급 변경정보"><GradeChangeTable /></Section>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" leadingIcon="download" onClick={excel}>엑셀</Button>
            <Button variant="outline" size="sm" leadingIcon="printer" onClick={() => window.print()}>출력</Button>
            <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

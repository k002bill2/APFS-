/* 투자기업 기업개요 — 읽기전용 명세 팝업 (출처: S1_30_투자기업정보.html)
   구성: ① 금액 단위 토글(원/백만원/억원) ② 기업개요 kv 그리드 ③ 재무제표 표 ④ 주주명부 표 ⑤ 푸터: 닫기
   골격·크롬(Dialog 880px · px-[46px] 정렬 · Section 헬퍼 · KvGrid)은 `gp_spec_modal.tsx` 복사 관례
   (apfs-spec-popup — 공유 export가 아니라 화면별 로컬 복사가 이 저장소의 규약이다).

   진입: 투자기업정보(통합) 목록의 `투자기업` 셀 클릭 / 셀 Enter / 행 더블클릭 / 우클릭 상세조회.

   ⚠ 한계(gp_spec_modal과 동형): S1_30 원문 실데이터가 (주)선양 1건뿐이라 어느 행을 눌러도 같은
     기업이 표시된다. `row`를 받아 **헤더의 대상명만** 실제 행 값으로 바꾸고, 본문은 원문 값을
     보존한다 — 원문에 없는 값을 행에서 합성해 채우면 목업 충실도가 깨진다. */
import React, { useState } from 'react';
import { UI } from './components';
import { mn, MT } from './mask';
import { fmt } from './aggrid_theme';
import { UNITS, formatUnit } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';

const { Button, SegTabs } = UI;

/* 금액 → 단위 환산 문자열(마스킹 포함). null은 '-' */
const money = (won: number | null, unit: Unit): string =>
  won == null ? '-' : mn(unit === '원' ? fmt(won) : formatUnit(won, unit));

/* ── 출처 데이터(S1_30 원문, (주)선양) ── */
const CO_NAME = '(주)선양';

type OvItem = { l: string; v: string | null; full?: boolean };
const OVERVIEW: OvItem[] = [
  { l: '기업명', v: CO_NAME }, { l: '기업명(영문)', v: null },
  { l: '대표자1', v: '윤영욱' }, { l: '대표자1 생년월일', v: '491212-1' },
  { l: '대표자2', v: null }, { l: '대표자2 생년월일', v: '0' },
  { l: '사업자번호', v: '123-81-11041' }, { l: '법인등록번호', v: null },
  { l: '표준산업분류코드', v: '기타 인쇄업(18119)', full: true },
  { l: '우편번호', v: '445843', full: true },
  { l: '주소', v: '경기도 화성시 푸른들판로1153번길', full: true },
  { l: '나머지주소', v: '25', full: true },
  { l: 'TEL', v: '031-451-1501' }, { l: '홈페이지주소', v: null },
  { l: '설립일자', v: '1983-01-14' }, { l: '종업원수', v: '68 (명)' },
  { l: '벤처유형', v: null }, { l: '벤처기간', v: '~' },
  { l: '벤처기업확인번호', v: null, full: true },
  { l: '기업구분', v: null }, { l: '기업유형기간', v: '~' },
  { l: '결산월', v: '12' }, { l: '회계감사기관(회계사)', v: null },
  { l: '부도일자', v: null }, { l: '폐업일자', v: null },
  { l: '주식구분', v: '비상장' }, { l: '상장(등록)일', v: null },
  { l: '주요제품', v: '상업인쇄업 및 플라스틱 제품 제조 및 판매를 주요사업으로 영위', full: true },
  { l: '보통주 총발행주수', v: '187,054' }, { l: '우선주 총발행주수', v: '0' },
  { l: '보통주 주식액면가', v: '0 (원)' }, { l: '우선주 주식액면가', v: '0 (원)' },
  { l: '여성기업여부', v: 'NO' },
];

/* 재무제표 — [No, 운용사, 자펀드, 기준년월, 자산총계, 부채총계, 자본총계, 매출액, 영업이익, 당기순이익, 종업원수] */
type FinRow = { no: number; gp: string; fund: string; ym: string; amounts: number[]; emp: number };
const FIN_ROWS: FinRow[] = [
  { no: 1, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', ym: '2012-12',
    amounts: [17_792_580_021, 17_707_857_826, 84_722_195, 21_735_896_522, 384_486_356, -3_411_871_602], emp: 68 },
  { no: 2, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', ym: '2013-12',
    amounts: [18_308_114_744, 7_913_028_476, 10_395_086_268, 20_591_706_670, 192_982_569, 12_060_466_043], emp: 68 },
];
const FIN_AMT_HEADERS = ['자산총계', '부채총계', '자본총계', '매출액', '영업이익', '당기순이익'];

/* 주주명부 — [No, 운용사, 자펀드, 기준일자, 총자본금, 총발행주수, 보통주 자본금, 보통주 총발행주수,
   보통주 액면가, 우선주 자본금, 우선주 총발행주수, 우선주 액면가]. 주수는 금액이 아니라 단위 환산 제외. */
type ShareRow = { no: number; gp: string; fund: string; date: string; totalCapital: number; totalShares: number; comCapital: number; comShares: number; comPar: number; prfCapital: number; prfShares: number; prfPar: number };
const SHARE_ROWS: ShareRow[] = [
  { no: 1, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', date: '2012-12-31', totalCapital: 3_234_180_000, totalShares: 323_418, comCapital: 1_416_000_000, comShares: 141_600, comPar: 10_000, prfCapital: 1_818_180_000, prfShares: 181_818, prfPar: 10_000 },
  { no: 2, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', date: '2013-07-01', totalCapital: 1_416_000_000, totalShares: 141_600, comCapital: 1_416_000_000, comShares: 141_600, comPar: 10_000, prfCapital: 0, prfShares: 0, prfPar: 10_000 },
  { no: 3, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', date: '2013-07-23', totalCapital: 1_870_540_000, totalShares: 187_054, comCapital: 1_870_540_000, comShares: 187_054, comPar: 10_000, prfCapital: 0, prfShares: 0, prfPar: 10_000 },
  { no: 4, gp: 'KB증권(주)', fund: '현대동양농식품사모투자전문회사', date: '2014-01-23', totalCapital: 1_416_000_000, totalShares: 141_600, comCapital: 1_416_000_000, comShares: 141_600, comPar: 10_000, prfCapital: 0, prfShares: 0, prfPar: 10_000 },
];

/* ── 프리미티브(gp_spec_modal 복사) ── */
const TH = 'border border-border bg-muted text-[11.5px] font-bold text-muted-foreground whitespace-nowrap';
const TD = 'border border-border text-[12px] text-foreground';

function Section({ title, unitNote, children }: { title: string; unitNote?: string; children: React.ReactNode }) {
  return (
    <section className="mb-7 last:mb-0">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        {/* preflight:false라 h3에 UA 기본 마진이 살아 있다 → margin:0 명시(preflight-off-ua-margin-trap) */}
        <h3 className="text-[13.5px] font-bold text-foreground" style={{ margin: 0 }}>{title}</h3>
        {unitNote && <span className="text-[11.5px] text-muted-foreground">{unitNote}</span>}
      </div>
      {children}
    </section>
  );
}

/* 개요 kv — 한글 라벨이라 가로 배열(라벨 좌 / 값 우). full이면 한 줄 전체 폭. */
function KvGrid({ items }: { items: OvItem[] }) {
  return (
    <div className="grid gap-px border border-border bg-border" style={{ gridTemplateColumns: 'minmax(96px,auto) 1fr minmax(96px,auto) 1fr' }}>
      {items.map((it) => (
        <React.Fragment key={it.l}>
          <div className="bg-muted px-2.5 py-[7px] text-[11.5px] font-bold text-muted-foreground">{it.l}</div>
          <div className="bg-card px-2.5 py-[7px] text-[12px] text-foreground min-w-0 break-words" style={it.full ? { gridColumn: 'span 3' } : undefined}>
            {it.v == null ? <span className="text-muted-foreground">-</span> : <MT>{it.v}</MT>}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function FinTable({ unit }: { unit: Unit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: 860 }}>
        <thead>
          <tr>
            {['No', '운용사', '자펀드', '기준년월', ...FIN_AMT_HEADERS, '종업원수'].map((h) => (
              <th key={h} scope="col" className={TH} style={{ padding: '7px 8px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {FIN_ROWS.map((r) => (
            <tr key={r.no}>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{r.no}</td>
              <td className={TD} style={{ padding: '7px 8px' }}><MT>{r.gp}</MT></td>
              <td className={TD} style={{ padding: '7px 8px' }}><MT>{r.fund}</MT></td>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{mn(r.ym)}</td>
              {r.amounts.map((v, i) => (
                // 음수(적자)는 색 단독으로 알리지 않는다 — 값 자체에 '-' 부호가 남아 텍스트로도 읽힌다(A11Y 원칙 2)
                <td key={FIN_AMT_HEADERS[i]} className={`${TD} text-right tabular`}
                  style={{ padding: '7px 8px', ...(v < 0 ? { color: 'var(--danger-text)' } : {}) }}>{money(v, unit)}</td>
              ))}
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{mn(String(r.emp))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ShareTable({ unit }: { unit: Unit }) {
  // 2단 헤더 — 보통주/우선주 아래 자본금·총발행주수·액면가 3개씩(원문 구조).
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ minWidth: 980 }}>
        <thead>
          <tr>
            {[['No', 2], ['운용사', 2], ['자펀드', 2], ['기준일자', 2], ['총자본금', 2], ['총발행주수', 2]].map(([h, rs]) => (
              <th key={String(h)} scope="col" rowSpan={rs as number} className={TH} style={{ padding: '7px 8px' }}>{h}</th>
            ))}
            <th scope="colgroup" colSpan={3} className={TH} style={{ padding: '7px 8px' }}>보통주</th>
            <th scope="colgroup" colSpan={3} className={TH} style={{ padding: '7px 8px' }}>우선주</th>
          </tr>
          <tr>
            {['자본금', '총발행주수', '액면가', '자본금', '총발행주수', '액면가'].map((h, i) => (
              <th key={h + i} scope="col" className={TH} style={{ padding: '7px 8px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SHARE_ROWS.map((r) => (
            <tr key={r.no}>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{r.no}</td>
              <td className={TD} style={{ padding: '7px 8px' }}><MT>{r.gp}</MT></td>
              <td className={TD} style={{ padding: '7px 8px' }}><MT>{r.fund}</MT></td>
              <td className={`${TD} text-center tabular`} style={{ padding: '7px 8px' }}>{mn(r.date)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.totalCapital, unit)}</td>
              {/* 주수는 금액이 아니다 — 단위 토글 대상에서 제외(축이 무너지지 않도록) */}
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{mn(fmt(r.totalShares))}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.comCapital, unit)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{mn(fmt(r.comShares))}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.comPar, unit)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.prfCapital, unit)}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{mn(fmt(r.prfShares))}</td>
              <td className={`${TD} text-right tabular`} style={{ padding: '7px 8px' }}>{money(r.prfPar, unit)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UnitSeg({ unit, onChange }: { unit: Unit; onChange: (u: Unit) => void }) {
  return (
    <div className="mb-5 flex items-center justify-end gap-2">
      <span className="text-[11.5px] font-semibold text-muted-foreground">금액단위</span>
      <SegTabs size="sm" value={unit} onChange={(v: string) => onChange(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
    </div>
  );
}

/* row는 optional이다 — 헤더 대상명에만 쓰고 본문은 원문 값을 유지한다(위 ⚠ 참조).
   optional로 둬야 기존 `{ onClose }` 단독 호출부가 회귀 없이 살아 있다. */
export function CompanyProfileModal({ row, onClose }: { row?: Record<string, unknown>; onClose: () => void }) {
  const [unit, setUnit] = useState<Unit>('원');
  const target = String(row?.investee ?? row?.company ?? row?.name ?? CO_NAME);
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[880px] max-h-[88vh]">
        <DialogHeader className="px-[46px]">
          {/* 제목+대상명은 한 래퍼로 — DialogHeader가 justify-between이라 안 묶으면 대상명이 우측 끝으로 밀린다 */}
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">기업개요</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0"><MT>{target}</MT></DialogDescription>
          </div>
        </DialogHeader>
        <div className="overflow-y-auto p-[46px]">
          <UnitSeg unit={unit} onChange={setUnit} />
          <Section title="기업개요"><KvGrid items={OVERVIEW} /></Section>
          <Section title="재무제표" unitNote={`(단위: ${unit})`}><FinTable unit={unit} /></Section>
          <Section title="주주명부" unitNote={`(금액 단위: ${unit} · 주수는 주)`}><ShareTable unit={unit} /></Section>
        </div>
        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

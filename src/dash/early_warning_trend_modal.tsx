/* 조기경보 시계열 차트 — 읽기전용 팝업
   출처: S2_51_조기경보_조회.html의 `openChart()`(= 목업 설계메모가 말하는 S2_52 팝업을 그대로 호출)
   → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - modal wide(980px) + head/body/foot  → `Dialog`/`DialogContent max-w-[980px]`(공용 크롬, 골드 복사 관례)
   - `.cfilter` 검색바                   → 기준년월 시작~종료 `PeriodPicker mode="month"` 2개 + 등급 `SegTabs`
                                           [전체 | 주의/경고] + [조회]. 목업 `<input readonly>`+자체 월 패널은
                                           우리 표준 PeriodPicker로 치환(apfs-datepicker — 네이티브 date/월 input 금지).
   - `.chartcard` 2개                    → 자펀드 종합등급 / 운용사 종합등급. 각 카드 = 제목 + 범례 + 라인차트.
   - `trendLineChart()` 인라인 SVG       → **`Charts.MultiLineTrend`**(charts.tsx에 신설). 페이지/모달 안에
                                           SVG를 직접 그리지 않는다(CLAUDE.md: charts.tsx가 차트 프리미티브의 집).
   - 목업 `visually-hidden` 데이터 표    → `MultiLineTrend`의 `tableCaption`(프리미티브가 sr-only 표를 함께 렌더).
   - 색                                  → 목업 hex/`--ok`·`--amber`를 베끼지 않고 **저장소 토큰**으로 치환:
                                           정상 `--success` · 주의 `--warning` · 경고 `--danger` · TOTAL `--primary`(점선).
                                           라인/범례 스와치는 "칠"이라 -text 토큰이 아니라 베이스 토큰이 맞다(color-tokens).

   한계·가정(결정 기록)
   - 목업에서 [조회] 버튼과 기준년월 입력은 **차트에 아무 영향이 없다**(`trendRender()`가 기간을 읽지 않음).
     죽은 컨트롤을 그대로 옮기지 않기 위해, 기준년월을 **draft → [조회]로 적용**하고 적용된 구간만큼
     13개월 창(2025-07~2026-07)을 **잘라서** 보여주도록 배선했다. 기본값 `2025-07 ~ 2026-07` = 전 구간이라
     첫 화면은 목업과 동일하다. (등급 세그먼트는 목업처럼 즉시 반영.)
     ⚠ 이 배선은 **Codex 적대적 리뷰가 "목업 명세 이탈"로 지적한 사항**이며, 조작 가능한 컨트롤을
       무반응으로 두는 편이 더 나쁘다는 **조언자 판단으로 유지**한다. 되돌리려면 `range`/`fromDraft`/`toDraft`
       state와 `picked` memo를 걷어내고 `TREND_MONTHS`·`TREND_FUND`·`TREND_MGR`를 차트에 직결한 뒤
       [조회]를 toast-only 재렌더로 되돌리면 된다(≈5줄).
   - 데이터는 목업 `TREND_FUND`/`TREND_MGR` 원문 그대로이고 `total`은 세 값의 합(목업 `trendTotals`)이다.
     실데이터 연동 대상 — 값을 창작하지 않았다.
   - 오버레이 애니메이션은 공용 `dialog.tsx`(tailwindcss-animate)를 그대로 쓴다 — Radix 오버레이를
     Motion `AnimatePresence`로 감싸면 exit가 발화하지 않는다(프로젝트 사고 이력). */
import React from 'react';
import { UI } from './components';
import { Charts } from './charts';
import type { TrendSeries } from './charts';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from './ui/dialog';
import { PeriodPicker } from './ui/period-picker';
import { controlMinWidth } from './schemas/renderers';
import { toast } from './ui/sonner';

const { Button, SegTabs } = UI;
const { MultiLineTrend } = Charts;

/* ── 목업 원문 데이터 ─────────────────────────────────────────────
   TREND_MONTHS 13개월 · 값은 S2_51 `openChart()` 블록 그대로. total은 세 값의 합(목업 `trendTotals`). */
const TREND_MONTHS = [
  '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
];
const sum3 = (a: number[], b: number[], c: number[]) => a.map((v, i) => v + b[i] + c[i]);

const FUND_NORMAL = [92, 94, 95, 93, 96, 98, 97, 99, 100, 98, 101, 103, 105];
const FUND_CAUTION = [14, 13, 12, 15, 13, 11, 12, 10, 11, 13, 12, 11, 10];
const FUND_WARN = [5, 6, 7, 6, 5, 4, 5, 6, 4, 5, 3, 4, 3];
const MGR_NORMAL = [44, 45, 45, 46, 47, 47, 48, 48, 49, 49, 50, 50, 51];
const MGR_CAUTION = [8, 8, 9, 7, 7, 8, 6, 7, 6, 7, 6, 6, 5];
const MGR_WARN = [3, 3, 2, 3, 2, 2, 3, 2, 2, 2, 2, 1, 2];

const TREND_FUND: Record<string, number[]> = {
  normal: FUND_NORMAL, caution: FUND_CAUTION, warn: FUND_WARN, total: sum3(FUND_NORMAL, FUND_CAUTION, FUND_WARN),
};
const TREND_MGR: Record<string, number[]> = {
  normal: MGR_NORMAL, caution: MGR_CAUTION, warn: MGR_WARN, total: sum3(MGR_NORMAL, MGR_CAUTION, MGR_WARN),
};

/* 시리즈 — 색은 tokens.css 토큰만(하드코딩 hex 금지, 라이트/다크 자동 양립). */
const SERIES_ALL: TrendSeries[] = [
  { key: 'normal', name: '정상', color: 'var(--success)' },
  { key: 'caution', name: '주의', color: 'var(--warning)' },
  { key: 'warn', name: '경고', color: 'var(--danger)' },
  { key: 'total', name: 'TOTAL', color: 'var(--primary)', dash: true },
];
const SERIES_WARN: TrendSeries[] = [
  { key: 'caution', name: '주의', color: 'var(--warning)' },
  { key: 'warn', name: '경고', color: 'var(--danger)' },
];

/* 기준년월 기본값 = 목업 `cm-from`/`cm-to` 그대로(= 전 구간) */
const DEF_FROM = TREND_MONTHS[0];
const DEF_TO = TREND_MONTHS[TREND_MONTHS.length - 1];

/* 목업 x축 표기 `'2025-07'.slice(2).replace('-','.')` → `25.07` */
const monthLabel = (m: string) => m.slice(2).replace('-', '.');

/* ── 로컬 UI 조각(공유 export 아님 — 골드 복사 관례) ── */
function Legend({ series }: { series: TrendSeries[] }) {
  return (
    <div className="flex flex-wrap items-center gap-4 ml-auto">
      {series.map((s) => (
        <span key={s.key} className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground" style={{ fontSize: 12.5 }}>
          {s.dash
            ? <span className="inline-block" style={{ width: 16, height: 0, borderTop: `2px dashed ${s.color}` }} />
            : <span className="inline-block" style={{ width: 16, height: 3, borderRadius: 2, background: s.color }} />}
          {s.name}
        </span>
      ))}
    </div>
  );
}

function ChartCard({ title, data, series, labels, fullLabels, caption, ariaLabel }: {
  title: string; data: Record<string, number[]>; series: TrendSeries[];
  labels: string[]; fullLabels: string[]; caption: string; ariaLabel: string;
}) {
  return (
    <section className="rounded-card-lg border border-border bg-card" style={{ padding: '14px 16px 8px', marginBottom: 16 }}>
      <div className="flex flex-wrap items-center gap-2" style={{ marginBottom: 6 }}>
        {/* preflight:false라 h3의 UA 기본 마진이 살아 있다 → margin:0 명시(apfs-grid 카드헤더 함정과 동상) */}
        <h3 className="font-bold" style={{ fontSize: 15, margin: 0 }}>{title}</h3>
        <Legend series={series} />
      </div>
      {labels.length ? (
        <MultiLineTrend
          labels={labels}
          fullLabels={fullLabels}
          data={data}
          series={series}
          unit="건"
          yLabel="건수"
          ariaLabel={ariaLabel}
          tableCaption={caption}
          seriesHeader="등급" />
      ) : (
        <p className="text-caption" style={{ fontSize: 13, margin: '24px 0 28px', textAlign: 'center' }}>선택한 기준년월 구간에 해당하는 데이터가 없습니다.</p>
      )}
    </section>
  );
}

/* ── 메인 ───────────────────────────────────────────────────── */
export function EarlyWarningTrendModal({ onClose }: { onClose: () => void }) {
  const dlgRef = React.useRef<DialogHandle>(null);
  /* 기준년월은 draft — [조회]로 적용한다(목업 버튼을 살려 두기 위한 배선, 파일 상단 '한계' 참조) */
  const [fromDraft, setFromDraft] = React.useState(DEF_FROM);
  const [toDraft, setToDraft] = React.useState(DEF_TO);
  const [range, setRange] = React.useState({ from: DEF_FROM, to: DEF_TO });
  /* 등급 세그먼트는 목업처럼 즉시 반영 */
  const [scope, setScope] = React.useState<'all' | 'warn'>('all');

  const series = scope === 'all' ? SERIES_ALL : SERIES_WARN;

  /* 적용된 구간만큼 13개월 창을 자른다. 'YYYY-MM'은 zero-pad라 문자열 비교가 곧 시간순.
     빈 값 = 열린 경계(apfs-datepicker) — PeriodPicker 재클릭 해제로 빈 값이 될 수 있다. */
  const picked = React.useMemo(() => {
    const idx = TREND_MONTHS.map((_, i) => i).filter((i) => {
      const m = TREND_MONTHS[i];
      return (!range.from || m >= range.from) && (!range.to || m <= range.to);
    });
    const slice = (src: Record<string, number[]>): Record<string, number[]> => {
      const out: Record<string, number[]> = {};
      Object.keys(src).forEach((k) => { out[k] = idx.map((i) => src[k][i]); });
      return out;
    };
    /* labels = 시각 축(축약 `25.07`) · full = 툴팁·숨김표용 완전형(`2025-07`, 목업 `trendTableHtml` 표기) */
    return {
      labels: idx.map((i) => monthLabel(TREND_MONTHS[i])),
      full: idx.map((i) => TREND_MONTHS[i]),
      fund: slice(TREND_FUND), mgr: slice(TREND_MGR),
    };
  }, [range]);

  const apply = () => {
    if (fromDraft && toDraft && fromDraft > toDraft) { toast.error('기준년월 시작이 종료보다 늦습니다'); return; }
    setRange({ from: fromDraft, to: toDraft });
    toast.success('조회되었습니다');
  };

  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-[980px] max-h-[88vh]">
        <DialogHeader>
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">조기경보 시계열 차트</DialogTitle>
            {/* Radix Description은 <p> — preflight:false라 UA 기본 마진이 살아 있어 m-0을 명시한다 */}
            <DialogDescription className="m-0 text-caption truncate min-w-0">자펀드·운용사 종합등급의 월별 추이(읽기 전용)</DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto" style={{ padding: '20px 18px' }}>
          {/* 필터 바 — 목업 `.cfilter`. PeriodPicker 트리거는 <button>이라 <label>로 명명되지 않는다
              → 텍스트 라벨은 장식용 <span>이고 접근名은 각 picker의 ariaLabel이 진다(apfs-datepicker).
              트리거는 w-full이므로 fit-content 래퍼 필수(래퍼 없으면 필터 바 전 폭으로 늘어남). */}
          <div className="flex flex-wrap items-center gap-3.5 border border-border bg-muted" style={{ borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-muted-foreground" style={{ fontSize: 13.5 }}>기준년월</span>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('select'), maxWidth: '100%' }}>
                <PeriodPicker mode="month" value={fromDraft} onChange={setFromDraft} ariaLabel="기준년월 시작" />
              </div>
              <span className="font-bold text-caption">~</span>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('select'), maxWidth: '100%' }}>
                <PeriodPicker mode="month" value={toDraft} onChange={setToDraft} ariaLabel="기준년월 종료" />
              </div>
            </div>
            <SegTabs
              options={[{ value: 'all', label: '전체' }, { value: 'warn', label: '주의/경고' }]}
              value={scope}
              onChange={(v: 'all' | 'warn') => setScope(v)}
              size="sm" />
            <Button variant="primary" size="sm" onClick={apply}>조회</Button>
          </div>

          <ChartCard
            title="자펀드 종합등급"
            data={picked.fund}
            series={series}
            labels={picked.labels}
            fullLabels={picked.full}
            ariaLabel="자펀드 종합등급 월별 시계열 차트"
            caption="자펀드 종합등급 월별 등급 건수" />
          <ChartCard
            title="운용사 종합등급"
            data={picked.mgr}
            series={series}
            labels={picked.labels}
            fullLabels={picked.full}
            ariaLabel="운용사 종합등급 월별 시계열 차트"
            caption="운용사 종합등급 월별 등급 건수" />
        </div>

        <DialogFooter>
          <div />
          {/* 닫기는 ref.close() — onClose 직접 호출은 종료 애니메이션을 건너뛴다(dialog.tsx 주석) */}
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

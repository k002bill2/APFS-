/* 디자인 시스템 미리보기 — 컬러 토큰 · 타이포 · 공통 컴포넌트 (라이트/다크 공용) */
import React from 'react';
import { UI } from './components';
import { Charts } from './charts';
import { GalleryCharts } from './gallery_charts';
import { APFS_DATA } from './data';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from './ui/accordion';
import { HoverCard, HoverCardTrigger, HoverCardContent } from './ui/hover-card';
import { ScrollArea } from './ui/scroll-area';
import { Spinner } from './ui/spinner';
import { InputGroup, InputGroupInput, InputGroupAddon, InputGroupButton } from './ui/input-group';
import { Item, ItemGroup, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions } from './ui/item';
import { Search } from 'lucide-react';
import { Icon } from './icons';

const { ColorChip, StatusBadge, StatCard, ChartCard, Button, FilterChip, SegTabs, DeltaBadge, Card } = UI;
const { Sparkline, Donut, LineTrend, GroupedBars, ComposedBars, Gauge, HBars, Treemap } = Charts;
const { ColumnTrack, ProgressRing, DualSeries, PieLabeled, UsageSegments } = GalleryCharts;
const D = APFS_DATA;
const { useState } = React;

/* 차트 갤러리 타일 — 소문자 키커 + 제목 + 차트 */
function ChartTile({ kicker, title, value, children }: { kicker?: string; title?: string; value?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-3">
      <div>
        <div className="font-bold text-caption" style={{ fontSize: 10.5, letterSpacing: ".06em", textTransform: "uppercase" }}>{kicker}</div>
        <div className="flex items-center gap-1.5" style={{ marginTop: 5, minHeight: 18 }}>
          <span className="font-extrabold" style={{ fontSize: 15.5, letterSpacing: "-.01em" }}>{title}</span>
          {value && <span className="tabular font-extrabold" style={{ marginLeft: "auto", fontSize: 17 }}>{value}</span>}
        </div>
      </div>
      <div className="min-w-0" style={{ marginTop: "auto" }}>{children}</div>
    </Card>
  );
}

function Swatch({ name, varName, hex }: { name?: React.ReactNode; varName?: string; hex?: string }) {
  return (
    <div className="flex items-center gap-2.5"><span
        className="shrink-0"
        style={{ width: 38, height: 38, borderRadius: 9, background: `var(${varName})`, border: "1px solid var(--border)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }} /><div className="min-w-0"><div className="font-bold" style={{ fontSize: 12.5 }}>{name}</div><div className="t-caption tabular" style={{ fontSize: 10.5 }}>{hex || varName}</div></div></div>
  );
}

function Group({ title, children, cols = 2 }) {
  return (
    <Card className="flex flex-col gap-3.5"><div className="t-label" style={{ textTransform: "none" }}>{title}</div><div
        className="grid"
        style={{ gridTemplateColumns: `repeat(${cols},1fr)`, gap: 13 }}>{children}</div></Card>
  );
}

function Section({ title, desc, children }: { title?: React.ReactNode; desc?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 26 }}><div className="mb-3"><h2 className="t-h2 m-0">{title}</h2>{desc && <p
          className="t-body text-muted-foreground"
          style={{ margin: "3px 0 0", fontSize: 13 }}>{desc}</p>}</div>{children}</section>
  );
}

function DesignSystem() {
  const [chip, setChip] = useState("정상");
  const [seg, setSeg] = useState("월");
  const indTotal = D.INDUSTRY.reduce((s: number, d: any) => s + d.value, 0);
  const indPct = D.INDUSTRY.slice(0, 5).map((d: any) => ({ name: d.name, value: Math.round((d.value / indTotal) * 100), color: d.color }));
  return (
    <div style={{ maxWidth: 1180, animation: "dashFade .4s var(--ease) both" }}><div
        className="flex items-center gap-3 mb-6"
        style={{ padding: "18px 22px", borderRadius: 16, background: "linear-gradient(110deg,color-mix(in srgb,var(--primary) 14%,var(--card)),color-mix(in srgb,var(--brand-cyan) 10%,var(--card)))", border: "1px solid var(--border)" }}><ColorChip icon="layers" color="var(--primary)" size={46} iconSize={24} /><div><div className="t-h2" style={{ fontSize: 17 }}>디자인 시스템 미리보기</div><p
            className="t-body text-muted-foreground"
            style={{ margin: "2px 0 0", fontSize: 13 }}>인디고/블루/틸 도메인 톤 · 블루 강조·링크 · Pretendard · 4px 그리드. 우상단 <strong>달/해 아이콘</strong>으로 라이트·다크를 전환해 보세요.</p></div><div style={{ marginLeft: "auto" }}><StatusBadge tone="success" icon="check" label="Production Ready" /></div></div><Section title="1. 컬러 토큰" desc="모든 색은 CSS 변수를 경유. 다크 모드에서 자동 반영됩니다."><div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(420px,100%),1fr))" }}><Group title="브랜드"><Swatch name="Brand Blue" varName="--brand-blue" hex="#6366F1" /><Swatch name="Brand Cyan" varName="--brand-cyan" hex="#3B82F6" /><Swatch name="Forest" varName="--brand-forest" hex="#2BBEAE" /><Swatch name="Lime" varName="--brand-lime" hex="#32D1AF" /><Swatch name="Neutral" varName="--brand-gray" hex="#58585B" /><Swatch name="Primary" varName="--primary" hex="indigo" /></Group><Group title="역할 · 상태"><Swatch name="Primary" varName="--primary" hex="주요 액션" /><Swatch name="Accent" varName="--accent" hex="링크·포커스" /><Swatch name="Success" varName="--success" hex="정상" /><Swatch name="Warning" varName="--warning" hex="주의" /><Swatch name="Danger" varName="--danger" hex="경고" /><Swatch name="Muted" varName="--muted-foreground" hex="캡션" /></Group><Group title="차트 팔레트 (chart-1 → 19)" cols={1}><div className="flex flex-wrap gap-1.5">{Array.from({ length: 19 }, (_, i) => i + 1).map((n) =>
                <span
                  key={n}
                  title={"--chart-" + n}
                  style={{ width: 30, height: 30, borderRadius: 7, background: `var(--chart-${n})`, border: "1px solid var(--border)" }} />)}</div></Group><Group title="자금 원천 4종 고정색" cols={2}><Swatch name="농식품 모태" varName="--fs-agri" /><Swatch name="수산 모태" varName="--fs-fish" /><Swatch name="운영비" varName="--fs-ops" /><Swatch name="기타 사업" varName="--fs-etc" /></Group></div></Section><Section
        title="2. 타이포그래피"
        desc="Pretendard · 정량값은 tabular-nums · 한글 word-break:keep-all"><Card className="flex flex-col gap-3.5">{[["Display / 34", "t-display", "2조 3,840억원"], ["H1 / 23", "t-h1", "메인 종합 대시보드"], ["H2 / 18", "t-h2", "출자·집행 현황"], ["CardTitle / 15", "t-cardtitle", "상태 분포"], ["Body / 14", "t-body", "흩어진 핵심 지표를 단일 화면에서 파악합니다."], ["Label / 12.5", "t-label", "전월 대비"], ["Caption / 11.5", "t-caption", "2026-06-15 14:32:05 기준"]].map((r, i) =>
            <div
              key={i}
              className="flex pb-3"
              style={{ alignItems: "baseline", gap: 18, borderBottom: i < 6 ? "1px solid var(--border)" : "none" }}><span
                className="shrink-0 font-semibold text-caption"
                style={{ width: 120, fontSize: 11.5 }}>{r[0]}</span><span className={r[1]}>{r[2]}</span></div>)}</Card></Section><Section title="3. 공통 컴포넌트"><div
          className="grid gap-4 mb-4"
          style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(420px,100%),1fr))" }}><div className="flex flex-col gap-2.5"><div className="t-label" style={{ textTransform: "none" }}>StatCard</div><StatCard kpi={D.KPI[0]} emphasis={true} /><StatCard kpi={D.KPI[1]} /></div><div className="flex flex-col gap-3"><Card className="flex flex-col gap-3"><div className="t-label" style={{ textTransform: "none" }}>StatusBadge (색 + 아이콘 + 텍스트 3중 표기)</div><div className="flex flex-wrap gap-2"><StatusBadge tone="success" icon="check" label="정상" /><StatusBadge tone="warning" icon="alert-triangle" label="주의" /><StatusBadge tone="danger" icon="shield-alert" label="경고" /><StatusBadge tone="info" icon="clock" label="진행중" /></div><div className="t-label mt-1" style={{ textTransform: "none" }}>DeltaBadge</div><div className="flex gap-4"><DeltaBadge value={3.2} label="전월 대비" /><DeltaBadge value={-2} label="전주 대비" invert={true} /></div></Card><Card className="flex flex-col gap-3"><div className="t-label" style={{ textTransform: "none" }}>Button</div><div className="flex flex-wrap gap-2"><Button variant="primary" leadingIcon="plus">새 등록</Button><Button variant="accent">강조</Button><Button variant="secondary">보조</Button><Button variant="outline" leadingIcon="download">엑셀 다운로드</Button><Button variant="ghost" leadingIcon="refresh">새로고침</Button></div><div className="t-label mt-1" style={{ textTransform: "none" }}>FilterChip · SegmentedControl</div><div
                className="flex flex-wrap gap-2 items-center">{["정상", "주의", "경고"].map((s) => <FilterChip
                  key={s}
                  active={chip === s}
                  onClick={() => setChip(s)}
                  dot={s === "정상" ? "var(--success)" : s === "주의" ? "var(--warning)" : "var(--danger)"}>{s}</FilterChip>)}<SegTabs options={["월", "분기", "연"]} value={seg} onChange={setSeg} /></div></Card></div></div><div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(420px,100%),1fr))" }}><ChartCard
            title="출자·집행 추이"
            sub="ChartCard — 컬러칩 + 제목 + 기간 필터"
            icon="landmark"
            accent="var(--chart-1)"
            right={<SegTabs options={["월", "분기", "연"]} value={seg} onChange={setSeg} size="sm" />}
            minH={180}><LineTrend
              data={D.RISK_TREND}
              threshold={D.RISK_THRESHOLD}
              height={170}
              color="var(--chart-1)" /></ChartCard><ChartCard
            title="상태 분포"
            sub="Donut — 중앙 총건수, 조각 hover"
            icon="shield-check"
            accent="var(--primary)"
            minH={180}><Donut data={D.STATUS_DONUT} height={180} centerLabel="총 자펀드" /></ChartCard></div></Section>

      <Section title="3-1. Alert (인라인 콜아웃)" desc="폼 검증 요약·경고 배너용. 색은 -soft 배경 + 솔리드 전경 + color-mix 테두리(opacity 모디파이어 미사용). shadcn ring 없음.">
        <div className="flex flex-col gap-2.5">
          <Alert variant="default"><Icon name="bell" size={18} /><AlertTitle>안내</AlertTitle><AlertDescription>기본(default) 톤 — 중립 표면의 일반 안내.</AlertDescription></Alert>
          <Alert variant="info"><Icon name="info" size={18} /><AlertTitle>진행 정보</AlertTitle><AlertDescription>info 톤 — 처리 상태·부가 설명.</AlertDescription></Alert>
          <Alert variant="success"><Icon name="check-circle" size={18} /><AlertTitle>저장 완료</AlertTitle><AlertDescription>success 톤 — 정상 처리 확인.</AlertDescription></Alert>
          <Alert variant="warning"><Icon name="alert-triangle" size={18} /><AlertTitle>확인 필요</AlertTitle><AlertDescription>warning 톤 — 필수 항목 누락 등 주의 환기.</AlertDescription></Alert>
          <Alert variant="destructive"><Icon name="shield-alert" size={18} /><AlertTitle>처리 실패</AlertTitle><AlertDescription>destructive 톤 — 오류·파괴적 작업 경고.</AlertDescription></Alert>
        </div>
      </Section>

      <Section title="3-2. 추가 프리미티브 (shadcn 갭 도입)" desc="Accordion · Hover Card · Scroll Area · Spinner · Input Group · Item — 정본 shadcn 갭 6종. 전부 토큰·전역 포커스·rounded-card 규약 적용.">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))" }}>
          <Card className="flex flex-col gap-2">
            <div className="t-label" style={{ textTransform: "none" }}>Accordion</div>
            <Accordion type="single" collapsible>
              <AccordionItem value="a"><AccordionTrigger>출자 조건은 무엇인가요?</AccordionTrigger><AccordionContent>모태펀드 출자 비율·존속기간·투자의무 등 조건을 접이식으로 표시합니다.</AccordionContent></AccordionItem>
              <AccordionItem value="b"><AccordionTrigger>보고 주기는?</AccordionTrigger><AccordionContent>분기별 정기보고 + 수시보고. 마감 임박 항목은 일정 위젯에서 알림.</AccordionContent></AccordionItem>
            </Accordion>
          </Card>

          <Card className="flex flex-col gap-3">
            <div className="t-label" style={{ textTransform: "none" }}>Hover Card · Spinner</div>
            <div className="flex items-center gap-4">
              <HoverCard openDelay={120}>
                <HoverCardTrigger asChild><button className="text-primary font-semibold underline underline-offset-2">GP 미리보기</button></HoverCardTrigger>
                <HoverCardContent><div className="flex flex-col gap-1"><div className="font-semibold text-foreground">운용사 요약</div><div className="text-[13px] text-muted-foreground">누적 결성 · 투자 성과 · 조기경보 상태를 호버로 미리 봅니다.</div></div></HoverCardContent>
              </HoverCard>
              <div className="flex items-center gap-2 text-muted-foreground"><Spinner /><Spinner className="size-6 text-primary" /><span className="text-[13px]">로딩</span></div>
            </div>
          </Card>

          <Card className="flex flex-col gap-2">
            <div className="t-label" style={{ textTransform: "none" }}>Input Group</div>
            <InputGroup>
              <InputGroupAddon align="inline-start"><Search /></InputGroupAddon>
              <InputGroupInput placeholder="자펀드·운용사 검색" />
              <InputGroupAddon align="inline-end"><InputGroupButton variant="default" size="sm">검색</InputGroupButton></InputGroupAddon>
            </InputGroup>
          </Card>

          <Card className="flex flex-col gap-2">
            <div className="t-label" style={{ textTransform: "none" }}>Scroll Area</div>
            <ScrollArea className="h-28 rounded-card border border-border">
              <div className="flex flex-col gap-1 p-2.5 text-[13px] text-muted-foreground">{Array.from({ length: 12 }, (_, i) => <div key={i} className="py-0.5">항목 라인 {i + 1} — 넘치는 콘텐츠를 커스텀 스크롤바로 표시</div>)}</div>
            </ScrollArea>
          </Card>

          <Card className="flex flex-col gap-2" style={{ gridColumn: "1 / -1" }}>
            <div className="t-label" style={{ textTransform: "none" }}>Item (ItemGroup · Media · Content · Actions)</div>
            <ItemGroup>
              <Item variant="outline"><ItemMedia variant="icon"><Icon name="landmark" size={18} /></ItemMedia><ItemContent><ItemTitle>농식품 벤처투자조합 1호</ItemTitle><ItemDescription>결성 320억 · 운용사 ○○인베스트먼트 · 존속 8년</ItemDescription></ItemContent><ItemActions><StatusBadge tone="success" icon="check" label="정상" /></ItemActions></Item>
              <Item variant="outline"><ItemMedia variant="icon"><Icon name="wallet" size={18} /></ItemMedia><ItemContent><ItemTitle>수산 스케일업 펀드</ItemTitle><ItemDescription>결성 150억 · 운용사 △△자산운용 · 조기경보 관찰</ItemDescription></ItemContent><ItemActions><StatusBadge tone="warning" icon="alert-triangle" label="주의" /></ItemActions></Item>
            </ItemGroup>
          </Card>
        </div>
      </Section>

      <Section title="4. 차트 스타일" desc="동일한 토큰·애니메이션을 공유하는 차트 컴포넌트 모음. 카드에 담아 그대로 사용합니다.">
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(252px,1fr))" }}>
          <ChartTile kicker="Column" title="지역별 출자·집행">
            <GroupedBars data={D.REGION_BARS} height={156} />
          </ChartTile>
          <ChartTile kicker="Column" title="연도별 계획·실적">
            <GroupedBars data={D.EXEC_Y} height={156} />
          </ChartTile>
          <ChartTile kicker="Bar" title="산업별 투자 비중">
            <HBars data={indPct} height={156} unit="%" />
          </ChartTile>
          <ChartTile kicker="Area + Line" title="출자·집행 현황">
            <ComposedBars data={D.EXEC_Q} height={168} />
          </ChartTile>
          <ChartTile kicker="Circular" title="자펀드 상태 분포">
            <Donut data={D.STATUS_DONUT} height={168} centerLabel="총 자펀드" />
          </ChartTile>
          <ChartTile kicker="Gauge" title="모태펀드 집행률">
            <Gauge value={78} label="집행률" height={156} color="var(--primary)" />
          </ChartTile>
          <ChartTile kicker="Line" title="리스크 지수 추이">
            <LineTrend data={D.RISK_TREND} threshold={D.RISK_THRESHOLD} height={156} color="var(--chart-1)" />
          </ChartTile>
          <ChartTile kicker="Treemap" title="산업별 비중(면적)">
            <Treemap data={D.INDUSTRY} height={168} />
          </ChartTile>
          <ChartTile kicker="Sparkline" title="월별 운용자산" value="23,840">
            <Sparkline data={D.KPI[0].trend} height={60} color="var(--chart-1)" id="ds-spark" />
          </ChartTile>
          <ChartTile kicker="Column" title="월별 신규 등록">
            <ColumnTrack data={[{ name: "1월", value: 32, label: "32건" }, { name: "2월", value: 48 }, { name: "3월", value: 27 }, { name: "4월", value: 41 }, { name: "5월", value: 14 }]} height={160} highlight={1} />
          </ChartTile>
          <ChartTile kicker="Column" title="요일별 처리량">
            <ColumnTrack data={[{ name: "월", value: 22 }, { name: "화", value: 18 }, { name: "수", value: 25 }, { name: "목", value: 16 }, { name: "금", value: 38, label: "38건" }, { name: "토", value: 20 }, { name: "일", value: 12 }]} height={160} highlight={4} soft={true} />
          </ChartTile>
          <ChartTile kicker="Circular" title="총 운용 자펀드">
            <ProgressRing value={237} max={300} height={168} top="총 자펀드" center="237" />
          </ChartTile>
          <ChartTile kicker="Gauge" title="목표 달성률">
            <ProgressRing value={42} max={100} height={168} top="달성" center="42%" color="var(--chart-4)" />
          </ChartTile>
          <ChartTile kicker="Pie" title="자금 원천 비중">
            <PieLabeled data={D.STATUS_DONUT} height={170} />
          </ChartTile>
          <ChartTile kicker="Area ·2계열" title="도메인별 추이">
            <DualSeries a={[12, 20, 16, 28, 24, 33]} b={[8, 14, 19, 17, 26, 29]} labels={["1Q", "", "2Q", "", "3Q", "4Q"]} height={170} area={true} id="ds-da" />
          </ChartTile>
          <ChartTile kicker="Line ·2계열" title="계획 vs 실적 라인">
            <DualSeries a={[22, 30, 26, 34, 31, 38]} b={[18, 24, 29, 27, 33, 30]} labels={["1Q", "", "2Q", "", "3Q", "4Q"]} height={170} area={false} id="ds-dl" />
          </ChartTile>
          <ChartTile kicker="Usage" title="예산 집행 현황" value="78%">
            <div className="flex flex-col gap-3 mt-2">
              <UsageSegments filled={8} total={10} height={30} />
              <div className="flex justify-between">
                <span className="t-caption">집행 18,600억</span>
                <span className="t-caption">잔여 5,240억</span>
              </div>
            </div>
          </ChartTile>
        </div>
      </Section>
    </div>
  );
}

export { DesignSystem };

/* 검토필요 마커(ⓘ) — 현행시스템 목업의 `.review` / `.rpop` 이식.
   목업이 "이 항목은 원문 미정의 → 이렇게 추론했다"고 남긴 설계 메모를 화면에 그대로 실어,
   화면을 보는 사람(발주처·리뷰어)이 추론 지점을 즉시 확인할 수 있게 한다. **규약 정본: apfs-grid 스킬**.

   요약(자세한 근거·실측치는 스킬에)
   - 붙는 위치: **라벨 옆**(그리드 헤더명·검색 필드 라벨·섹션 제목). 셀 값에는 붙이지 않는다.
   - 내용 2줄 고정(`추천`·`데이터`) — 목업 원문 그대로, 창작 금지.
   - 설계 메모라 mn()/<MT> 마스킹·엑셀 대상이 아니다.
   - 외관: 무채색 lucide Info(평소 조용) → hover·focus-visible·열림에서 `--warning-text` 강조.
   - 열기: hover(140ms 유예) · 클릭은 **열기 전용** · 키보드 Enter/Space 토글. 포커스는 **키보드 경로에서만** 움직인다.
   - 트리거가 <button>이 아니라 <span role=button>인 이유: button 은 labelable 이라 <label> 안에서 라벨을 가로챈다. */
import React from 'react';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { Icon } from './icons';
import { Info } from 'lucide-react';
import { UI } from './components';

const { toneVar } = UI;

export interface ReviewNote {
  rec: string;   // 추천 — 우리가 택한 동작
  dat: string;   // 데이터 — 원문 미정의/추론 사유
}

function NoteRow({ k, tone, children }: { k: string; tone: 'info' | 'muted'; children: React.ReactNode }) {
  /* 데이터 칩 배경: 다크의 --muted(#1F261D)가 팝오버 표면(#1D231C)과 거의 같아 칩이 사라진다(2026-09-12 실측).
     두 테마 모두에서 뜨도록 전경색 혼합으로 만든다(opacity 모디파이어는 토큰색에 안 먹음). */
  const [c, soft] = tone === 'muted'
    ? ['var(--muted-foreground)', 'color-mix(in srgb,var(--muted-foreground) 16%,transparent)']
    : toneVar('info');   /* 추천 칩: primary(초록)는 12% 혼합 위에서 라이트 4.2:1로 AA 미달(2026-09-12 실측).
                                --info-text/--info-soft 는 두 테마 모두 감사된 쌍이고 목업 원본 칩도 파랑이었다. */
  return (
    <div className="flex gap-1.5 my-1">
      <span className="shrink-0 inline-flex items-center justify-center h-[19px] min-w-[40px] px-1.5 rounded-[4px] text-[10.5px] font-extrabold"
        style={{ background: soft, color: c }}>{k}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/** 라벨 옆 ⚠ 마커 + 검토메모 팝오버. `label`은 접근名에 쓰인다(어느 항목의 메모인지). */
export function ReviewMarker({ rec, dat, label }: ReviewNote & { label?: string }) {
  const [open, setOpen] = React.useState(false);
  /* hover로 열기 — 마커가 작아 포인터가 트리거→팝오버로 넘어가는 순간을 유예(140ms)로 덮는다.
     팝오버도 같은 핸들러를 쓰므로 콘텐츠 위에 있는 동안은 닫히지 않는다. */
  const closeTimer = React.useRef<number | undefined>(undefined);
  const openNow = () => { window.clearTimeout(closeTimer.current); setOpen(true); };
  const closeSoon = () => { window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setOpen(false), 140); };
  React.useEffect(() => () => window.clearTimeout(closeTimer.current), []);
  /* 포커스 이동은 **키보드로 열었을 때만** — hover·클릭으로 열 때 포커스를 뺏으면 작업 중 초점이 튄다. */
  const viaKeyboard = React.useRef(false);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  /* 클릭도 직접 토글한다. `preventDefault`가 핵심 — 상세필터의 <label> 안에서 마커를 누르면 라벨 활성화가
     select 로 포커스를 넘겨 팝오버가 열리자마자 바깥클릭으로 닫힌다(2026-09-12 실측). 기본동작을 막으면
     Radix 의 자체 토글(composeEventHandlers)이 건너뛰어지므로 여기서 상태를 직접 뒤집는다. */
  /* 포인터 클릭은 **열기 전용**(토글 아님) — hover로 이미 열린 상태에서 클릭하면 토글이 곧바로 닫아버린다(2026-09-12 실측).
     터치 기기는 hover가 없지만 탭이 mouseenter→click 순으로 와도 결과가 '열림'으로 같다. 닫기는 포인터 이탈·Escape·바깥클릭. */
  const openByPointer = (e: React.SyntheticEvent) => { e.stopPropagation(); e.preventDefault(); viaKeyboard.current = false; window.clearTimeout(closeTimer.current); setOpen(true); };
  /* mousedown 기본동작까지 막아야 한다 — 크롬은 <label> 안을 누르면 **mousedown 시점에** 연결된 컨트롤(select)로
     포커스를 넘긴다(click 만 막으면 팝오버가 열리자마자 바깥포커스로 닫힌다, 2026-09-12 실측).
     기본동작을 막으면 마커 자신도 포커스를 못 받으므로 직접 focus() 한다(키보드 Escape 복귀 지점 보존). */
  const press = (e: React.MouseEvent) => { e.stopPropagation(); e.preventDefault(); (e.currentTarget as HTMLElement).focus(); };
  /* 활성화 키(Enter·Space)만 가로채 **직접 토글**한다. 방향키는 그대로 올려보내 AG Grid 헤더 이동을 살린다.
     - 트리거가 <span role=button>이라 키로는 click 이 생기지 않는다 → 여기서 열고 닫는다(그래서 제어형 Popover).
     - 전파를 막지 않으면 keydown이 AG Grid 헤더까지 올라가 팝오버를 여는 동시에 정렬까지 걸린다
       (2026-09-12 Codex 지적, 실측 재현). Space는 페이지 스크롤도 막는다. */
  const stopKey = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.stopPropagation();
    if (e.type !== 'keydown') return;
    e.preventDefault();
    viaKeyboard.current = true;
    window.clearTimeout(closeTimer.current);
    setOpen((o) => !o);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {/* ⚠ <button>이 아니라 <span role="button">이다 — button 은 labelable 이라 상세필터의 <label> 안에 놓으면
            라벨이 select 대신 이 마커에 묶인다(라벨 클릭이 팝오버를 열고 select 는 접근名을 잃는다,
            2026-09-12 Codex 지적). span 은 labelable 이 아니라 암묵 연결이 select 로 되돌아온다.
            대신 키보드 활성화(Enter/Space)를 브라우저가 만들어주지 않으므로 stopKey 에서 직접 토글한다. */}
        <span
          role="button"
          tabIndex={0}
          aria-label={label ? `${label} 검토필요 메모 보기` : '검토필요 메모 보기'}
          onClick={openByPointer} onPointerDown={stop} onMouseDown={press} onDoubleClick={stop}
          onKeyDown={stopKey} onKeyUp={stopKey}
          onMouseEnter={() => { viaKeyboard.current = false; openNow(); }} onMouseLeave={closeSoon}
          /* 외관(2026-09-12 사용자 선택 = 시안 3): **무채색 info 원 — 평소 조용, hover/열림 때 amber 강조**.
             칠·테두리 없이 아이콘만 두고 색만 바꾼다(솔리드 amber 칩은 "촌스럽다"는 피드백으로 폐기).
             padding 3px로 14px 아이콘의 포인터 타깃을 20px로 넓힌다(시각 크기는 그대로). */
          className="inline-flex shrink-0 items-center justify-center rounded-full ml-0.5 cursor-pointer align-middle text-muted-foreground opacity-80 transition-colors duration-tok-fast hover:text-[color:var(--warning-text)] hover:opacity-100 focus-visible:text-[color:var(--warning-text)] focus-visible:opacity-100 data-[state=open]:text-[color:var(--warning-text)] data-[state=open]:opacity-100"
          /* position/z-index: 마스크 ON일 때 `aggrid_shared.css`가 `.ag-header-cell-text::after`로 헤더 전폭에
             스켈레톤 바를 덮는다(절대배치라 정적 자손보다 위에 그려짐) — 마커는 데이터가 아니라 항상 보여야 하므로
             자체 쌓임 순서를 올려 바 위로 올린다(2026-09-12 Codex 지적, mask _on=true 로 실측). */
          style={{ position: 'relative', zIndex: 1, padding: 3, lineHeight: 0 }}><Info size={14} strokeWidth={2} aria-hidden /></span>
      </PopoverTrigger>
      {/* role="dialog"라 접근名이 없으면 스크린리더가 이름 없는 다이얼로그로 읽는다(2026-09-12 Codex 지적) */}
      <PopoverContent align="start" onClick={stop}
        onMouseEnter={openNow} onMouseLeave={closeSoon}
        onOpenAutoFocus={(e) => { if (!viaKeyboard.current) e.preventDefault(); }}
        /* 닫힘 때도 같은 분기 — Radix는 닫으면서 초점을 트리거로 되돌리는데, hover로 열렸다 닫히는 경우엔
           입력 중이던 컨트롤에서 초점을 뺏는다(2026-09-12 Codex 지적). 키보드로 연 경우에만 복귀시킨다. */
        onCloseAutoFocus={(e) => { if (!viaKeyboard.current) e.preventDefault(); }}
        aria-label={label ? `${label} 검토필요 메모` : '검토필요 메모'}
        className="max-w-[300px] px-[13px] py-[11px] text-[12.5px] leading-[1.6] text-muted-foreground">
        <div className="mb-[5px] flex items-center gap-1.5 font-bold text-foreground">
          <Icon name="alert-triangle" size={13} stroke={2.4} />검토필요
        </div>
        <NoteRow k="추천" tone="info">{rec}</NoteRow>
        <NoteRow k="데이터" tone="muted">{dat}</NoteRow>
      </PopoverContent>
    </Popover>
  );
}

/** AG Grid 헤더용 inner 컴포넌트 팩토리 —
    `headerComponentParams: { innerHeaderComponent: reviewInnerHeader(note) }`.
    headerName은 그대로 SSOT로 두고(params.displayName) 그 옆에만 마커를 붙인다. */
export const reviewInnerHeader = (note: ReviewNote) => (p: { displayName: string }) => (
  <span className="inline-flex items-center min-w-0">
    <span className="truncate">{p.displayName}</span>
    <ReviewMarker {...note} label={p.displayName} />
  </span>
);

/* 월간보고 팝업 창 (route `monthly-report`, Shell 없음) — 정기보고(regular_report_manage.tsx)의 '월간보고서'
   (보고구분 배지 · 보고서 파일명 · 상세조회)에서 window.open 으로 여는 **별도 창**의 내용이다(모달 아님, 사용자 결정 2026-09-24).
   본문은 `monthly_report_modal.tsx`의 `MonthlyReportBody`를 그대로 쓴다 — 목업 S1_06_01을 APFS 디자인으로 변환한 정본은 그쪽이고,
   여기는 창 크롬(제목 헤더 · 닫기)만 둔다. 데이터 한계(원천 1건)도 그 파일 주석이 정본. */
import { useEffect, useState } from 'react';
import { UI } from './components';
import { MonthlyReportBody } from './monthly_report_modal';
import { RPT_META } from './monthly_report_data';

const { Button } = UI;

/** 정기보고에서 window.open 으로 연 창이면 '닫기', 주소로 직접 연 탭(window.close 무효)이면 '정기보고로' 이동을 보인다. */
export function MonthlyReportWindow({ onNav }: { onNav?: (route: string) => void }) {
  const [isPopup] = useState(() => { try { return !!window.opener; } catch (e) { return false; } });
  useEffect(() => {   // 창 제목(WCAG 2.4.2) — 떠날 때 원복
    const prev = document.title;
    document.title = `월간보고 · ${RPT_META.fundName} | APFS`;
    return () => { document.title = prev; };
  }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6">
          {/* 모달 헤더와 같은 배열 — 제목 옆에 대상명(apfs-spec-popup 규약 1) */}
          <div className="flex min-w-0 flex-1 items-baseline gap-2.5">
            <h1 className="m-0 shrink-0 text-xl font-bold">월간보고</h1>
            <span className="min-w-0 truncate text-caption" style={{ fontSize: 13 }}>{RPT_META.fundName} · {String(RPT_META.asOf)} 현재</span>
          </div>
          {isPopup
            ? <Button variant="outline" size="sm" onClick={() => window.close()}>닫기</Button>
            : <Button variant="outline" size="sm" onClick={() => onNav?.('regular-report')}>정기보고로</Button>}
        </div>
      </header>
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6">
        <MonthlyReportBody />
      </main>
    </div>
  );
}

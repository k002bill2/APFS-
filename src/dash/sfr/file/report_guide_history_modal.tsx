/* 보고양식·가이드 조회 — 버전 이력 팝업(읽기전용). 원문 `#hist-scrim` 모달 → Radix Dialog(apfs-spec-popup 골격).
   - 원문 h2 '버전 이력 — <양식명>' → 제목 `버전 이력` + 대상명 DialogDescription(제목 옆 한 줄).
   - 원문 표 4열(버전·설명·등록일시·Download) 그대로. 최신 버전이 맨 위, 첫 행 = 현재 버전(원문 `tr.cur` 녹색 배경 + '현재' 배지).
     원문은 행 배경과 배지 배경이 같은 색이라 배지가 묻힌다 → 행 배경만 옅게(CUR_ROW_BG).
     색만으로 구분하지 않도록 배지 텍스트를 함께 둔다. 가운데 정렬 없음(표 정렬 규약) — 전부 좌측.
   - 원문 아이콘 전용 다운로드 링크(aria-label '<버전> 다운로드') → IconBtn(label = 접근名 + 툴팁). 백엔드가 없어 토스트로 응답.
   - 원문엔 푸터가 없지만 모달 공통 크롬대로 [닫기] 를 둔다(Esc·스크림·X 도 닫힘 — Radix). */
import React, { useRef } from 'react';
import { UI } from '../../components';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, type DialogHandle } from '../../ui/dialog';
import type { GuideVersion } from './report_guide_data';

const { Button, IconBtn, StatusBadge } = UI;

const TH = 'border border-border bg-[color:var(--grid-header)] font-bold whitespace-nowrap text-left';
const TD = 'border border-border text-left';
/* 높이 = 목록 그리드와 같게(헤더 40 · 행 42, 2026-10-30 사용자 지시). 세로 패딩 대신 높이로 고정해야
   다운로드 IconBtn(30px) 이 있는 칸과 글자 칸이 같은 높이가 된다(종전: 헤더 33 · 행 39 로 어긋남) */
const HEAD_CELL: React.CSSProperties = { height: 40, padding: '0 11px', verticalAlign: 'middle' };
const CELL: React.CSSProperties = { height: 42, padding: '0 11px', verticalAlign: 'middle' };
/* 현재 버전 행 배경 — '현재' 배지 배경(--success-soft)과 같은 색이면 배지가 묻힌다 → 같은 색을 옅게(45%) 깔아 배지가 한 단계 진하게 보이게 */
const CUR_ROW_BG = 'color-mix(in srgb, var(--success-soft) 45%, transparent)';
const HEADS = ['버전', '설명', '등록일시', 'Download'] as const;

export function ReportGuideHistoryModal({ title, versions, onDownload, onClose }: {
  title: string; versions: readonly GuideVersion[]; onDownload: (file: string) => void; onClose: () => void;
}) {
  const dlgRef = useRef<DialogHandle>(null);
  /* 연 자리(이력 버튼 또는 그리드 셀) — 첫 렌더 시점엔 아직 팝업이 초점을 가져가기 전이라 activeElement 가 곧 여는 요소다.
     DialogTrigger 없이 조건부 마운트로 여는 팝업이라 Radix 가 돌려줄 대상을 모른다 → 닫힐 때 직접 돌려준다(Codex P2) */
  const openerRef = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  return (
    <Dialog ref={dlgRef} open onOpenChange={(o) => { if (!o) onClose(); }}>
      {/* 첫 초점 = 컨테이너(journal_entry_screen 조회 전용 상세와 같은 처리) — 기본값이면 첫 행 다운로드 IconBtn 에 초점이 가
          툴팁이 뜨고, Esc 한 번이 툴팁만 닫아 두 번 눌러야 팝업이 닫힌다 */}
      <DialogContent className="max-w-[640px] max-h-[88vh]"
        onOpenAutoFocus={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement | null)?.focus(); }}
        onCloseAutoFocus={(e) => {
          const el = openerRef.current;
          if (el?.isConnected && el !== document.body) { e.preventDefault(); el.focus(); }
        }}>
        <DialogHeader className="px-[46px]">
          <div className="flex flex-1 items-baseline gap-2.5 min-w-0 pr-8">
            <DialogTitle className="shrink-0">버전 이력</DialogTitle>
            <DialogDescription className="text-caption truncate min-w-0">{title}</DialogDescription>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto p-[46px]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 13.5, minWidth: 480 }}>
              <caption className="sr-only">{title} 버전 이력 — 최신 버전이 맨 위, 첫 행이 현재 버전</caption>
              <thead>
                <tr>{HEADS.map((h) => <th key={h} scope="col" className={TH} style={HEAD_CELL}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {versions.map((h, i) => (
                  <tr key={h.file} style={i === 0 ? { background: CUR_ROW_BG } : undefined}>
                    <td className={TD} style={CELL}>
                      <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                        {h.v}{i === 0 && <StatusBadge tone="success" label="현재" size="sm" />}
                      </span>
                    </td>
                    <td className={TD} style={CELL}>{h.desc}</td>
                    <td className={`${TD} tabular whitespace-nowrap`} style={CELL}>{h.reg}</td>
                    <td className={TD} style={{ ...CELL, padding: '0 8px' }}>
                      <IconBtn icon="download" size={30} iconSize={15} label={`${h.v} 다운로드`} onClick={() => onDownload(h.file)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="px-[46px]">
          <div />
          <Button variant="outline" size="sm" onClick={() => dlgRef.current?.close()}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

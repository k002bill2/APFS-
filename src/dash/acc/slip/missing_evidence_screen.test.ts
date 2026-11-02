// @vitest-environment jsdom
/* 증빙첨부 화면(JournalEntryScreen mode 'evidence' — ACC-006 slide 12) 렌더 계약.
   ③ 증빙·첨부만 입력 가능 · ①헤더·⑤관리항목은 비활성 fieldset · [저장 후 상신] 미노출 · 저장 검증 문구·초점 · 열고 바로 닫으면 확인창 없음.
   AG Grid 는 jsdom 에서 무거워 빈 컴포넌트로 바꾼다(first_focus 테스트와 같은 방식). globals:false → afterEach 에서 cleanup. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TooltipProvider } from '../../ui/tooltip';
import { toast } from '../../ui/sonner';
import { JournalEntryScreen } from './journal_entry_screen';
import { demoMissingEvidence } from './missing_evidence_data';
import type { JournalRow } from './general_journal_data';

/* 셀 렌더러 검사용으로 마지막 그리드 props(columnDefs·rowData)만 기록해 둔다 — 렌더는 여전히 null */
const grid = vi.hoisted(() => ({ props: null as null | { columnDefs: any[]; rowData: any[] } }));
vi.mock('ag-grid-react', () => ({ AgGridReact: (p: any) => { grid.props = p; return null; } }));
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;

const toastError = vi.spyOn(toast, 'error');
afterEach(() => { cleanup(); toastError.mockClear(); });

const h = React.createElement;
const src: JournalRow = demoMissingEvidence('2026-11-02')[0];   // 증빙구분·첨부 모두 없음, 결재 승인
const openScreen = (onClose = vi.fn()) =>
  render(h(TooltipProvider, null, h(JournalEntryScreen, { entry: { mode: 'evidence', source: src }, onSave: (j: JournalRow) => j, onClose })));

describe('증빙첨부 화면', () => {
  it('제목·버튼 구성 — [저장]·[저장 후 닫기]·[닫기], [저장 후 상신] 없음', async () => {
    openScreen();
    await screen.findByRole('dialog');
    expect(screen.getByRole('heading', { name: '증빙첨부' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '저장' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '저장 후 닫기' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '저장 후 상신' })).toBeNull();
  });

  it('헤더·관리항목은 비활성, 증빙 영역은 활성', async () => {
    openScreen();
    await screen.findByRole('dialog');
    /* 헤더 적요(textarea)·관리항목 통화 — 비활성 fieldset 안 */
    expect((document.querySelector('textarea') as HTMLTextAreaElement).matches(':disabled')).toBe(true);
    expect((screen.getByRole('combobox', { name: '손익부서' }) as HTMLButtonElement).matches(':disabled')).toBe(true);
    /* 증빙 — 증빙구분·증빙미첨부·업로드 버튼은 활성 */
    expect((screen.getByRole('combobox', { name: '증빙구분' }) as HTMLButtonElement).matches(':disabled')).toBe(false);
    expect((screen.getByRole('checkbox', { name: '증빙미첨부' }) as HTMLButtonElement).matches(':disabled')).toBe(false);
    expect((screen.getByRole('button', { name: /업로드하실 파일을/ }) as HTMLButtonElement).matches(':disabled')).toBe(false);
    /* 필수 * 미표시 */
    expect(screen.queryByText('계정구분 *')).toBeNull();
  });

  it('저장 검증 — 증빙구분 미선택이면 문구 + 증빙구분 초점(2번 조건은 model 테스트)', async () => {
    openScreen();
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(toastError).toHaveBeenLastCalledWith('증빙구분을(를) 선택하세요.');
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: '증빙구분' }));
  });

  it('열고 아무것도 바꾸지 않고 [닫기] — 확인창 없이 닫힌다(dirty 아님)', async () => {
    const onClose = vi.fn();
    openScreen(onClose);
    await screen.findByRole('dialog');
    fireEvent.click(screen.getAllByRole('button', { name: '닫기' }).at(-1) as HTMLElement);
    expect(screen.queryByText('저장하지 않고 닫으시겠습니까?')).toBeNull();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('분개 그리드 도구 미노출 — 분개가 읽기 전용이라 [행추가]·[빈행삭제]·[대표적요반영]을 숨긴다(사용자 결정)', async () => {
    openScreen();
    await screen.findByRole('dialog');
    expect(screen.queryByRole('toolbar', { name: '분개 그리드 도구' })).toBeNull();
    expect(screen.queryByRole('button', { name: '행추가' })).toBeNull();
    expect(screen.queryByRole('button', { name: '빈행삭제' })).toBeNull();
    expect(screen.queryByRole('button', { name: '대표적요반영' })).toBeNull();
  });

  /* jsdom 환경이라 readSrc(test_src — import.meta.url 이 file: 이 아님)를 못 쓴다 → 렌더 결과로 검사 */
  it('기능·작성 도움말 미노출 — 입력용 안내라 증빙첨부(evidence)에선 숨긴다', async () => {
    openScreen();
    await screen.findByRole('dialog');
    expect(screen.queryByText('기능 도움말')).toBeNull();
    expect(screen.queryByText('작성 도움말')).toBeNull();
  });

  it('분개 셀 [검색] 미노출 — 계정과목·거래처 셀 렌더러가 [검색] 버튼을 그리지 않는다(삭제전표 상세와 같은 조회 전용 셀)', async () => {
    openScreen();
    await screen.findByRole('dialog');
    const props = grid.props!;
    const row = props.rowData[0];
    for (const field of ['accountName', 'partner']) {
      const col = props.columnDefs.find((c) => c.field === field);
      const { container, unmount } = render(h(React.Fragment, null, col.cellRenderer({ data: row, node: { rowPinned: undefined, rowIndex: 0 } })));
      expect(container.querySelector('input')).toBeTruthy();           // 값은 셀에 그대로 보인다
      expect(container.querySelectorAll('button').length).toBe(0);     // [검색] 없음
      unmount();
    }
    /* 행 선택 체크박스 열 없음 */
    expect(props.selectionColumnDef).toBeUndefined();
  });

  it('헤더 계정구분 컨트롤 disabled — 키보드·클릭으로 바꿀 수 없다', async () => {
    openScreen();
    await screen.findByRole('dialog');
    expect((screen.getByRole('combobox', { name: '계정구분' }) as HTMLButtonElement).matches(':disabled')).toBe(true);
  });
});

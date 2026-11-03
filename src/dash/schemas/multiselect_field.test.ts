// @vitest-environment jsdom
/* 스키마 폼 'multiselect' 컨트롤(2026-11-03) — 값 계약 JSON 배열 문자열(빈 배열 = '').
   ① SchemaField 가 MultiSelect 를 그리고 고른 값을 옵션 순서의 JSON 배열로 emit
   ② 그리드 셀은 원시 JSON 대신 'A, B'
   ③ 등록 모달은 첫 옵션을 자동 시드하지 않는다(select·radio·switch 와 다름) → 필수면 저장이 막힌다
   globals:false 라 RTL 자동 cleanup 이 안 걸린다 → afterEach 에서 직접 호출. */
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { SchemaField, Cell, isPlainWrapControl } from './renderers';
import { RowFormModal } from '../generic_list_modal';
import type { FieldSpec, PageSchema } from './types';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

afterEach(() => { cleanup(); document.body.replaceChildren(); });

const FIELD: FieldSpec = { key: 'area', label: '분야', control: 'multiselect', options: ['성장', '회수', 'ESG'] };

describe('SchemaField multiselect', () => {
  it('빈 값 = 트리거 "선택", 항목을 누르면 JSON 배열 문자열 emit', () => {
    const onChange = vi.fn();
    render(React.createElement(SchemaField, { field: FIELD, value: '', onChange }));
    const trigger = screen.getByRole('combobox', { name: '분야: 선택' });
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('option', { name: '회수' }));
    expect(onChange).toHaveBeenLastCalledWith('["회수"]');
  });

  it('저장값 → 옵션 순서 요약(첫 라벨 외 N), 마지막 하나를 풀면 빈 문자열', () => {
    const onChange = vi.fn();
    render(React.createElement(SchemaField, { field: FIELD, value: '["회수","성장"]', onChange }));
    fireEvent.click(screen.getByRole('combobox', { name: '분야: 성장 외 1' }));
    fireEvent.click(screen.getByRole('option', { name: '성장' }));
    expect(onChange).toHaveBeenLastCalledWith('["회수"]');
    cleanup(); document.body.replaceChildren();
    render(React.createElement(SchemaField, { field: FIELD, value: '["회수"]', onChange }));
    fireEvent.click(screen.getByRole('combobox', { name: '분야: 회수' }));
    fireEvent.click(screen.getByRole('option', { name: '회수' }));
    expect(onChange).toHaveBeenLastCalledWith('');
  });

  it('필수 표식 = aria-required(값과 무관), 검증 실패 = aria-invalid', () => {
    render(React.createElement(SchemaField, { field: { ...FIELD, required: true }, value: '', onChange: vi.fn(), invalid: true }));
    const trigger = screen.getByRole('combobox', { name: /^분야/ });
    expect(trigger.getAttribute('aria-required')).toBe('true');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
  });

  it('트리거가 <button> 이라 <label> 로 감싸지 않는다(이중 토글 방지)', () => {
    expect(isPlainWrapControl('multiselect')).toBe(true);
  });
});

describe('Cell — 다중 선택 저장값 표시', () => {
  it('JSON 배열 문자열은 "A, B" 로 보인다', () => {
    const { container } = render(React.createElement(Cell, { col: { key: 'area', label: '분야', type: 'text' }, value: '["성장","ESG"]' }));
    expect(container.textContent).toBe('성장, ESG');
  });
});

describe('RowFormModal — multiselect 는 첫 옵션 자동 시드 대상이 아니다', () => {
  const schema: PageSchema = {
    route: 't', title: 't', kind: 'list', entity: 't',
    columns: [{ key: 'area', label: '분야', type: 'text' }],
    fields: [{ ...FIELD, required: true }],
    provenance: { capturedAt: '', sourceSystem: 'T', captureFile: '' },
  };

  it('등록 모드에서 빈 채로 시작하고, 필수라 저장이 막힌다', () => {
    const onSave = vi.fn();
    render(React.createElement(RowFormModal, { mode: 'create', schema, onSave, onClose: vi.fn() }));
    expect(screen.getByRole('combobox', { name: '분야: 선택' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(screen.getByRole('alert').textContent).toContain('분야을(를) 입력하세요.');
    expect(onSave).not.toHaveBeenCalled();
  });
});

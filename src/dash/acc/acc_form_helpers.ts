/* 회계(acc) 폼 공용 헬퍼 — slip · fixedasset · funds 여러 중분류가 쓴다(대분류 루트, CLAUDE.md 폴더 배치 규칙). */
import type { CSSProperties } from 'react';
import { controlMinWidth } from '../schemas/renderers';

/* PeriodPicker 트리거는 w-full — fit-content 래퍼 필수(apfs-datepicker "폭") */
export const dayWrap: CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

/** 첫 번째 포커스 가능한 컨트롤로 이동(SchemaField 는 ref 를 노출하지 않는다) */
export const focusIn = (el: HTMLElement | null) => el?.querySelector<HTMLElement>('input:not([disabled]),select,button,textarea')?.focus();

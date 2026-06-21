import type { CellType } from './types';

export type RenderKind = 'status' | 'rate' | 'gp' | 'numeric' | 'maskedText';

// CellType → 렌더 분류 단일 진실. 텍스트/코드/pii/미지는 항상 maskedText로 수렴(fail-safe).
export function renderKind(type: CellType): RenderKind {
  switch (type) {
    case 'status': return 'status';
    case 'rate':   return 'rate';
    case 'gp':     return 'gp';
    case 'amount':
    case 'date':
    case 'number': return 'numeric';
    case 'text':
    case 'code':
    case 'pii':
    default:       return 'maskedText';
  }
}

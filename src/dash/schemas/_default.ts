import type { PageSchema } from './types';

// 현 generic_list.tsx 고정 컬럼/폼을 스키마로 표현 = 회귀 0 기준선
export function DEFAULT_SCHEMA(route: string): PageSchema {
  return {
    route, title: route, kind: 'list', entity: route,
    columns: [
      { key: 'name', label: '항목명', type: 'text', align: 'left' },
      { key: 'amount', label: '금액 (백만원)', type: 'amount', align: 'right' },
      { key: 'change', label: '변동률', type: 'rate', align: 'center' },
      { key: 'status', label: '상태', type: 'status', align: 'center' },
      { key: 'trend', label: '추이', type: 'number', align: 'center' },
    ],
    fields: [
      { key: 'name', label: '항목명', control: 'text', required: true },
      { key: 'category', label: '구분', control: 'text' },
      { key: 'amount', label: '금액 (백만원)', control: 'number' },
      { key: 'change', label: '변동률 (%)', control: 'number' },
      { key: 'status', label: '상태', control: 'select', options: ['정상','진행중','검토중','보류','완료'] },
    ],
    filters: ['투자성과','리스크','회계마감','운용사보고'],
    statusDomain: [
      { label: '정상', tone: 'success' }, { label: '진행중', tone: 'warning' },
      { label: '검토중', tone: 'info' }, { label: '보류', tone: 'danger' }, { label: '완료', tone: 'primary' },
    ],
    provenance: { capturedAt: '', sourceSystem: 'DEFAULT', captureFile: '' },
  };
}

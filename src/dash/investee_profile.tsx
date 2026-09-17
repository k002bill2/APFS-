/* 투자기업정보(통합) — 조회 전용 3섹션 화면 (투자자산관리 > 투자기업정보, route `투자기업정보(통합)`).
   출처: docs/mockups/01_투자자산관리/S1_30_투자기업정보.html (2026-09-15 파싱 실측)

   왜 전용 페이지인가: S1_30 은 **목록이 아니라 기업 1건의 상세**다 — 기업개요 kv(34항목) +
   재무제표(2행) + 주주명부(4행, 보통주/우선주 2단 헤더). `PageSchema` 는 `columns` 가 한 벌이라
   이 셋을 담지 못하고, 억지로 평평한 리스트로 접으면 "비슷해 보이는 다른 화면"이 된다.

   이전 상태(2026-09-15 이전): 이 라우트가 스키마 주도 GenericListPage 로 떨어져 **합성 더미 20행**을
   보여 줬다. 원문에 없는 행이라 전부 제거하고 원문 3섹션을 그대로 싣는다.

   데이터·표 마크업은 `company_profile_model.tsx` 가 SSOT 다(같은 원문을 팝업도 쓴다 — 복사 금지).
   스키마 `schemas/투자기업정보_통합.ts` 는 삭제하지 않는다: 라우트 레지스트리(resolveSchema)가
   DEFAULT_SCHEMA 로 떨어지지 않게 하는 등록부이자, clipboard 캡처 기반 등록/수정 양식의
   provenance 기록이다(그 21필드는 S1_30 이 아니라 별도 캡처가 출처다 — 출처를 바꿔 적지 않는다). */
import { useState } from 'react';
import { UI } from './components';
import { GridFrame, FooterActions } from './grid_frame';
import { CompanyProfileBody } from './company_profile_model';
import { SOURCE_COUNTS, CO_NAME } from './company_profile_data';
import { UNITS, DEFAULT_UNIT } from './schemas/unit';
import type { Unit } from './schemas/unit';
import { MT } from './mask';

const { Button, SegTabs, IconBtn } = UI;

/* 원문 S1_30 검색박스의 값 — select 지만 옵션이 사실상 단일이라 표시 전용으로 옮긴다.
   문자열은 원문 그대로(창작 금지). */
const QUERY_FIELDS = [
  { label: '모펀드', value: '농식품모태펀드' },
  { label: '운용사', value: 'KB증권' },
  { label: '자펀드', value: '현대동양농식품사모투자전문회사' },
  { label: '투자기업', value: CO_NAME },
] as const;

export function InvesteeProfile({ onNav }: { onNav?: (r: string) => void }) {
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '투자기업정보', '투자기업정보(통합)']}
      title="투자기업정보(통합)"
      favRoute="투자기업정보(통합)"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      toolbarLeft={(
        /* 원문 검색조건 4종(모펀드·운용사·자펀드·투자기업) 복원 — 2026-09-16 Codex 지적.
           ⚠ 원문 각 select 에 **옵션이 하나씩뿐**이다(모펀드만 농식품모태펀드/MOAF 2개).
           그래서 고를 것이 없는 읽기전용 표시로 둔다 — 없는 선택지를 지어내면 "조회했는데 안 바뀐다"는
           거짓 기대를 만든다. 실데이터가 (주)선양 1건뿐인 것도 같은 제약이다(모델 헤더 참조). */
        <>
          {QUERY_FIELDS.map(({ label, value }) => (
            <span key={label} className="inline-flex items-center gap-1.5 text-caption" style={{ fontSize: 12 }}>
              {label}
              <span className="inline-flex items-center rounded-[7px] bg-muted text-foreground"
                style={{ padding: '4px 9px', fontSize: 12, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <MT>{value}</MT>
              </span>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        <span className="text-caption" style={{ fontSize: 12 }}>금액 단위</span>
        <SegTabs size="sm" options={UNITS as unknown as string[]} value={unit} onChange={(v: string) => setUnit(v as Unit)} />
      </>}
      footerLeft={(
        <span>
          {`기업개요 ${SOURCE_COUNTS.overview}항목 · 재무제표 ${SOURCE_COUNTS.financial}건 · 주주명부 ${SOURCE_COUNTS.shareholder}건 (원문 그대로)`}
        </span>
      )}
      footerRight={<FooterActions />}>
      {/* 원문이 세 표를 세로로 쌓는 상세 화면이라 탭으로 나누지 않는다 — 한 기업의 단면을 한 번에 본다 */}
      <div style={{ padding: '4px 2px 8px' }}>
        <CompanyProfileBody unit={unit} />
      </div>
    </GridFrame>
  );
}

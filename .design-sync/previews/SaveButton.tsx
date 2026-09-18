import * as React from 'react';
import { SaveButton } from 'apfs-dashboard-offline';

/* SaveButton — 폼 모달 저장 버튼. Button 의 loading 상태를 자동 배선한다.
   계약: onSubmit() 은 검증 실패 시 undefined(스피너 없이 즉시 오류 표시), 성공 시 commit 함수를 반환한다 —
   클릭 → 검증 → '저장 중'(SAVE_DEMO_MS) → commit. 성공 경로에서 함수 반환을 잊으면 무음 no-op 이다.
   정적 캡처에는 기본 상태만 보인다(클릭하면 스피너 + busyLabel 로 바뀐다). */

const rowWrap: React.CSSProperties = { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 };
const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--caption)' };
const cap: React.CSSProperties = { fontSize: 11.5, color: 'var(--muted-foreground)', margin: 0 };

export function Default() {
  const [saved, setSaved] = React.useState(0);
  return (
    <div style={field}>
      <span style={label}>자펀드 등록 — 저장 (눌러보기)</span>
      <SaveButton onSubmit={() => () => setSaved((n) => n + 1)} />
      <p style={cap}>저장 완료 {saved}회 · 저장 중에는 다이얼로그 닫기가 잠긴다(취소·X·Esc 무시)</p>
    </div>
  );
}

export function SizeAndVariant() {
  return (
    <div style={field}>
      <span style={label}>size md · outline variant</span>
      <div style={rowWrap}>
        <SaveButton size="md" onSubmit={() => () => undefined}>저장</SaveButton>
        <SaveButton variant="outline" onSubmit={() => () => undefined}>임시저장</SaveButton>
      </div>
    </div>
  );
}

export function CustomLabels() {
  return (
    <div style={field}>
      <span style={label}>라벨·busyLabel 지정</span>
      <div style={rowWrap}>
        <SaveButton size="md" leadingIcon="upload" busyLabel="제출 중" onSubmit={() => () => undefined}>월간보고 제출</SaveButton>
        <SaveButton size="md" busyLabel="반영 중" onSubmit={() => () => undefined}>변경 반영</SaveButton>
      </div>
    </div>
  );
}

export function ValidationFail() {
  const [err, setErr] = React.useState('');
  return (
    <div style={field}>
      <span style={label}>검증 실패 경로 — onSubmit 이 undefined 반환</span>
      <SaveButton size="md" onSubmit={() => { setErr('약정총액은 필수 입력입니다'); }}>저장</SaveButton>
      <p style={{ ...cap, color: err ? 'var(--danger)' : 'var(--muted-foreground)' }}>{err || '스피너 없이 즉시 오류를 표시한다'}</p>
    </div>
  );
}

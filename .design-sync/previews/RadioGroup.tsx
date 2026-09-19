import * as React from 'react';
import { RadioGroup, RadioGroupItem } from 'apfs-dashboard-offline';

/* RadioGroup — 이름으로 묶인 **배타 선택**(신주/구주, 예/아니오/해당없음). on/off 2지선다는 Switch, 독립 복수 선택은 Checkbox.
   Item 은 `<button role=radio>` 라 `<label>` 로 감싸지 말고 htmlFor/id 로 명시 연결한다(래핑은 클릭 2회 발화). */

const field: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 9 };
const label: React.CSSProperties = { fontSize: 12, fontWeight: 700, color: 'var(--caption)' };
const opt: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, color: 'var(--foreground)' };
const lab: React.CSSProperties = { cursor: 'pointer', userSelect: 'none' };

export function ShareClass() {
  const [v, setV] = React.useState('new');
  return (
    <div style={field}>
      <span style={label}>주식종류</span>
      <RadioGroup value={v} onValueChange={setV} aria-label="주식종류">
        <span style={opt}><RadioGroupItem value="new" id="rg-share-new" /><label htmlFor="rg-share-new" style={lab}>신주</label></span>
        <span style={opt}><RadioGroupItem value="old" id="rg-share-old" /><label htmlFor="rg-share-old" style={lab}>구주</label></span>
      </RadioGroup>
    </div>
  );
}

export function YesNoNa() {
  const [v, setV] = React.useState('yes');
  return (
    <div style={field}>
      <span style={label}>의무투자 해당여부</span>
      <RadioGroup value={v} onValueChange={setV} aria-label="의무투자 해당여부">
        <span style={opt}><RadioGroupItem value="yes" id="rg-duty-y" /><label htmlFor="rg-duty-y" style={lab}>예</label></span>
        <span style={opt}><RadioGroupItem value="no" id="rg-duty-n" /><label htmlFor="rg-duty-n" style={lab}>아니오</label></span>
        <span style={opt}><RadioGroupItem value="na" id="rg-duty-na" /><label htmlFor="rg-duty-na" style={lab}>해당없음</label></span>
      </RadioGroup>
    </div>
  );
}

export function Vertical() {
  const [v, setV] = React.useState('liq');
  return (
    <div style={field}>
      <span style={label}>조합 진행단계</span>
      <RadioGroup value={v} onValueChange={setV} aria-label="조합 진행단계" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 11 }}>
        <span style={opt}><RadioGroupItem value="form" id="rg-stage-form" /><label htmlFor="rg-stage-form" style={lab}>결성</label></span>
        <span style={opt}><RadioGroupItem value="inv" id="rg-stage-inv" /><label htmlFor="rg-stage-inv" style={lab}>투자집행</label></span>
        <span style={opt}><RadioGroupItem value="liq" id="rg-stage-liq" /><label htmlFor="rg-stage-liq" style={lab}>회수·청산</label></span>
      </RadioGroup>
    </div>
  );
}

export function Disabled() {
  return (
    <div style={field}>
      <span style={label}>출자자 구분 (승인 후 변경 불가)</span>
      <RadioGroup value="corp" aria-label="출자자 구분" disabled>
        <span style={{ ...opt, color: 'var(--muted-foreground)' }}><RadioGroupItem value="indiv" id="rg-lp-i" disabled /><label htmlFor="rg-lp-i">개인</label></span>
        <span style={{ ...opt, color: 'var(--muted-foreground)' }}><RadioGroupItem value="corp" id="rg-lp-c" disabled /><label htmlFor="rg-lp-c">법인</label></span>
      </RadioGroup>
    </div>
  );
}

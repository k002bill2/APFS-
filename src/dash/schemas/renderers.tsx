import React from 'react';
import { UI } from '../components';
import { parseFileNames, fileExtLabel } from '../fields/file_names';   // 첨부 CSV 계약 파서(DocumentsField와 SSOT 공유)
import { glyphFor } from '../ui/attachment';   // 확장자 → 아이콘·색 매핑(모달 첨부목록과 SSOT 공유)
import { DatePicker } from '../ui/date-picker';
import { PeriodPicker } from '../ui/period-picker';   // 연도 선택(control:'year') — 일자선택과 같은 폭·팝오버 계약
import { Checkbox } from '../ui/checkbox';   // 'checkbox'('true'/'false' 계약) 컨트롤
import { Switch } from '../ui/switch';       // 'switch'('여/부' 2지선다) — 2026-09-18 오후 사용자 결정으로 스위치 렌더 원복
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';   // 'radio' — DS 라디오(선택 점 scale-pop)
import { Icon } from '../icons';
import { renderKind } from './dispatch';
import type { ColumnSpec, FieldControl, FieldSpec, StatusDomainEntry } from './types';
import { formatUnit } from './unit';
import type { Unit } from './unit';
import type { Tone } from '../components';

const { StatusBadge, DeltaBadge } = UI;

// 무거운 에디터/업로더는 코드 스플리팅 — 모달이 열려 해당 컨트롤이 렌더될 때만 로드.
const RichTextField = React.lazy(() => import('../fields/RichTextField').then((m) => ({ default: m.RichTextField })));
// filepond 컨트롤은 DocumentsField(기존 첨부 Attachment 표시 + FilePond 신규추가)로 렌더.
const DocumentsField = React.lazy(() => import('../fields/DocumentsField').then((m) => ({ default: m.DocumentsField })));
// tags 컨트롤은 TagsField(Plate SelectEditor 멀티 태그 입력)로 렌더 — 값은 JSON 배열 문자열.
const TagsField = React.lazy(() => import('../fields/TagsField').then((m) => ({ default: m.TagsField })));
// address 컨트롤은 AddressField(우편번호 검색 다이얼로그 + 주소 입력)로 렌더 — 값은 '(12345) 주소' 단일 문자열.
// ⚠ 이 import 는 반드시 동적(lazy)이어야 한다: AddressField 가 CONTROL_BOX 를 되가져가므로 정적이면 순환이 된다.
const AddressField = React.lazy(() => import('../fields/AddressField').then((m) => ({ default: m.AddressField })));

// status tone을 스키마의 statusDomain에서 해결(모달 의존 제거 → 순환 차단).
function toneFor(label: string, domain?: StatusDomainEntry[]): Tone {
  return domain?.find((d) => d.label === label)?.tone ?? 'info';
}

/* 첨부파일 칩 — 리스트 셀 값 뒤에 붙는 확장자 배지(ColumnSpec.attachFrom). 첨부 컬럼을 따로 만들지 않고
   제목 뒤에 "· PDF"처럼 덧붙이는 표현. 값 계약은 filepond와 동일한 CSV("a.pdf, b.xlsx"). */
export function AttachChips({ value, max = 3 }: { value?: unknown; max?: number }) {
  const names = parseFileNames(typeof value === 'string' ? value : '');
  if (names.length === 0) return null;
  const shown = names.slice(0, max);
  return (
    // shrink-0: 제목 셀은 flex 컨테이너(잔여폭 흡수)라 이게 없으면 긴 제목이 칩을 먼저 찌그러뜨린다.
    <span className="inline-flex items-center gap-1 shrink-0" title={names.join(', ')}>
      {shown.map((n, i) => {
        // 아이콘·색은 파일 종류 신호(pdf=빨강·xlsx=초록…), 라벨은 회색 유지 — 칩이 상태 배지처럼 읽히지 않게.
        const { Icon: FileGlyph, cls } = glyphFor(n);
        return (
          <span key={n + i} className="inline-flex items-center gap-1 whitespace-nowrap rounded-[6px] border border-border bg-muted px-[6px] py-px text-[11px] font-bold leading-4 text-muted-foreground">
            {/* 색만으로 종류를 전달하지 않는다 — 옆 확장자 텍스트가 같은 정보를 문자로 준다(아이콘은 장식) */}
            <FileGlyph aria-hidden className={`size-3.5 shrink-0 ${cls}`} />
            {/* 칩 텍스트가 'PDF'뿐이라 무엇의 PDF인지 알 수 없다 → 접근名을 앞에 숨겨 붙인다 */}
            <span className="sr-only">첨부파일 </span>{fileExtLabel(n)}
          </span>
        );
      })}
      {names.length > shown.length && (
        <span className="text-[11px] font-semibold text-muted-foreground">+{names.length - shown.length}</span>
      )}
    </span>
  );
}

/* unit: 금액 단위 토글(schema.unitToggle)이 켜진 화면만 넘긴다. **type:'amount' 숫자 값에만** 적용 —
   date/number(종업원수·주식수)까지 나누면 축이 무너진다. 환산은 여기(렌더 경계)에서만 하고
   행 데이터는 원 단위 원본 그대로 둔다(KPI 합계·필터 비교값 보존). */
export function Cell({ col, value, color, statusDomain, unit }: { col: ColumnSpec; value: any; color?: string; statusDomain?: StatusDomainEntry[]; unit?: Unit }) {
  switch (renderKind(col.type)) {
    case 'status':     return <StatusBadge tone={toneFor(String(value), statusDomain)} label={String(value)} size="sm" />;
    case 'rate':       return <DeltaBadge value={Number(value)} />;
    /* 운용사(gp): 이름 앞 아이콘 칩 제거(2026-09-16 사용자 지시). 표 전반에서 같은 건물 아이콘이
       모든 행에 반복돼 정보가 없었고, 좁은 폭에서 이름을 밀어냈다. 렌더는 일반 텍스트와 같다 —
       `type:'gp'` 자체는 남긴다(스키마 의미 표식이고 정렬·필터 해석에 쓰인다). */
    case 'gp':         return <>{String(value)}</>;
    case 'numeric':
      if (unit && col.type === 'amount' && typeof value === 'number')
        return <span className="tabular">{String(formatUnit(value, unit))}</span>;
      return <span className="tabular">{String(typeof value === 'number' ? value.toLocaleString() : String(value))}</span>;
    // text (text/code/pii) + 미지 타입 → 일반 텍스트
    default:           return <>{String(value)}</>;
  }
}

/* 폼/필터 컨트롤 공용 폭 하한 SSOT(2026-09-09 사용자 결정) — 일률 220 폐기, 타입별 차등. maxWidth:100%(컨테이너 초과 방지)와 짝.
   RowFormModal(SchemaField)·상세필터 드로어(asset_funding inputStyle·generic_list drawerInputStyle)가 모두 import해 숫자 복붙을 없앤다.
   date=짧은 고정포맷(YYYY-MM-DD) 120 · select/enum/year=이름만이면 fit-content로 더 좁아짐 130 · number=금액 자릿수 180 · text/기본=이름/명칭 길게 240. */
export function controlMinWidth(kind?: string): number {
  return kind === 'date' ? 120 : (kind === 'select' || kind === 'enum' || kind === 'year' || kind === 'month') ? 130 : kind === 'number' ? 180 : 240;
}

/* 폼 컨트롤 박스 규격(높이 34px) — 등록/수정 모달(SchemaField base)과 상세필터 드로어가 **공유하는 SSOT**.
   ⚠️ 이 값을 페이지로 복사하지 말 것: 24개 드로어가 각자 복제한 결과 9px 패딩·14px 폰트로 굳어
   모달(34px)보다 6px 높아졌다(2026-09-17 사용자 지적). 높이를 바꾸려면 여기 한 곳만 바꾼다.
   ⚠️ fontFamily(longhand)만 상속 — `font:'inherit'`(단축)은 fontSize·lineHeight 를 함께 리셋해 34px 클램프를 깬다.
   높이 산술이 안 맞아 보이는 이유·UA 함정은 아래 base 주석 참조. */
export const CONTROL_BOX: React.CSSProperties = {
  boxSizing: 'border-box', padding: '7px 11px', fontSize: 13.5, lineHeight: '20px', height: 34, minHeight: 34, fontFamily: 'inherit',
};

/* 상세필터 드로어 입력 — 폭은 fit-content(하한 = 타입별 controlMinWidth SSOT), 박스는 CONTROL_BOX(모달과 동일 34px).
   테두리·반경·색도 모달 base 와 같은 토큰을 쓴다. 페이지별 로컬 복제 금지(→[[apfs-detail-filter]]). */
export const drawerInputStyle = (kind?: string): React.CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', ...CONTROL_BOX,
  border: '1px solid var(--border-strong)', borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
});

/* 복합 컨트롤 = 내부에 자체 버튼/툴바/콤보박스를 품은 컨트롤. 폼 래퍼가 이것들을 `<label>` 로 감싸면
   라벨의 암묵 연결이 **라벨 가능한 첫 자손**(에디터 툴바의 B 버튼·첨부 찾아보기·주소 검색 버튼)을 가로채
   라벨 클릭·hover 가 그 버튼을 눌러 버린다(richtext 에서 실제로 발생 → generic_list_modal.tsx 상단 주석).
   판정을 폼 래퍼마다 리터럴로 복제하면 컨트롤이 늘 때마다 한 곳씩 빠진다 → 여기를 SSOT 로 둔다. */
export const COMPLEX_CONTROLS: readonly FieldControl[] = ['richtext', 'filepond', 'file', 'tags', 'address'];
export function isComplexControl(control: FieldControl): boolean {
  return COMPLEX_CONTROLS.includes(control);
}

/* `<label>` 로 감싸면 안 되는 컨트롤 전부 = 복합 컨트롤 + 자체 접근名/명시 연결을 쓰는 단일 컨트롤.
   · radio      — 암묵 연결이 그룹의 **첫 항목만** 가리켜 라벨 클릭이 엉뚱한 옵션을 고른다.
   · switch/checkbox — Radix 구현체가 `<button>` 이라 `<label>` 암묵 연결이 클릭을 한 번 더 발화시킨다
                       (가시 라벨은 렌더러가 htmlFor/id 로 **명시** 연결한다).
   판정을 폼 래퍼마다 리터럴로 복제하면 컨트롤이 늘 때 한 곳씩 빠지므로 여기를 SSOT 로 둔다
   (소비처: generic_list_modal Field plain, subfund_form_modal F Wrap). */
export function isPlainWrapControl(control: FieldControl): boolean {
  return isComplexControl(control) || control === 'radio' || control === 'switch' || control === 'checkbox';
}

/* 체크박스 필드 — DS Checkbox + 클릭 가능한 가시 라벨(htmlFor/id 명시 연결). control 'checkbox'('true'/'false' 계약) 전용.
   (2026-09-18 오전에는 'switch' 도 여기로 그렸으나 같은 날 오후 사용자 결정으로 Switch 렌더 원복 — case 'switch' 주석.) */
function CheckField({ id, checked, onToggle, text, label, required, invalid }: {
  id: string; checked: boolean; onToggle: (next: boolean) => void;
  text?: string; label: string; required?: boolean; invalid?: boolean;
}) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minHeight: 34 }}>
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(c) => onToggle(c === true)}
        /* 접근名 = "필드명 + 가시 텍스트"(예: "사용여부 여").
           · `<label htmlFor>` 단독에 맡기면 접근名이 값('여')뿐이라 무슨 항목인지 알 수 없고,
             `label[for]` → `<button role=checkbox>` 연결은 UA 별로 편차가 있어 비어 버릴 수 있다.
           · 반대로 field.label 단독도 안 된다 — 가시 텍스트 '여'가 접근名에 없으면 WCAG 2.5.3(Label in Name) 위반. */
        aria-label={text ? `${label} ${text}` : label}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
      />
      {text ? (
        <label htmlFor={id} style={{ fontSize: 13.5, color: 'var(--foreground)', cursor: 'pointer', userSelect: 'none' }}>{text}</label>
      ) : null}
    </div>
  );
}

/* 폼 컨트롤 focus 표현 SSOT — 아래 SchemaField 와 AddressField(fields/AddressField.tsx)가 공유한다.
   별도 outline 링을 덧그리지 않고 인라인 border 색을 --ring 으로 스왑 + 은은한 글로우(2026-09-10 사용자 요청).
   ⚠ invalid/미입력 필수는 focus 중에도 danger 테두리를 유지한다(검증 단서 소실 방지) — 그땐 글로우만 danger 색. */
export function controlFocusStyle(focused: boolean, danger: boolean): React.CSSProperties {
  // ⚠ 비포커스에서 **빈 객체를 돌려주면 테두리색이 영구 강등된다**(2026-09-17 실측).
  //   소비처는 `border` **단축**으로 색을 넣고 focus 때 `borderColor` **longhand** 를 덧씌우는데,
  //   blur 시 React 의 스타일 diff 가 사라진 키를 `style.borderColor=''` 로 지운다 → 단축은 값이
  //   그대로라 다시 적용되지 않아 border-*-color 가 캐스케이드로 떨어진다(--border-strong → --border).
  //   그래서 비포커스에도 쉬는 색을 **명시**해 longhand 가 항상 존재하게 한다.
  if (!focused) return { borderColor: danger ? 'var(--danger)' : 'var(--border-strong)' };
  return danger
    ? { boxShadow: '0 0 0 3px color-mix(in srgb,var(--danger) 22%,transparent)' }
    : { borderColor: 'var(--ring)', boxShadow: '0 0 0 3px color-mix(in srgb,var(--ring) 22%,transparent)' };
}

export function SchemaField({ field, value, onChange, invalid, fill: fillProp }: { field: FieldSpec; value: string; onChange: (v: string) => void; invalid?: boolean; fill?: boolean }) {
  // long 필드(설명·비고·운용사명·펀드명 등)는 소비처가 fill 을 넘기지 않아도 항상 컨테이너를 꽉 채운다 —
  // fit-content 폭 규칙이 긴 텍스트를 240px 하한에 묶어두던 문제(권한관리 모달 '설명') 해소.
  const fill = fillProp || !!field.long;
  // fill=true: 컨테이너(테이블 셀 등)를 꽉 채운다(width:100%). 기본은 fit-content(RowFormModal 그리드 규격 유지).
  //   인라인 width는 CSS 클래스로 못 덮으므로 여기서 prop으로 스왑한다(select/date 래퍼까지 함께).
  // 필수 표식은 두 갈래다 — 섞지 말 것(2026-09-15 사용자 지적: "값을 넣었는데 왜 아직 빨간 테두리냐").
  //   · requiredMark = **속성**(이 필드는 필수다). 라벨 '*'·aria-required 가 담당하며 값과 무관하게 유지된다.
  //   · requiredEmpty = **상태**(필수인데 아직 비었다). 빨간 테두리·danger 글로우는 이쪽만 따른다 → 채우면 즉시 풀린다.
  // readonly 는 입력 대상이 아니라 둘 다 제외.
  const requiredMark = !!field.required && field.control !== 'readonly';
  const requiredEmpty = requiredMark && !String(value ?? '').trim();
  const minW = controlMinWidth(field.control);
  // focus: 별도 링을 덧그리지 않고 기존 인라인 border 색만 --ring로 바꾸고 은은한 box-shadow 글로우(2026-09-10 사용자 요청).
  //   인라인 border는 CSS :focus-visible로 못 덮으므로(명시도) 여기서 상태로 스왑한다. 전역 규칙과 톤 일치.
  const [focused, setFocused] = React.useState(false);
  const fh = { onFocus: () => setFocused(true), onBlur: () => setFocused(false) };
  // 체크박스 계열의 가시 라벨 명시 연결용 id — 같은 field.key 가 여러 모달에 동시에 뜰 수 있어 useId 로 고유화한다.
  const uid = React.useId();
  const base: React.CSSProperties = {
    // ⚠️ fontFamily(longhand)로 패밀리만 상속 — `font: 'inherit'`(shorthand)는 font-size까지 리셋해 위의 fontSize:13.5를 부모값으로 덮어쓴다.
    // ⚠️ 높이 규격 34px(2026-09-09 사용자 DevTools 스펙) — DatePicker/PeriodPicker 버튼·radio와 일치시킨다.
    //    boxSizing:border-box + 명시 height:34가 하드 클램프로 이긴다: padding 7*2=14 + border 2 + lineHeight 20 = 36의 자연높이지만
    //    height:34가 콘텐츠(18px)를 클램프(20px 라인박스 1px 오버플로우는 무해). ⚠ 산술이 안 맞는다고 되돌리지 말 것 — 사용자 측정 스펙이 정본.
    //    minHeight:34는 플로어 가드. lineHeight:20 없으면 native input/select가 normal 메트릭으로 어긋나므로 유지.
    // 🍎 Safari(WebKit): preflight:false라 native <select>·<input type=number>가 UA 박스모델을 쓴다 → 명시 height:34 하드 클램프로 통일(textarea만 아래서 height:'auto').
    // 폭: 컨테이너를 꽉 채우지 않고 내용 맞춤(fit-content). 하한은 타입별 minW(위), 넘치지 않게 max 100%.
    //    textarea는 아래에서 100%로 되돌린다(긴 입력 항목).
    // fill=true면 셀(컬럼)이 폭을 지배 → minWidth 하한(text 240 등)을 풀어(0) 고정폭 컬럼을 넘쳐 겹치지 않게 한다(Codex P2).
    width: fill ? '100%' : 'fit-content', minWidth: fill ? 0 : minW, maxWidth: '100%', ...CONTROL_BOX,   // 박스 규격(34px)은 드로어와 공유하는 CONTROL_BOX 가 SSOT
    border: `1px solid ${invalid || requiredEmpty ? 'var(--danger)' : 'var(--border-strong)'}`,
    borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
    transition: 'border-color .12s, box-shadow .12s',
  };
  // ...base 뒤에 병합 — borderColor longhand가 base의 border shorthand 색을 이긴다(삽입 순서).
  // ⚠ invalid/미입력 필수는 focus 중에도 danger 테두리를 유지한다(검증 단서 소실 방지, Codex P2). 그땐 테두리를 --ring로 스왑하지 않고
  //   글로우만 danger 색으로 맞춘다(정상 필드·이미 채운 필수는 --ring 테두리+글로우).
  const fs = controlFocusStyle(focused, !!invalid || requiredEmpty);
  switch (field.control) {
    case 'textarea': return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} placeholder={field.placeholder} {...fh} aria-invalid={invalid || undefined} aria-required={requiredMark || undefined} style={{ ...base, width: '100%', height: 'auto', resize: 'vertical', ...fs }} />;
    // select: native 화살표는 Chrome UA가 오른쪽 경계에 고정해 padding으로 못 움직임 → appearance:none로 제거하고 lucide chevron을 오버레이(토큰색·다크대응).
    //   아이콘은 pointer-events:none라 클릭이 select로 통과. 오른쪽 간격 = 아이콘 right(12px). paddingRight 34는 옵션 텍스트가 chevron과 겹치지 않게 확보.
    case 'select':   return (
      <div style={{ position: 'relative', display: fill ? 'block' : 'inline-block', width: fill ? '100%' : undefined, maxWidth: '100%' }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} {...fh} aria-invalid={invalid || undefined} aria-required={requiredMark || undefined} style={{ ...base, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingRight: 34, ...fs }}>{(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select>
        <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted-foreground)' }} />
      </div>
    );
    case 'number':   return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} {...fh} aria-invalid={invalid || undefined} aria-required={requiredMark || undefined} style={{ ...base, ...fs }} />;
    // 일자선택 — shadcn Radix Calendar(Popover). 값은 'YYYY-MM-DD' 문자열 유지(네이티브 input과 동일 계약).
    // DatePicker 트리거는 w-full이라 fit-content 래퍼로 감싸 폭 규칙(minW=120)을 적용
    case 'date':     return <div style={{ width: fill ? '100%' : 'fit-content', minWidth: fill ? 0 : minW, maxWidth: '100%' }}><DatePicker value={value} onChange={onChange} invalid={invalid} required={requiredMark} ariaLabel={field.label} /></div>;
    // 연도선택 — PeriodPicker 연도 그리드(네이티브 select·숫자 input 나열 금지, →[[apfs-datepicker]]).
    // 값은 'YYYY' 문자열(사업연도·회계연도). 트리거가 w-full이라 date와 같은 fit-content 래퍼(minW=130)를 쓴다.
    case 'year':     return <div style={{ width: fill ? '100%' : 'fit-content', minWidth: fill ? 0 : minW, maxWidth: '100%' }}><PeriodPicker mode="year" value={value} onChange={onChange} invalid={invalid} required={requiredMark} ariaLabel={field.label} /></div>;
    // 월선택 — PeriodPicker 월 그리드. 값은 'YYYY-MM' 문자열(기준년월·등록년월). year 와 동일한 fit-content 래퍼(minW=130).
    // field.placeholder 는 넘기지 않는다 — 위 date/year 와 같은 기존 패턴이다(픽커 트리거는 자체 기본 문구를 쓴다).
    case 'month':    return <div style={{ width: fill ? '100%' : 'fit-content', minWidth: fill ? 0 : minW, maxWidth: '100%' }}><PeriodPicker mode="month" value={value} onChange={onChange} invalid={invalid} required={requiredMark} ariaLabel={field.label} /></div>;
    // 독립 체크값('true'/'false' 계약) — 가시 라벨은 모달이 위에 렌더하므로 여기선 접근名만 aria-label 로 준다.
    // ⚠ 신규 스키마는 이 토큰 대신 `control:'switch' + options`를 쓴다(현재 사용처 0). 이유:
    //   ① 값 계약이 'true'/'false' 라 형제 Y/N 필드와 나란히 두면 똑같아 보이는데 저장 형태만 다르다,
    //   ② 옵션이 없어 클릭 가능한 가시 라벨을 붙일 수 없고(히트 영역이 20px 상자뿐),
    //   ③ RowFormModal 의 첫옵션 시드(optionish)가 옵션형에만 걸려 등록 시 ''로 저장된다.
    case 'checkbox': return <CheckField id={`${uid}-chk`} checked={value === 'true'} onToggle={(c) => onChange(String(c))} label={field.label} required={requiredMark} invalid={invalid} />;
    // '여/부'·'Y/N' 2지선다 — **Switch** 로 그린다(2026-09-15 radio 대체 도입. 2026-09-18 오전 체크박스로 바꿨다가 같은 날 오후
    //   사용자 결정 "스위치는 체크로 하지 말고 원복" 으로 되돌림). namethatui 의 switch=즉시 반영 의미 규약보다 화면 인터랙션 통일이 우선.
    // ⚠️ 값 계약은 문자열 그대로 유지: checked = value === options[0], 토글 시 options[0] | options[1] 을 emit 한다.
    //    `use: v.use === '여'` 처럼 옵션 문자열을 읽는 소비처·필터가 다수라 'true'/'false' 로 바꾸면 무음으로 깨진다.
    // 상태 텍스트를 옆에 함께 렌더 — 토글만 있으면 '여/부' 중 무엇이 켜진 상태인지 시각적으로 모호하다.
    // 접근名은 **필드명 고정**(예: "사용여부") — 이름은 식별, 상태는 aria-checked 가 담당(APG). 이름을 상태와 함께 바꾸면
    //   SR 이 토글마다 이름을 재낭독하고 "사용여부 여, 스위치, 켜짐"처럼 중복된다(독립 리뷰 지적). 옆 상태 텍스트는 htmlFor 클릭 면적용.
    case 'switch': {
      const [onOpt, offOpt] = field.options && field.options.length >= 2 ? field.options : ['여', '부'];
      const checked = value === onOpt;
      const stateText = checked ? onOpt : offOpt;
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minHeight: 34 }}>
          <Switch id={`${uid}-sw`} checked={checked} onCheckedChange={(c) => onChange(c ? onOpt : offOpt)} aria-label={field.label} aria-required={requiredMark || undefined} aria-invalid={invalid || undefined} />
          <label htmlFor={`${uid}-sw`} style={{ fontSize: 13.5, color: 'var(--foreground)', cursor: 'pointer', userSelect: 'none' }}>{stateText}</label>
        </div>
      );
    }
    // 라디오 — 옵션 가로 나열(Y/N, Y/N/해당없음 등). DS RadioGroup(Radix) — 선택 점 scale-pop, 체크박스·스위치와 같은 역할색.
    //   Item 은 <button role=radio> 라 <label> 로 감싸지 않고 htmlFor/id 명시 연결(래핑은 클릭 2회 발화).
    //   값 계약은 옵션 문자열 그대로(onValueChange 가 option 을 그대로 준다).
    case 'radio': return (
      <RadioGroup value={value} onValueChange={onChange} aria-label={field.label} aria-required={requiredMark || undefined} aria-invalid={invalid || undefined} style={{ minHeight: 34 }}>
        {(field.options || ['Y', 'N']).map((o, i) => (
          <span key={o} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <RadioGroupItem id={`${uid}-r-${i}`} value={o} aria-label={`${field.label} ${o}`} />
            <label htmlFor={`${uid}-r-${i}`} style={{ fontSize: 13.5, color: 'var(--foreground)', cursor: 'pointer', userSelect: 'none' }}>{o}</label>
          </span>
        ))}
      </RadioGroup>
    );
    // Plate(platejs) 리치 텍스트 에디터 — lazy 로드. Suspense fallback은 base 톤 placeholder.
    case 'richtext': return (
      <React.Suspense fallback={<div style={{ ...base, color: 'var(--muted-foreground)' }}>에디터 불러오는 중…</div>}>
        <RichTextField value={value} onChange={onChange} label={field.label} required={requiredMark} pageWidth="a4" />
      </React.Suspense>
    );
    // 첨부파일 — 기존 첨부(Attachment 표시) + FilePond 신규추가. lazy 로드.
    // 'file'(날것 <input type=file>)도 여기로 통일 — 스키마에 'file'을 써도 DocumentsField로 렌더(파일존 단일화).
    // ⚠ generic_list_modal의 complex(=<label> 래핑 금지) 목록에 'file'도 포함돼야 함(찾아보기 버튼 하이재킹 방지).
    case 'file':
    case 'filepond': return (
      <React.Suspense fallback={<div style={{ ...base, color: 'var(--muted-foreground)' }}>업로더 불러오는 중…</div>}>
        <DocumentsField value={value} onChange={onChange} required={requiredMark} label={field.label} />
      </React.Suspense>
    );
    // 멀티 태그/라벨 입력 — Plate SelectEditor. lazy 로드. 값=JSON 배열 문자열, 빈 배열은 ''.
    case 'tags': return (
      <React.Suspense fallback={<div style={{ ...base, color: 'var(--muted-foreground)' }}>태그 입력 불러오는 중…</div>}>
        <TagsField value={value} onChange={onChange} options={field.options} required={requiredMark} label={field.label} />
      </React.Suspense>
    );
    // readonly: base의 height:34 하드 클램프와 짝이 되는 1줄 클립이 필수 — 없으면 긴 값(프로그램ID+프로그램명 등)이
    //   2줄로 줄바꿈되며 박스 밖으로 흘러넘친다(입력 불가라 스크롤도 못 한다). 잘린 전체 값은 title로 노출.
    // 우편번호 검색 + 주소 입력 — lazy 로드. 값=단일 문자열 '(12345) 주소'(fields/address_value.ts 계약).
    // ⚠ generic_list_modal 의 complex(=<label> 래핑 금지) 목록에 'address' 가 포함돼야 한다(검색 버튼 하이재킹 방지).
    case 'address': return (
      <React.Suspense fallback={<div style={{ ...base, width: '100%', color: 'var(--muted-foreground)' }}>주소 입력 불러오는 중…</div>}>
        <AddressField value={value} onChange={onChange} required={requiredMark} label={field.label} invalid={invalid} fill={fill} />
      </React.Suspense>
    );
    case 'readonly': return <div title={value || undefined} style={{ ...base, background: 'var(--muted)', color: 'var(--muted-foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || '—'}</div>;
    default:         return <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder} {...fh} aria-invalid={invalid || undefined} aria-required={requiredMark || undefined} style={{ ...base, ...fs }} />;
  }
}

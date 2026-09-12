import React from 'react';
import { UI } from '../components';
import { mn, MT, useMask } from '../mask';
import { parseFileNames, fileExtLabel } from '../fields/file_names';   // 첨부 CSV 계약 파서(DocumentsField와 SSOT 공유)
import { glyphFor } from '../ui/attachment';   // 확장자 → 아이콘·색 매핑(모달 첨부목록과 SSOT 공유)
import { DatePicker } from '../ui/date-picker';
import { Icon } from '../icons';
import { renderKind } from './dispatch';
import type { ColumnSpec, FieldSpec, StatusDomainEntry } from './types';
import type { Tone } from '../components';

const { StatusBadge, ColorChip, DeltaBadge } = UI;

// 무거운 에디터/업로더는 코드 스플리팅 — 모달이 열려 해당 컨트롤이 렌더될 때만 로드.
const RichTextField = React.lazy(() => import('../fields/RichTextField').then((m) => ({ default: m.RichTextField })));
// filepond 컨트롤은 DocumentsField(기존 첨부 Attachment 표시 + FilePond 신규추가)로 렌더.
const DocumentsField = React.lazy(() => import('../fields/DocumentsField').then((m) => ({ default: m.DocumentsField })));
// tags 컨트롤은 TagsField(Plate SelectEditor 멀티 태그 입력)로 렌더 — 값은 JSON 배열 문자열.
const TagsField = React.lazy(() => import('../fields/TagsField').then((m) => ({ default: m.TagsField })));

// status tone을 스키마의 statusDomain에서 해결(모달 의존 제거 → 순환 차단).
function toneFor(label: string, domain?: StatusDomainEntry[]): Tone {
  return domain?.find((d) => d.label === label)?.tone ?? 'info';
}

/* 첨부파일 칩 — 리스트 셀 값 뒤에 붙는 확장자 배지(ColumnSpec.attachFrom). 첨부 컬럼을 따로 만들지 않고
   제목 뒤에 "· PDF"처럼 덧붙이는 표현. 값 계약은 filepond와 동일한 CSV("a.pdf, b.xlsx").
   마스크 경계: 확장자는 **유형 표식**(StatusBadge·단위와 동류)이라 가리지 않는다. 반면 파일명은 데이터이므로
   마스크 ON에서는 tooltip(title)을 떼어 평문 누출을 막는다(마스크 경계 = 엑셀·파일명·툴팁까지). */
export function AttachChips({ value, max = 3 }: { value?: unknown; max?: number }) {
  const masked = useMask();
  const names = parseFileNames(typeof value === 'string' ? value : '');
  if (names.length === 0) return null;
  const shown = names.slice(0, max);
  return (
    // shrink-0: 제목 셀은 flex 컨테이너(잔여폭 흡수)라 이게 없으면 긴 제목이 칩을 먼저 찌그러뜨린다.
    <span className="inline-flex items-center gap-1 shrink-0" title={masked ? undefined : names.join(', ')}>
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

export function Cell({ col, value, color, statusDomain }: { col: ColumnSpec; value: any; color?: string; statusDomain?: StatusDomainEntry[] }) {
  switch (renderKind(col.type)) {
    case 'status':     return <StatusBadge tone={toneFor(String(value), statusDomain)} label={String(value)} size="sm" />;
    case 'rate':       return <DeltaBadge value={Number(value)} />;
    case 'gp':         return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ColorChip icon="building" color={color || 'var(--chart-1)'} size={26} iconSize={14} /><MT>{String(value)}</MT></span>;
    case 'numeric':    return <span className="tabular">{mn(typeof value === 'number' ? value.toLocaleString() : String(value))}</span>;
    // maskedText (text/code/pii) + 미지 타입 → 항상 MT (평문 누출 차단)
    default:           return <MT>{String(value)}</MT>;
  }
}

/* 폼/필터 컨트롤 공용 폭 하한 SSOT(2026-09-09 사용자 결정) — 일률 220 폐기, 타입별 차등. maxWidth:100%(컨테이너 초과 방지)와 짝.
   RowFormModal(SchemaField)·상세필터 드로어(asset_funding inputStyle·generic_list drawerInputStyle)가 모두 import해 숫자 복붙을 없앤다.
   date=짧은 고정포맷(YYYY-MM-DD) 120 · select/enum/year=이름만이면 fit-content로 더 좁아짐 130 · number=금액 자릿수 180 · text/기본=이름/명칭 길게 240. */
export function controlMinWidth(kind?: string): number {
  return kind === 'date' ? 120 : (kind === 'select' || kind === 'enum' || kind === 'year') ? 130 : kind === 'number' ? 180 : 240;
}

export function SchemaField({ field, value, onChange, invalid, fill }: { field: FieldSpec; value: string; onChange: (v: string) => void; invalid?: boolean; fill?: boolean }) {
  // fill=true: 컨테이너(테이블 셀 등)를 꽉 채운다(width:100%). 기본은 fit-content(RowFormModal 그리드 규격 유지).
  //   인라인 width는 CSS 클래스로 못 덮으므로 여기서 prop으로 스왑한다(select/date 래퍼까지 함께).
  // 필수 필드는 채움 여부와 무관하게 빨간 테두리로 상시 표식(라벨 '*'와 병행). readonly는 입력 대상이 아니라 제외.
  const requiredMark = !!field.required && field.control !== 'readonly';
  const minW = controlMinWidth(field.control);
  // focus: 별도 링을 덧그리지 않고 기존 인라인 border 색만 --ring로 바꾸고 은은한 box-shadow 글로우(2026-09-10 사용자 요청).
  //   인라인 border는 CSS :focus-visible로 못 덮으므로(명시도) 여기서 상태로 스왑한다. 전역 규칙과 톤 일치.
  const [focused, setFocused] = React.useState(false);
  const fh = { onFocus: () => setFocused(true), onBlur: () => setFocused(false) };
  const base: React.CSSProperties = {
    // ⚠️ fontFamily(longhand)로 패밀리만 상속 — `font: 'inherit'`(shorthand)는 font-size까지 리셋해 위의 fontSize:14를 부모값으로 덮어쓴다.
    // ⚠️ 높이 규격 34px(2026-09-09 사용자 DevTools 스펙) — DatePicker/PeriodPicker 버튼·radio와 일치시킨다.
    //    boxSizing:border-box + 명시 height:34가 하드 클램프로 이긴다: padding 7*2=14 + border 2 + lineHeight 20 = 36의 자연높이지만
    //    height:34가 콘텐츠(18px)를 클램프(20px 라인박스 1px 오버플로우는 무해). ⚠ 산술이 안 맞는다고 되돌리지 말 것 — 사용자 측정 스펙이 정본.
    //    minHeight:34는 플로어 가드. lineHeight:20 없으면 native input/select가 normal 메트릭으로 어긋나므로 유지.
    // 🍎 Safari(WebKit): preflight:false라 native <select>·<input type=number>가 UA 박스모델을 쓴다 → 명시 height:34 하드 클램프로 통일(textarea만 아래서 height:'auto').
    // 폭: 컨테이너를 꽉 채우지 않고 내용 맞춤(fit-content). 하한은 타입별 minW(위), 넘치지 않게 max 100%.
    //    textarea는 아래에서 100%로 되돌린다(긴 입력 항목).
    // fill=true면 셀(컬럼)이 폭을 지배 → minWidth 하한(text 240 등)을 풀어(0) 고정폭 컬럼을 넘쳐 겹치지 않게 한다(Codex P2).
    width: fill ? '100%' : 'fit-content', minWidth: fill ? 0 : minW, maxWidth: '100%', boxSizing: 'border-box', padding: '7px 11px', fontSize: 14, lineHeight: '20px', height: 34, minHeight: 34, fontFamily: 'inherit',
    border: `1px solid ${invalid || requiredMark ? 'var(--danger)' : 'var(--border-strong)'}`,
    borderRadius: 9, background: 'var(--card)', color: 'var(--foreground)',
    transition: 'border-color .12s, box-shadow .12s',
  };
  // ...base 뒤에 병합 — borderColor longhand가 base의 border shorthand 색을 이긴다(삽입 순서).
  // ⚠ invalid/required는 focus 중에도 danger 테두리를 유지한다(검증 단서 소실 방지, Codex P2). 그땐 테두리를 --ring로 스왑하지 않고
  //   글로우만 danger 색으로 맞춘다(정상 필드는 --ring 테두리+글로우).
  const fs: React.CSSProperties = !focused ? {}
    : (invalid || requiredMark)
      ? { boxShadow: '0 0 0 3px color-mix(in srgb,var(--danger) 22%,transparent)' }
      : { borderColor: 'var(--ring)', boxShadow: '0 0 0 3px color-mix(in srgb,var(--ring) 22%,transparent)' };
  switch (field.control) {
    case 'textarea': return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} {...fh} aria-invalid={invalid || undefined} aria-required={requiredMark || undefined} style={{ ...base, width: '100%', height: 'auto', resize: 'vertical', ...fs }} />;
    // select: native 화살표는 Chrome UA가 오른쪽 경계에 고정해 padding으로 못 움직임 → appearance:none로 제거하고 lucide chevron을 오버레이(토큰색·다크대응).
    //   아이콘은 pointer-events:none라 클릭이 select로 통과. 오른쪽 간격 = 아이콘 right(12px). paddingRight 34는 옵션 텍스트가 chevron과 겹치지 않게 확보.
    case 'select':   return (
      <div style={{ position: 'relative', display: fill ? 'block' : 'inline-block', width: fill ? '100%' : undefined, maxWidth: '100%' }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} {...fh} aria-invalid={invalid || undefined} aria-required={requiredMark || undefined} style={{ ...base, appearance: 'none', WebkitAppearance: 'none', MozAppearance: 'none', paddingRight: 34, ...fs }}>{(field.options || []).map((o) => <option key={o} value={o}>{o}</option>)}</select>
        <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--muted-foreground)' }} />
      </div>
    );
    case 'number':   return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} {...fh} aria-invalid={invalid || undefined} aria-required={requiredMark || undefined} style={{ ...base, ...fs }} />;
    // 일자선택 — shadcn Radix Calendar(Popover). 값은 'YYYY-MM-DD' 문자열 유지(네이티브 input과 동일 계약).
    // DatePicker 트리거는 w-full이라 fit-content 래퍼로 감싸 폭 규칙(minW=120)을 적용
    case 'date':     return <div style={{ width: fill ? '100%' : 'fit-content', minWidth: fill ? 0 : minW, maxWidth: '100%' }}><DatePicker value={value} onChange={onChange} invalid={invalid} required={requiredMark} ariaLabel={field.label} /></div>;
    case 'checkbox': return <input type="checkbox" checked={value === 'true'} onChange={(e) => onChange(String(e.target.checked))} aria-invalid={invalid || undefined} aria-required={requiredMark || undefined} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />;
    // 라디오 — 옵션 가로 나열(Y/N, Y/N/해당없음 등). 네이티브 input + accentColor 토큰(라이트/다크 양립).
    case 'radio': return (
      <div role="radiogroup" aria-label={field.label} aria-required={requiredMark || undefined} aria-invalid={invalid || undefined} style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', minHeight: 34 }}>
        {(field.options || ['Y', 'N']).map((o) => (
          <label key={o} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14, color: 'var(--foreground)' }}>
            <input type="radio" name={field.key} value={o} checked={value === o} onChange={() => onChange(o)} style={{ accentColor: 'var(--primary)', width: 16, height: 16 }} />
            {o}
          </label>
        ))}
      </div>
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
    case 'readonly': return <div style={{ ...base, background: 'var(--muted)', color: 'var(--muted-foreground)' }}>{value || '—'}</div>;
    default:         return <input value={value} onChange={(e) => onChange(e.target.value)} {...fh} aria-invalid={invalid || undefined} aria-required={requiredMark || undefined} style={{ ...base, ...fs }} />;
  }
}

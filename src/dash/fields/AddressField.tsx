/* APFS AddressField — 스키마 폼 컨트롤 'address'의 렌더러.
 *
 * 구성: 1행 [우편번호(읽기전용) + 「주소 검색」 버튼] / 2행 [주소 본문(자유 편집)].
 * 「주소 검색」이 카카오(다음) 우편번호 임베드를 **중첩 다이얼로그**로 띄우고, 선택 결과를
 * 우편번호 + 도로명(없으면 지번) + 건물명으로 합성해 본문에 채운다. 그 뒤 사용자가 본문 뒤에
 * 상세주소(층·호)를 이어 쓴다 — 스키마는 목업에서 동결된 정본이라 상세주소 필드를 새로 만들지 않는다.
 *
 * ⚠️ 값 계약은 **단일 문자열** "(12345) 서울특별시 …" — 파싱/직렬화 SSOT는 address_value.ts.
 *    build_row 가 raw 문자열을 그대로 전개하므로 객체를 emit하면 셀·엑셀·필터가 무음으로 깨진다.
 * ⚠️ 복합 컨트롤: 내부에 자체 버튼을 품으므로 RowFormModal에서 <label> 미래핑(plain)으로 렌더돼야 한다
 *    (generic_list_modal.tsx의 complex 목록에 편입). 아니면 <label> 암묵 연결이 첫 폼요소를 가로채
 *    라벨 클릭이 검색 다이얼로그를 여는 하이재킹이 생긴다(richtext/filepond와 같은 함정).
 * ⚠️ 임베드는 iframe이라 CSS 변수가 넘어가지 않는다 → 열리는 시점에 getComputedStyle로 토큰 hex를
 *    읽어 theme 객체를 만든다. 패키지 props는 **마운트 시 1회만** 반영되므로(componentDidUpdate 없음)
 *    다이얼로그가 닫힐 때 임베드를 통째로 언마운트해 재열람 시 최신 테마로 다시 만든다.
 */
import React from 'react';

import { UI } from '../components';
import { CONTROL_BOX, CONTROL_BTN, controlFocusStyle, controlMinWidth } from '../schemas/renderers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { detailTail, formatAddress, isAddressEmpty, parseAddress } from './address_value';

// 값 계약 재수출 — 소비처가 컨트롤 하나만 import해도 파싱/직렬화에 닿을 수 있게(SSOT는 address_value.ts).
export { formatAddress, isAddressEmpty, parseAddress } from './address_value';
export type { AddressValue } from './address_value';

const { Button } = UI;

/* 우편번호 임베드는 CDN 스크립트를 런타임 주입하는 무거운 위젯 → 코드 스플리팅.
   다이얼로그가 열려 실제로 렌더될 때만 로드한다(RichTextField·DocumentsField와 동일 패턴). */
const KakaoPostcodeEmbed = React.lazy(() =>
  import('react-daum-postcode').then((m) => ({ default: m.KakaoPostcodeEmbed })),
);
type PostcodeResult = import('react-daum-postcode').Address;

/* 임베드 높이 — 짧은 뷰포트(노트북 가로화면·400% 확대)에서 460 고정이면 다이얼로그가 화면을 넘겨
   X 버튼과 목록 하단이 잘린다. 60vh 로 클램프해 헤더+패딩과 함께 88vh 안에 들어오게 한다.
   Suspense fallback·errorMessage 도 같은 값을 써 로딩↔본체 전환 시 높이가 튀지 않는다. */
const EMBED_HEIGHT = 'min(460px, 60vh)';

/* ── 임베드 테마(iframe) ──────────────────────────────────────────────────────────
   다음 우편번호 API는 **hex만** 안전하게 해석한다. tokens.css의 rgba/color-mix 토큰
   (--border-strong 등)은 넘기면 무시되거나 깨지므로 고정 hex 폴백을 쓴다.
   나머지는 getComputedStyle로 실제 토큰 값을 읽어 라이트/다크 전환을 그대로 따라간다. */
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const THEME_FALLBACK = {
  // tokens.css :root / .dark 의 현재 값과 짝. 토큰을 못 읽는 환경(SSR·테스트)에서만 쓰인다.
  light: { card: '#FFFFFF', foreground: '#1A2620', primary: '#5A5FE8', outline: '#E2E6E0' },
  dark: { card: '#181D17', foreground: '#E6EBE2', primary: '#818CF8', outline: '#39403A' },
};

/* getComputedStyle 은 선행 공백을 붙여 돌려준다("  #FFFFFF") → trim 후 hex 형식을 검증하고,
   아니면(=rgba·color-mix·빈 값) 폴백. 테마 전환을 따라가되 깨진 값은 임베드로 내보내지 않는다. */
function readHexToken(name: string, fallback: string): string {
  try {
    const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return HEX_RE.test(raw) ? raw : fallback;
  } catch {
    return fallback;
  }
}

function isDarkTheme(): boolean {
  // 테마 판정 정본은 html 의 .dark 클래스(app.tsx가 토글, index.html이 페인트 전 복원).
  // data-theme 속성도 prefers-color-scheme 경로도 이 앱에는 없다.
  try {
    return document.documentElement.classList.contains('dark');
  } catch {
    return false;
  }
}

/* --border-strong 은 rgba(…) 라 hex 검증을 통과하지 못한다. 그렇다고 고정 hex 를 박으면 테두리색만
   토큰에서 영구 분리된다(라이트 실측 오차: 코드 #E2E6E0 vs 실제 합성값 #D2D7D4).
   → 알파를 카드색 위에 직접 합성해 토큰을 따라가게 한다. 파싱 실패 시에만 폴백. */
const RGBA_RE = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+))?\s*\)$/;

function blendOverHex(rgba: string, baseHex: string, fallback: string): string {
  const m = RGBA_RE.exec(rgba.trim());
  if (!m || !HEX_RE.test(baseHex)) return fallback;
  const a = m[4] === undefined ? 1 : Number(m[4]);
  if (!Number.isFinite(a)) return fallback;
  const base = [1, 3, 5].map((i) => parseInt(baseHex.slice(i, i + 2), 16));
  const out = [0, 1, 2].map((i) => Math.round(Number(m[i + 1]) * a + base[i] * (1 - a)));
  if (out.some((c) => !Number.isFinite(c))) return fallback;
  return `#${out.map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

function readTokenRaw(name: string): string {
  try {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch {
    return '';
  }
}

function buildEmbedTheme() {
  const f = isDarkTheme() ? THEME_FALLBACK.dark : THEME_FALLBACK.light;
  const card = readHexToken('--card', f.card);
  const primary = readHexToken('--primary', f.primary);
  const fg = readHexToken('--foreground', f.foreground);
  const borderRaw = readTokenRaw('--border-strong');
  return {
    bgColor: card,
    pageBgColor: card,
    contentBgColor: card,
    // 검색 입력창은 **무채색**이다(2026-09-18 사용자 결정). 브랜드색으로 칠하면 임베드 상단만
    // 튀어 폼 모달 위에 얹힌 팝업이 별개 제품처럼 읽힌다 — 본문과 같은 표면색을 쓰고 글자도 기본색으로.
    // (우편번호·강조 텍스트의 --primary 는 남긴다: 그건 장식이 아니라 검색 결과의 식별 신호다.)
    searchBgColor: card,
    textColor: fg,
    queryTextColor: fg,
    postcodeTextColor: primary,
    emphTextColor: primary,
    // 현재 --border-strong 은 rgba 라 hex 검증을 못 통과 → 카드색 위에 알파를 합성한다.
    // 토큰이 장래에 hex 표기로 바뀌어도 폴백으로 조용히 되돌아가지 않게 hex 를 먼저 받는다.
    outlineColor: HEX_RE.test(borderRaw) ? borderRaw : blendOverHex(borderRaw, card, f.outline),
  };
}

/* 선택 결과 → 본문 문자열. 사용자가 고른 표기(도로명/지번)를 우선하되 비어 있으면 나머지로 폴백한다
   (지번만 있는 신축·도로명 미부여 주소가 실제로 존재한다). 건물명은 괄호로 덧붙여 식별을 돕는다. */
export function composeAddressBody(data: PostcodeResult): string {
  const picked = data.userSelectedType === 'J' ? data.jibunAddress : data.roadAddress;
  const base = picked || data.roadAddress || data.jibunAddress || data.address || '';
  const building = (data.buildingName || '').trim();
  return building ? `${base} (${building})` : base;
}

export function AddressField({
  value,
  onChange,
  required,
  label,
  invalid,
  fill,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  label?: string;
  invalid?: boolean;
  fill?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [zipFocus, setZipFocus] = React.useState(false);
  const [bodyFocus, setBodyFocus] = React.useState(false);
  const bodyRef = React.useRef<HTMLInputElement>(null);

  const parsed = parseAddress(value);
  // 필수 표식은 두 갈래(renderers.tsx 주석과 동일 규약): '*'·aria-required 는 속성, 빨간 테두리는 상태.
  // ⚠ 원시 문자열 trim 으로 보면 우편번호만 든 "(06236) " 가 "채워짐"으로 위장한다 → 값 계약 판정을 쓴다.
  const requiredEmpty = !!required && isAddressEmpty(value);
  const danger = !!invalid || requiredEmpty;

  // 다이얼로그를 여는 순간의 테마를 읽어 **state 로** 들고 있는다 — 패키지 props 는 마운트 시 1회만
  // 반영되므로(componentDidUpdate 없음) 이 값이 정본이다. useMemo([open]) 로 두면 닫기 애니메이션
  // (180ms) 동안 임베드가 먼저 사라져 다이얼로그 높이가 붕괴한 채 페이드아웃한다 → exit 이 끝나는
  // onCloseAutoFocus 시점에 비운다.
  const [embedTheme, setEmbedTheme] = React.useState<ReturnType<typeof buildEmbedTheme> | null>(null);
  const openSearch = () => {
    setEmbedTheme(buildEmbedTheme());
    setOpen(true);
  };

  const box = (extra: React.CSSProperties): React.CSSProperties => ({
    ...CONTROL_BOX,
    borderRadius: 9,
    background: 'var(--card)',
    color: 'var(--foreground)',
    transition: 'border-color .12s, box-shadow .12s',
    ...extra,
  });

  /* 검색 결과로 본문을 교체하되, 사용자가 이어 쓴 상세주소(층·호)는 살린다.
     같은 주소를 다시 검색해 우편번호만 보태는 흐름(레거시 평문 행)에서 "3층 302호"가 통째로
     날아가면 무음 유실이다 → 새 결과의 후보들과 접두 일치하는 만큼만 잘라내고 꼬리를 이어 붙인다. */
  const handleComplete = (data: PostcodeResult) => {
    const body = composeAddressBody(data);
    // 후보에는 **건물명 포함형도 두 표기 모두** 넣는다 — 이전 본문이 도로명+건물명인데 이번에 지번을
    // 고르면(또는 그 반대) 건물명 없는 맨 주소만 접두로 걸려 꼬리에 옛 "(건물명)" 이 남고,
    // 새 본문이 이미 건물명을 가져 같은 이름이 두 번 찍힌다(최장 일치는 후보에 긴 형태가 있을 때만 작동).
    const bname = (data.buildingName || '').trim();
    const bases = [data.roadAddress, data.jibunAddress, data.address].filter(Boolean);
    const cands = [body, ...bases, ...(bname ? bases.map((b) => `${b} (${bname})`) : [])];
    const tail = detailTail(parseAddress(value).address, cands);
    onChange(formatAddress({ zonecode: data.zonecode, address: body + tail }));
    setOpen(false);
  };

  return (
    // 두 줄 구성. fill(=long 필드)이면 컨테이너를 꽉 채우고, 아니면 텍스트 컨트롤 하한(240)을 지킨다.
    <div style={{ width: fill ? '100%' : 'fit-content', minWidth: fill ? 0 : controlMinWidth('text'), maxWidth: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        {/* 우편번호는 검색으로만 채워지는 파생값이라 읽기전용(muted) — 직접 타이핑하면 본문과 어긋난다.
            tabular: 5자리 숫자가 행마다 흔들리지 않게. */}
        <input
          className="tabular"
          value={parsed.zonecode}
          readOnly
          /* 접근名은 label prop 을 실제로 소비한다 — 소비처가 '본점 소재지' 같은 라벨을 쓰면
             가시 라벨과 스크린리더 이름이 갈린다(plain 래핑이라 <label> 연결이 없어 aria-label 이 유일한 이름). */
          aria-label={label ? `${label} 우편번호` : '우편번호'}
          placeholder="00000"
          onFocus={() => setZipFocus(true)}
          onBlur={() => setZipFocus(false)}
          style={box({
            width: 120,
            flex: '0 0 auto',
            background: 'var(--muted)',
            color: 'var(--muted-foreground)',
            border: '1px solid var(--border-strong)',
            ...controlFocusStyle(zipFocus, false),
          })}
        />
        {/* 아이콘만 있는 버튼 금지 — 텍스트 라벨이 접근名을 겸한다.
            CONTROL_BTN: UI.Button sm 의 자연 높이는 29px 라 34px 입력칸과 어긋난다 → 동거 버튼 공용 스타일(renderers SSOT). */}
        <Button variant="outline" size="sm" leadingIcon="search" style={CONTROL_BTN} onClick={openSearch}>
          {/* 필드가 여럿인 폼에서 버튼 이름이 전부 '주소 검색'으로 겹치지 않게 라벨을 앞에 숨겨 붙인다
              (UI.Button 은 rest props 를 전달하지 않아 aria-label 을 못 받는다 →[[ui-button-not-radix-aschild-trigger]]). */}
          {label && label !== '주소' && <span className="sr-only">{label} </span>}
          주소 검색
        </Button>
      </div>

      {/* 본문 — 검색 결과가 채워진 뒤에도 자유 편집 가능해야 한다(상세주소를 뒤에 이어 쓴다).
          CDN/폐쇄망으로 검색이 막혀도 이 칸만으로 수기 입력이 완결된다. */}
      <input
        ref={bodyRef}
        value={parsed.address}
        /* 본문을 전부 지우면 **값 전체를 비운다**. formatAddress 는 본문이 비어도 접두를 남기는데
           (검색 직후 상태 보존), 우편번호 칸이 읽기전용이라 그대로 두면 "(06236) " 를 되돌릴 방법이
           없어 그리드·엑셀에 "(06236)" 만 남는다. 지우기 의도는 여기서 끝내는 게 유일한 탈출구다. */
        onChange={(e) => onChange(e.target.value === '' ? '' : formatAddress({ zonecode: parsed.zonecode, address: e.target.value }))}
        aria-label={label || '주소'}
        aria-required={required || undefined}
        aria-invalid={invalid || undefined}
        placeholder="주소를 검색하거나 직접 입력하세요"
        onFocus={() => setBodyFocus(true)}
        onBlur={() => setBodyFocus(false)}
        style={box({
          width: '100%',
          marginTop: 6,
          // 빨간 테두리는 실제 입력 대상인 본문에만 — 읽기전용 우편번호까지 물들이면 "고칠 수 없는 오류"로 읽힌다.
          border: `1px solid ${danger ? 'var(--danger)' : 'var(--border-strong)'}`,
          ...controlFocusStyle(bodyFocus, danger),
        })}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        {/* 부모(RowFormModal) 위에 뜨는 중첩 다이얼로그. 둘 다 z-modal 이라 나중 마운트인 이쪽이 이긴다.
            바깥 클릭으로 닫히지 않게 막는다(폼 모달 규약) — 닫기는 X·Escape·주소 선택으로만.
            onCloseAutoFocus: 닫힌 뒤 포커스를 본문 칸으로 돌려 곧바로 상세주소를 이어 칠 수 있게 한다. */}
        <DialogContent
          /* max-h: 다른 모달 31곳과 같은 규격. DialogContent 는 flex-col overflow-hidden 이라
             높이 상한 없이 두면 짧은 뷰포트에서 X 버튼째 잘리고 스크롤도 못 한다. */
          className="max-w-[520px] max-h-[88vh]"
          onInteractOutside={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            bodyRef.current?.focus();
            // exit 애니메이션이 끝난 뒤 임베드를 비운다 → 재열람 시 최신 테마로 리마운트(props 는 마운트 1회 반영).
            setEmbedTheme(null);
          }}
        >
          <DialogHeader className="px-[18px]">
            <DialogTitle>주소 검색</DialogTitle>
            <DialogDescription className="sr-only">
              {label ? `${label} 검색 — ` : ''}도로명·지번·건물명으로 검색한 뒤 목록에서 주소를 선택하면 우편번호와 주소가 채워집니다.
            </DialogDescription>
          </DialogHeader>
          {/* min-h-0: flex 자식이라 이게 없으면 overflow-y-auto 가 동작하지 않는다(내용이 컨테이너를 밀어낸다). */}
          <div className="min-h-0 overflow-y-auto p-[18px]">
            {/* fallback 도 같은 높이를 예약 — 스크립트가 붙는 순간 다이얼로그가 튀는 것을 막는다. */}
            <React.Suspense
              fallback={
                <div style={{ height: EMBED_HEIGHT, display: 'grid', placeItems: 'center', fontSize: 13.5, color: 'var(--muted-foreground)' }}>
                  주소 검색을 불러오는 중…
                </div>
              }
            >
              {embedTheme && (
                <KakaoPostcodeEmbed
                  onComplete={handleComplete}
                  /* ⚠️ 임베드는 postcode.map.kakao.com 크로스오리진 iframe 이다. focusInput 기본값(true)이면
                     열리자마자 포커스가 iframe 안으로 들어가고, 그 안의 keydown 은 부모 document 로 전파되지
                     않아 **Radix 의 Escape 닫기가 먹통**이 된다 → 포커스를 부모 문서에 남긴다. */
                  focusInput={false}
                  /* autoClose 기본값(true)이면 선택 즉시 wrapper div 째로 사라져 닫기 연출·후처리가 끊긴다 → 직접 언마운트. */
                  autoClose={false}
                  /* width/height 는 prop 이 아니다(생성자에 100% 강제 주입) — 크기는 style 로만 준다. */
                  style={{ width: '100%', height: EMBED_HEIGHT }}
                  useBannerLink={false}
                  hideMapBtn
                  hideEngBtn
                  theme={embedTheme}
                  /* 임베드에는 onError prop 이 없다 — 스크립트 로드 실패는 이 노드로만 드러난다.
                     빈 iframe 대신 수기 입력을 안내한다(오프라인/폐쇄망에서 실제로 발생). */
                  errorMessage={
                    <div role="alert" style={{ height: EMBED_HEIGHT, display: 'grid', placeItems: 'center', padding: 18, textAlign: 'center', fontSize: 13.5, color: 'var(--muted-foreground)' }}>
                      우편번호 서비스를 불러오지 못했습니다. 주소를 직접 입력해 주세요.
                    </div>
                  }
                />
              )}
            </React.Suspense>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

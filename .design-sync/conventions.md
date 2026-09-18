# APFS Dashboard DS — 사용 규약 (디자인 에이전트용)

농림수산식품모태펀드 투자자산관리시스템 대시보드의 컴포넌트다. 화면 언어는 **한국어**, 폰트는 **Pretendard**(styles.css가 로드), 숫자는 `tabular` 클래스(tabular-nums).

## 1. 셋업 — 프로바이더 없음, 두 가지만
- `styles.css` 하나만 링크하면 토큰·폰트·컴포넌트 CSS·Tailwind 유틸이 전부 들어온다. 별도 ThemeProvider 없음.
- **다크 모드** = `<html class="dark">`. 모든 토큰이 `.dark`에서 재정의되므로 색을 하드코딩하지 말 것.
- `Tooltip`은 반드시 `<TooltipProvider>` 안에서. `Dialog`/`AlertDialog`/`Sheet`/`CommandDialog`에 `open`을 넘길 때는 `ref`(useRef)를 함께 넘기고 내부 버튼으로 닫을 땐 `ref.current.close()`(닫힘 애니메이션). `DialogContent`에 `onOpenAutoFocus={e => e.preventDefault()}`를 주면 첫 입력 자동 포커스가 꺼진다.
- `Button`은 forwardRef가 없다 — Radix `asChild` 트리거(`<DropdownMenuTrigger asChild><Button/>`)로 쓰지 말고 트리거를 직접 스타일하라.

## 2. 스타일 어휘 — 토큰 우선, 유틸은 아래 목록만
**색은 `var(--token)`만** 쓴다(hex 금지). 실제 이름:
- 표면: `--background` `--card` `--card-raised` `--popover` `--muted` · 텍스트: `--foreground` `--muted-foreground` `--caption` · 선: `--border` `--border-strong` `--input`
- 역할: `--primary` `--primary-foreground` `--accent` `--accent-foreground` `--success` `--warning` `--danger` `--info` (+ `-soft` 배경 / `-text` 전경: `--danger-soft` `--danger-text` `--info-soft` `--info-text`)
- 브랜드: `--brand-blue` `--brand-cyan` `--brand-forest` `--brand-lime` `--brand-gray` · 흰 글자 얹는 고정 표면: `--brand-solid` + `--on-brand-solid`
- 차트: `--chart-1` … `--chart-19` · 반경: `--radius` `--radius-sm` `--radius-lg` · 모션: `--dur` `--dur-fast` `--dur-slow` `--ease`

**Tailwind 유틸은 앱이 쓰는 것만 컴파일돼 있다.** 아래 패밀리는 존재하고, 그 밖의 유틸(예: `grid-cols-4`, `gap-6`, `p-8`)은 **없으니** 레이아웃 글루는 인라인 `style`로 쓴다.
- 레이아웃: `flex` `inline-flex` `grid` `flex-col` `flex-wrap` `items-center` `justify-between` `gap-0`~`gap-4` `grid-cols-1` `grid-cols-2` `grid-cols-3` `w-full` `min-w-0` `shrink-0` `truncate` `overflow-hidden` `sr-only`
- 간격(일부만): `p-4` `px-3` `py-2` `mt-1` `mb-3` — 그 외 값은 인라인.
- 색: `bg-card` `bg-muted` `bg-primary` `bg-danger-soft` `bg-info-soft` `bg-success-soft` `bg-warning-soft` `text-foreground` `text-muted-foreground` `text-caption` `text-primary` `text-danger` `text-success` `text-warning` `text-info` `border-border` `border-border-strong`
- 반경: `rounded-card` `rounded-card-sm` `rounded-card-lg` `rounded-full` `rounded-md`
- 타이포(앱 고유): `t-display` `t-h1` `t-h2` `t-cardtitle` `t-body` `t-label` `t-caption` — 제목·라벨·캡션은 이 클래스로.

폼 컨트롤 높이 38px, 모달 본문 패딩 46px(헤더·푸터 `px-[46px]`, 본문 `p-[46px]`), 기본 폰트 13.5px.

## 3. 어디를 읽을 것인가
- 토큰의 실제 값: `_ds_bundle.css` 첫 `:root{…}` 블록과 `.dark{…}` 블록(README의 Tokens 절은 Tailwind 내부 `--tw-*` 변수가 섞여 있으니 무시).
- 컴포넌트 API: `components/dash/<Name>/<Name>.d.ts`(`<Name>Props`), 조합 예: `<Name>.prompt.md`.
- 선택 컨트롤 규칙: on/off '여/부' = `Switch`, 배타 선택 = `RadioGroup`, 독립 복수 선택·행 선택 = `Checkbox`. `Checkbox`/`RadioGroupItem`은 `<button>`이라 `<label>`로 감싸지 말고 `htmlFor`/`id`로 연결.

## 4. 조립 예 (검증된 프리뷰에서 발췌)
```jsx
const { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, Button, SaveButton } = window.APFS;
function 자펀드등록({ ref }) {
  return (
    <Dialog ref={ref} open onOpenChange={() => {}}>
      <DialogContent className="max-w-[640px]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader className="px-[46px]"><DialogTitle>자펀드 등록</DialogTitle><DialogDescription className="sr-only">자펀드 등록 양식</DialogDescription></DialogHeader>
        <div className="p-[46px]" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px 24px' }}>
          <div><span className="t-label" style={{ display: 'block', marginBottom: 6 }}>운용사 *</span>
            <input style={{ width: '100%', height: 38, padding: '0 12px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)', fontSize: 13.5 }} /></div>
        </div>
        <DialogFooter className="px-[46px]"><div /><div style={{ display: 'flex', gap: 8 }}><Button variant="outline" size="sm" onClick={() => ref.current?.close()}>취소</Button><SaveButton onSubmit={() => {}} /></div></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

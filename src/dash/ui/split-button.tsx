/* SplitButton(combo 버튼) — 본체 클릭 = 주 동작 1클릭, 우측 ▾ = 보조 동작 메뉴(DropdownMenu).
   관련 동작 둘 이상을 툴바에 한 덩어리로 묶을 때 쓴다(첫 적용: 등록원부관리 [등록원부입력 | ▾ 등록원부업로드]).

   - 외관은 UI.Button outline sm 과 같은 클래스(높이·폰트·테두리 일치). 두 반쪽을 한 테두리로 붙이고 가운데 구분선만 남긴다.
   - UI.Button 은 forwardRef 가 없어 Radix asChild 트리거가 무음 미개폐 → 트리거는 Radix 가 직접 렌더하는 <button> 에 스타일을 얹는다.
   - 가운데 구분선 = 트리거의 왼쪽 테두리(본체는 border-r-0). inline box-shadow 로 그리면 전역 :focus-visible 링(box-shadow)을 덮어 키보드 focus 가 사라진다.
   - hover scale(motion)은 쓰지 않는다 — 반쪽만 커지면 이음매가 벌어진다. 색 전환만.
   - ▾ 는 아이콘뿐이라 menuLabel 로 접근名을 준다(web-a11y).
   - iconOnly = 푸터 아이콘 버튼 줄(FooterActions, IconBtn 32 ghost)용 — 본체는 아이콘만(label 은 aria-label·툴팁),
     두 반쪽은 투명 ghost 이고 바깥 얇은 테두리 하나로 묶는다(테두리 없는 이웃 아이콘들 사이에서 한 덩어리로 읽히게).
     ⚠ 래퍼에 overflow-hidden 금지 — 전역 :focus-visible 링(box-shadow)이 잘려 세로 한 줄만 남는다. 모서리는 반쪽마다 둥글린다. */
import React from 'react';
import { Icon } from '../icons';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

export type SplitButtonItem = { label: string; icon?: string; onSelect: () => void };

const HALF = 'ui-btn ui-outline inline-flex items-center justify-center gap-[7px] cursor-pointer font-[inherit] font-semibold whitespace-nowrap border '
  + 'transition-colors duration-tok-fast ease-ds py-1.5 text-[12.5px] bg-card text-foreground border-border-strong hover:bg-muted';

/* iconOnly 반쪽 — IconBtn(ghost) 과 같은 색·hover. 높이는 size, 테두리는 바깥 래퍼가 그린다 */
const GHOST_HALF = 'inline-flex items-center justify-center cursor-pointer border-0 bg-transparent text-muted-foreground '
  + 'transition-colors duration-tok-fast ease-ds hover:bg-muted hover:text-foreground data-[state=open]:bg-muted';

function IconOnlySplit({ label, leadingIcon = 'more', onClick, items, menuLabel, size }: {
  label: string; leadingIcon?: string; onClick: () => void; items: SplitButtonItem[]; menuLabel: string; size: number;
}) {
  return (
    <span className="inline-flex items-stretch rounded-[10px] border border-border" style={{ height: size }}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button type="button" aria-label={label} onClick={onClick} className={`${GHOST_HALF} rounded-l-[9px]`} style={{ width: size - 2 }}>
            <Icon name={leadingIcon} size={16} stroke={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={menuLabel} className={`${GHOST_HALF} rounded-r-[9px] border-l border-solid border-border`} style={{ width: 20 }}>
          <Icon name="chevron-down" size={12} stroke={2.2} />
        </DropdownMenuTrigger>
        <SplitMenu items={items} />
      </DropdownMenu>
    </span>
  );
}

function SplitMenu({ items }: { items: SplitButtonItem[] }) {
  return (
    <DropdownMenuContent align="end">
      {items.map((it) => (
        <DropdownMenuItem key={it.label} onSelect={it.onSelect}>
          {it.icon && <Icon name={it.icon} size={14} stroke={2.2} />}
          {it.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  );
}

export function SplitButton({ label, leadingIcon, onClick, items, menuLabel, iconOnly, size = 32 }: {
  label: string; leadingIcon?: string; onClick: () => void; items: SplitButtonItem[]; menuLabel: string;
  /** 푸터 아이콘 줄용 — 본체 아이콘만(label=접근名·툴팁) */
  iconOnly?: boolean;
  /** iconOnly 높이(FooterActions IconBtn size 와 맞춘다) */
  size?: number;
}) {
  if (iconOnly) return <IconOnlySplit label={label} leadingIcon={leadingIcon} onClick={onClick} items={items} menuLabel={menuLabel} size={size} />;
  return (
    <span className="inline-flex items-stretch">
      <button type="button" onClick={onClick} className={`${HALF} rounded-l-[9px] border-r-0 px-[11px]`}>
        {leadingIcon && <Icon name={leadingIcon} size={14} stroke={2.2} />}
        {label}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label={menuLabel}
          className={`${HALF} rounded-r-[9px] px-[7px] data-[state=open]:bg-muted`}>
          <Icon name="chevron-down" size={14} stroke={2.2} />
        </DropdownMenuTrigger>
        <SplitMenu items={items} />
      </DropdownMenu>
    </span>
  );
}

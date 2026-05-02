import type { LibraryItem } from '../types';

interface Props {
  item: LibraryItem;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export default function Row({ item, selected, onClick }: Props) {
  return (
    <div onClick={onClick} className={'row cursor-pointer ' + (selected ? 'row-selected' : '')}>
      <input
        type="checkbox"
        checked={selected}
        readOnly
        className="pointer-events-none accent-spotify"
      />
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="h-9 w-9 flex-shrink-0 rounded-sm bg-bg-row object-cover"
        />
      ) : (
        <div className="h-9 w-9 flex-shrink-0 rounded-sm bg-bg-row" />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm">{item.primary}</div>
          {item.secondary && <div className="truncate text-xs text-fg-muted">{item.secondary}</div>}
        </div>
        {item.tertiary && (
          <div className="hidden max-w-[40%] flex-shrink-0 truncate font-mono text-xs text-fg-dim md:block">
            {item.tertiary}
          </div>
        )}
        {item.added_at && (
          <div className="hidden w-24 flex-shrink-0 text-right font-mono text-xs text-fg-dim lg:block">
            {item.added_at.slice(0, 10)}
          </div>
        )}
      </div>
    </div>
  );
}

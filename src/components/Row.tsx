import type { LibraryItem } from '../types';

interface Props {
  item: LibraryItem;
  selected: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export default function Row({ item, selected, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={'row cursor-pointer ' + (selected ? 'row-selected' : '')}
    >
      <input
        type="checkbox"
        checked={selected}
        readOnly
        className="accent-spotify pointer-events-none"
      />
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt=""
          loading="lazy"
          className="h-9 w-9 rounded-sm object-cover bg-bg-row flex-shrink-0"
        />
      ) : (
        <div className="h-9 w-9 rounded-sm bg-bg-row flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm">{item.primary}</div>
          {item.secondary && (
            <div className="truncate text-xs text-fg-muted">{item.secondary}</div>
          )}
        </div>
        {item.tertiary && (
          <div className="hidden md:block flex-shrink-0 text-xs text-fg-dim font-mono max-w-[40%] truncate">
            {item.tertiary}
          </div>
        )}
        {item.added_at && (
          <div className="hidden lg:block flex-shrink-0 text-xs text-fg-dim font-mono w-24 text-right">
            {item.added_at.slice(0, 10)}
          </div>
        )}
      </div>
    </div>
  );
}

import type { Mark } from "@wordlex/domain";
import { cn } from "@wordlex/ui/lib/utils";

const ROWS = [[..."QWERTYUIOP"], [..."ASDFGHJKL"], ["ENTER", ..."ZXCVBNM", "DEL"]] as const;

const KEY = cn(
  "grid h-[54px] max-w-[46px] min-w-0 flex-1 place-items-center rounded-md bg-secondary text-sm font-semibold select-none",
  "transition-[background-color,color,translate] duration-200 ease-out",
  "active:translate-y-0.5",
  "data-mark:bg-(--mark-bg) data-mark:text-(--mark-fg)",
);

const WIDE = "max-w-[66px] flex-[1.55] text-[11px] tracking-[0.04em]";

/**
 * A key carries the strongest Mark that letter has earned, and only once the
 * row that earned it has finished turning — the keyboard should not answer
 * ahead of the board.
 */
export function Keyboard({
  marks,
  onPress,
}: {
  marks: Map<string, Mark>;
  onPress: (key: string) => void;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[540px] gap-1.5 px-1.5 pt-1.5 pb-[calc(10px+env(safe-area-inset-bottom))]">
      {ROWS.map((row) => (
        <div key={row[0]} className="flex justify-center gap-[5px]">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              className={cn(KEY, key.length > 1 && WIDE)}
              data-mark={marks.get(key)}
              aria-label={key === "DEL" ? "Delete" : key}
              onClick={() => onPress(key)}
            >
              {key === "DEL" ? "⌫" : key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

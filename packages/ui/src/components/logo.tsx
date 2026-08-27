import type { ComponentProps } from "react";

import { cn } from "@wordlex/ui/lib/utils";

/*
  The mark is four Tiles crossed, one per language hue, in the order the
  Dictionary lists them: en, id, su, jv (clockwise from top-left). The hues are
  the same tokens the contribution graph uses (ADR 0014), so the mark moves with
  the palette instead of pinning its own hexes.

  Geometry, all derived from `size` so the mark is correct at any scale:
    tile   0.456 x size, rotated 45 degrees about its own centre
    radius 0.087 x size
    tiles anchored to the corners of the size x size box
*/
const TILE = 0.456;
const RADIUS = 0.087;

const HUES = ["bg-lang-en", "bg-lang-id", "bg-lang-su", "bg-lang-jv"] as const;
const CORNERS = ["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"] as const;

type LogoMarkProps = Omit<ComponentProps<"span">, "children"> & {
  /** Edge length of the mark's box, in px. */
  size?: number;
  /** One colour instead of the four hues — takes `currentColor`. Use below 16px. */
  mono?: boolean;
};

function LogoMark({ size = 32, mono = false, className, ...props }: LogoMarkProps) {
  return (
    <span
      aria-hidden
      data-slot="logo-mark"
      className={cn("relative inline-block shrink-0", className)}
      style={{ width: size, height: size }}
      {...props}
    >
      {CORNERS.map((corner, i) => (
        <span
          key={corner}
          className={cn("absolute rotate-45", corner, mono ? "bg-current" : HUES[i])}
          style={{
            width: size * TILE,
            height: size * TILE,
            borderRadius: Math.max(1, size * RADIUS),
          }}
        />
      ))}
    </span>
  );
}

type LogoProps = Omit<ComponentProps<"span">, "children"> & {
  /** Mark size in px; the wordmark and the gap are derived from it. */
  size?: number;
  mono?: boolean;
  /** Drop the wordmark and render the mark alone. */
  markOnly?: boolean;
};

function Logo({ size = 32, mono = false, markOnly = false, className, ...props }: LogoProps) {
  return (
    <span
      data-slot="logo"
      className={cn("inline-flex items-center", className)}
      style={{ gap: markOnly ? 0 : size * 0.33 }}
      {...props}
    >
      <LogoMark size={size} mono={mono} />
      {markOnly ? (
        // The visible wordmark is the accessible name; only the bare mark needs
        // a text stand-in, or the lockup would announce itself twice.
        <span className="sr-only">WordleX</span>
      ) : (
        <span
          className="font-bold tracking-[-0.045em] whitespace-nowrap"
          style={{ fontSize: size * 0.78 }}
        >
          WORDLEX
        </span>
      )}
    </span>
  );
}

export { Logo, LogoMark };

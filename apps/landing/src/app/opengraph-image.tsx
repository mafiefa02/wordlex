import { ImageResponse } from "next/og";

/**
 * The card a link to this site unfurls with, in Slack, WhatsApp, Discord and
 * the rest. The board across the full width, the headline above it, the
 * promise below, so the board is the card rather than an illustration beside
 * it.
 *
 * Seven Tiles rather than five, because the headline claims more than five
 * letters and this is the one layout with the width to show it. One row rather
 * than two, because 630px is the whole budget and what the board takes the
 * headline gives up — a Guess mid-solve says "word game" just as well as a
 * solve does, and leaves the type at a size that survives a thumbnail.
 *
 * Sitting at the app root, this covers every route: `/privacy` and `/tos`
 * inherit it, and their own titles are what differ. There is no `twitter-image`
 * beside it on purpose — with none, a card falls back to this one, and a second
 * file would be the same picture with a second way to go stale.
 *
 * This renders through Satori rather than a browser: **flexbox only, no CSS
 * grid**, so every layout below stays inside what that renderer accepts. The
 * type is Geist Regular rather than the site's 600, because `next/og` bundles
 * Regular as its only font and Satori cannot read the variable `.woff2` that
 * `packages/ui` ships; matching the site would mean committing a static
 * SemiBold `.ttf`.
 */
export const alt = "WordleX — a daily word game in four languages";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/*
  The palette is pinned rather than read from the design tokens. Whoever renders
  an unfurl has no theme of ours to read, so light or dark is decided once, here
  — the same rule the Story card holds (ADR 0028). These are the dark theme's
  values; `oklch()` is not worth the risk in a renderer that is not a browser.
*/
const INK = "#fafafa";
const MUTED = "#9a9aa4";
const CANVAS = "#16161a";
const OUTLINE = "#303038";
const MARK = { exact: "#17805f", present: "#d9a233", absent: "#3a3a41" } as const;

/** The Dictionary's order — en, id, su, jv — clockwise from top-left. */
const HUES = ["#5289de", "#26a87f", "#c08a20", "#c44e9b"];

/*
  A Guess caught mid-solve. Marks only, never letters: a social card is cached
  by every client that ever saw it, so it outlives the WordleX Day it was made
  in — the same reason the Story card carries none.
*/
const ROW = [
  { tile: 1, mark: "exact" },
  { tile: 2, mark: "absent" },
  { tile: 3, mark: "present" },
  { tile: 4, mark: "exact" },
  { tile: 5, mark: "absent" },
  { tile: 6, mark: "exact" },
  { tile: 7, mark: "present" },
] as const;

/* Full width, flush to the padding: 1200 - 120 of padding leaves 1080, and a
   12px gap between seven Tiles leaves 144 each. */
const TILE = 144;
const GAP = 12;

/** The logo mark, at the same proportions as `packages/ui`'s Logo. */
function Mark({ edge }: { edge: number }) {
  const tile = edge * 0.456;
  const corners = [
    { top: 0, left: 0 },
    { top: 0, right: 0 },
    { bottom: 0, left: 0 },
    { bottom: 0, right: 0 },
  ];
  return (
    <div style={{ display: "flex", position: "relative", width: edge, height: edge }}>
      {corners.map((corner, i) => (
        <div
          key={HUES[i]}
          style={{
            position: "absolute",
            ...corner,
            width: tile,
            height: tile,
            borderRadius: Math.max(1, edge * 0.087),
            background: HUES[i],
            transform: "rotate(45deg)",
          }}
        />
      ))}
    </div>
  );
}

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: "52px 60px",
        background: CANVAS,
        color: INK,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Mark edge={36} />
          <div style={{ display: "flex", fontSize: 28, letterSpacing: "-0.02em" }}>WordleX</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", letterSpacing: "-0.03em" }}>
          <div style={{ display: "flex", fontSize: 56, lineHeight: 1.06 }}>
            More than one language.
          </div>
          <div style={{ display: "flex", fontSize: 56, lineHeight: 1.06, color: MUTED }}>
            More than five letters.
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: GAP }}>
        {ROW.map(({ tile, mark }) => (
          <div
            key={tile}
            style={{
              display: "flex",
              width: TILE,
              height: TILE,
              borderRadius: 20,
              background: MARK[mark],
              border: mark === "absent" ? `2px solid ${OUTLINE}` : "none",
            }}
          />
        ))}
      </div>

      <div style={{ display: "flex", fontSize: 27, color: MUTED }}>
        Twelve Tracks open every day. Free, no Account needed.
      </div>
    </div>,
    size,
  );
}

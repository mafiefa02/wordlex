"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { Button } from "@wordlex/ui/components/button";
import { type Theme, writeTheme } from "@wordlex/ui/lib/theme";

/**
 * Flips `data-theme` on `<html>` and remembers the choice in a cookie.
 *
 * There is no React state here on purpose. The head script sets the attribute
 * before first paint, so letting CSS pick the icon keeps it right from the very
 * first frame — state would render the wrong icon until hydration caught up,
 * and reconciling the two is where the flash comes from.
 *
 * Two states rather than three: adding "follow the system" is a menu, and this
 * is a footer control.
 */
function ThemeToggle({
  className,
  /** Domain to scope the cookie to, so the choice carries to the play app. */
  cookieDomain,
}: {
  className?: string;
  cookieDomain?: string;
}) {
  function flip() {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === "light" ? "dark" : "light";
    root.dataset.theme = next;
    writeTheme(next, cookieDomain);
  }

  // The label stays generic because CSS, not JS, knows which way the switch
  // currently points — the icon carries the direction.
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      onClick={flip}
      aria-label="Switch theme"
    >
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="dark:hidden" />
    </Button>
  );
}

export { ThemeToggle };

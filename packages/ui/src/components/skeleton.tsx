import * as React from "react";

import { cn } from "@wordlex/ui/lib/utils";

/**
 * A stand-in for something still on its way. Sized by the caller — a skeleton
 * that is not the shape of what replaces it just moves the jump somewhere else.
 *
 * The pulse is `motion-safe`, like every other animation here: this one repeats
 * for as long as the wait lasts, which is exactly what someone who asked for
 * less motion asked to be spared. Still a filled shape without it, so the wait
 * still reads as a wait.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md bg-muted motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}

export { Skeleton };

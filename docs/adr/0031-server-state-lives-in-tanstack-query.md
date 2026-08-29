# Server state lives in TanStack Query

Everything `apps/play` asks the API for goes through TanStack Query. The board is a
query, a Guess is a mutation, and so is the Account in the header. Nothing keeps its own
`loading` flag or its own copy of a server answer any more.

`api.ts` **throws** on failure instead of returning a `Result`. The envelope's error half
becomes an `ApiError` carrying the same `code`, `message` and `details`, because a rejected
promise is how Query is told something went wrong. Callers still branch on `code`; they
just do it in an `onError` rather than after an `if (!result.ok)`.

## What this replaces

Four hand-written versions of the same thing, one per call site:

- `useGame` held `board`, `problem` and `reading`, and a `useEffect` to fill them.
- `useGame` held `pending` and a `try/finally` to make sure it came back down.
- `AuthControl` held `account` and `asked`, plus a `live` flag to ignore an answer that
  arrived after unmount.
- `ResultSheet` held `card` and `undrawable`, plus its own `live` flag.

Each was correct. None of them agreed with the others about what to call anything, and
every new call would have been a fifth. `isPending` and `error` are the same two ideas with
one name.

## The board is now kept per Track

This is the visible change. Leaving a Track and coming back used to be a cold read: the
screen is keyed by Track, so the remount blanked the board and asked again. It now comes
back at once from the cache, with a read behind it to confirm.

`staleTime` stays at zero for that reason — the cached board is shown immediately but is
never trusted, and every mount re-reads. What it buys is that hopping between Tracks costs
nothing, which is the whole shape of this game: twelve Dailies are open at once (ADR 0005)
and players move between them.

A cached board can still be wrong for as long as the read takes. That is bounded by two
things: it is only ever *this* Player's own board, and the only thing that changes it
behind our back is a Game played in another tab. If that turns out to matter, the answer is
`refetchOnWindowFocus`, which is off today for a reason given below.

## Nothing refetches on its own

`refetchOnWindowFocus` and `refetchOnReconnect` are both off, and `retry` is off with them.

Retrying is wrong here because the API answers rather than fails for everything a Player
can cause (ADR 0023). A failure that reaches Query is a network failure, and the Player is
already being told about it and given the button — a silent second attempt just makes the
message take longer to appear.

Refetching on focus is wrong today because a board that arrived mid-reveal would swap the
grid out from under the animation, and because a Guess that is in flight has an
`Idempotency-Key` whose whole job is to survive exactly one story about what happened.
Turning it on means guarding both, and there is no evidence yet that it is worth it.

## The result sheet's image is a query too, and it is not a fetch

`storyCard` draws a PNG on a canvas. It is asked for with `useQuery` anyway, because it has
the shape a query has: slow, either a result or a failure, and worth keeping once it lands.
Keyed by Track and WordleX Day, so closing the sheet and reopening it does not redraw.

This is the one place the tool is used for something that never touches the network. It
earns it by deleting the same `live`-flag dance twice over — and because "draw the card
when the sheet opens, not when the button is pressed" is a caching decision, which is what
the thing in front of us is for.

## What is deliberately *not* a mutation

`signOut` reloads the page and shows no state on the way, so wrapping it would add a hook
and change nothing anyone can see. The copy button's label is a message rather than a
loading state, and `navigator.share` is a browser dialog. All three stay as they were.

The rule is not "every promise is a query". It is that anything whose *result the UI holds
on to* is one.

## Effects that are gone, and the two that are not

Removing the fetching effects left three others that were only ever there to keep a ref in
sync with the latest props. Those are now `useEffectEvent` (React 19.2), which is what that
pattern was always imitating.

Two effects remain and should:

- the `keydown` listener in `routes/index.tsx`
- the `pointerdown` listener in `result-sheet.tsx`, and the rollover timer beside it

Subscribing to something outside React is what an effect is for. "Never use an effect"
means never use one to compute a value or to fetch; it does not mean a window listener
wants a different tool.

## The costs

A dependency, and about 25 kB of it in the client bundle. A cache with a lifetime, which is
a thing that can now be wrong — the failure mode is a board that is a few hundred
milliseconds out of date, and it did not exist before. And one more piece of vocabulary
between a component and the API, which is the price of the four call sites agreeing.

The `QueryClient` is built inside `getRouter()` rather than at module scope. On the server
that function runs once per request, and a client shared across requests would hand one
Player's board to the next. Nothing fetches during SSR anyway (ADR 0003), so on the server
it stays empty — but the day something does, this is what stops it being a leak.

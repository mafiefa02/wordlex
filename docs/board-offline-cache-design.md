# Board offline cache design

## Purpose

Make the current board appear immediately after `apps/play` is reopened or
reloaded, while the API reads the authoritative board straight away.

## Design

Each Track has a small, versioned `localStorage` snapshot containing only the
last API-returned Board and diagnostic save time. A snapshot is valid only for
the current WordleX Day. It is supplied as stale TanStack Query `initialData`,
so every mount still reads the board from the API and replaces the snapshot
when needed.

Board reads and authoritative Guess responses save both the query cache and the
Track snapshot. No typed Tiles, Game tokens, idempotency keys, Account data,
errors, or animation state are persisted.

Signing out clears only WordleX board snapshot keys before the existing reload.
An open board does not refresh itself at the next WordleX Day. A Guess against
an expired board is stopped with a refresh warning, including if rollover
happens while the request is travelling. A fresh page load rejects and removes
a prior-day snapshot.

## Failure handling and checks

Storage access and malformed JSON fail safely to the existing network-only
experience. Tests focus on validating the untyped storage boundary, scoped
clearing, and current-WordleX-Day handling; normal project type, test, lint,
and build checks follow.

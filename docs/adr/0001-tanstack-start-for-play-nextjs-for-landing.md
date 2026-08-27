# TanStack Start for the play app, Next.js for the landing page

_Amended: the search params are spelled `?lang=su&length=6`. CONTEXT.md was written
after this ADR and put "mode" on the list of words to avoid, since a Track is a
language paired with a word length._

WordleX runs two different frontend frameworks on purpose. The landing page is Next.js because it is a marketing document that needs to be indexed and to render fast from the server. The play app is TanStack Start because the game board is an application: it leans on typed routes and typed search params (`?lang=su&mode=6`) to make the language/mode matrix safe to navigate, and Start still gives us server rendering so the day's board is in the HTML on first paint.

The obvious alternative was Next.js for both, dropping TanStack Router entirely. We rejected it because the language x mode x difficulty matrix lives in the URL, and hand-rolling typed search params in Next is exactly the kind of avoidable complexity this project is trying to dodge.

The cost we accept: two frameworks in one monorepo means two sets of build and deploy quirks, and TanStack Start is younger and less battle-tested than Next.js.

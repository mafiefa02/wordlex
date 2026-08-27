import { betterAuth } from "better-auth";
import { authOptions } from "../src/auth";

/**
 * A second better-auth, built on the server's own options and differing in one
 * thing: it can start a session without Google's redirect, which no test can
 * drive. Everything else — the secret, the cookie name, the database, and the
 * sign-in hook that mints a Player and carries today's Games over — is the
 * shared object, so a session it issues is one the real server accepts and the
 * carry-over under test is the real one.
 *
 * The alternative was enabling email sign-in when `NODE_ENV` says test, which
 * makes the thing under test different from the thing that ships.
 */
const testAuth = betterAuth({
  ...authOptions,
  socialProviders: {},
  emailAndPassword: { enabled: true },
});

const PASSWORD = "correct-horse-battery-staple";

let signUps = 0;

/**
 * Signs in and hands back the cookies to send from then on. A new Account
 * without an `email`, and the one that email already names with it — which is
 * how a test gets the same Player on two browsers.
 *
 * `sending` is the browser's jar, which is what the sign-in hook reads Game
 * tokens out of (ADR 0027), so a browser that played anonymously first must
 * pass it.
 */
export async function signIn(sending: Record<string, string> = {}, as?: string) {
  signUps += 1;
  const email = as ?? `player${signUps}@wordlex.test`;
  const headers = new Headers({
    cookie: Object.entries(sending)
      .map(([name, value]) => `${name}=${value}`)
      .join("; "),
  });

  const signedIn = as
    ? await testAuth.api.signInEmail({
        body: { email, password: PASSWORD },
        headers,
        returnHeaders: true,
      })
    : await testAuth.api.signUpEmail({
        body: { email, name: `Player ${signUps}`, password: PASSWORD },
        headers,
        returnHeaders: true,
      });

  const cookies: Record<string, string> = {};
  for (const set of signedIn.headers.getSetCookie()) {
    const [pair] = set.split(";");
    const [name, ...value] = (pair ?? "").split("=");
    if (name) cookies[name] = decodeURIComponent(value.join("="));
  }
  return { email, cookies };
}

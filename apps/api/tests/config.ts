/**
 * What the suite runs against. Hard-coded rather than read from the
 * environment: every test truncates the database, and one exported
 * `DATABASE_URL` pointing at the container you develop against would empty it
 * without saying so.
 *
 * `db-test` in docker-compose.yml is the other half of this. Change one and
 * change the other; `tests/global-setup.ts` refuses to run against anything else.
 */
export const TEST_PORT = 5433;
export const TEST_DATABASE_URL = `postgresql://postgres:postgres@localhost:${TEST_PORT}/postgres`;

/** The one allowlisted Origin. Any POST without it is a 403 (ADR 0006). */
export const ORIGIN = "http://localhost:3001";

/** COOKIE_SECRET has to be at least 32 characters, and this is not a secret. */
export const COOKIE_SECRET = "wordlex-test-cookie-secret-0123456789";

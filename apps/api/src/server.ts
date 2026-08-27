import cors from "@fastify/cors";
import { wordlexDay } from "@wordlex/domain";
import Fastify from "fastify";
import { env } from "./env";

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: env.allowedOrigins,
  credentials: true,
});

app.get("/health", () => ({ ok: true, day: wordlexDay() }));

await app.listen({ port: env.port, host: "0.0.0.0" });

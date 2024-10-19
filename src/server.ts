import Fastify from "fastify";
import { configSignupRoutes } from "./auth/signup";
export const server = Fastify({
    logger: false
});

server.get("/api", async function handler(request, reply) {
    return { ex: "plode" };
});

configSignupRoutes();

try {
    server.listen({ port: 3000 });
} catch (err) {
    server.log.error(err);
    process.exit(1);
}

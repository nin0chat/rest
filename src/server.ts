import Fastify from "fastify";
import { configSignupRoutes } from "./routes/auth";
import cors from "@fastify/cors";
export const server = Fastify({
    logger: false
});
server.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]
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

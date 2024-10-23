import cors from "@fastify/cors";
import Fastify from "fastify";
import { errorHandler } from "./lib/error.js";
import { configSignupRoutes } from "./routes/auth";
import { configBotRoutes } from "./routes/devPortal";
import { configUserUpdateRoutes } from "./routes/userUpdate";

export const server = Fastify({
    logger: true
});

server.setErrorHandler(errorHandler);

server.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]
});

server.addHook("onRequest", async (request, reply) => {
    if (
        !["/api", "/api/", "/api/auth/login", "/api/auth/signup", "/api/confirm"].includes(
            request.url
        ) &&
        !request.url.startsWith("/api/confirm")
    ) {
        // Request should be authenticated
    }
});

server.get("/api", async function handler(request, reply) {
    return { ex: "plode" };
});

configSignupRoutes();
configUserUpdateRoutes();
configBotRoutes();

server.listen({ port: 5174 });

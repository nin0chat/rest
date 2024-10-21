import Fastify from "fastify";
import { configSignupRoutes } from "./routes/auth";
import cors from "@fastify/cors";
import { psqlClient } from "./utils/database";
import { compare } from "bcrypt";
import { configUserUpdateRoutes } from "./routes/userUpdate";
import { configBotRoutes } from "./routes/devPortal";
export const server = Fastify({
    logger: false
});
server.register(cors, {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"]
});

server.addHook("onRequest", async (request, reply) => {
    if (!["/api", "/api/", "/api/auth/login", "/api/auth/signup"].includes(request.url)) {
        // Request should be authenticated
        if (!request.headers.authorization) {
            return reply.code(401).send({ error: "Unauthorized" });
        }
        const userID = (request.headers.authorization as String).split(".")[0];
        const seed = (request.headers.authorization as String).split(".")[1];
        const token = (request.headers.authorization as String).split(".")[2];
        const query = await psqlClient.query("SELECT token FROM tokens WHERE id=$1 AND seed=$2", [
            userID,
            seed
        ]);
        if (query.rowCount === 0) {
            return reply.code(401).send({ error: "Couldn't find token" });
        }
        for (const row of query.rows) {
            const verification = await compare(token, row.token);
            if (!verification) {
                return reply.code(401).send({ error: "Unauthorized" });
            }
            break;
        }
        const userQuery = await psqlClient.query("SELECT * FROM users WHERE id=$1", [userID]);
        if (userQuery.rowCount !== 1)
            return reply.code(500).send({ error: "Could not find account" });
        const user = userQuery.rows[0];
        if (!user.activated) return reply.code(403).send({ error: "Account not activated" });
        // @ts-ignore there is most likely a better way to do this but very very LAZY
        request.params.dbUser = {
            id: user.id,
            email: user.email,
            username: user.username,
            roles: user.role
        };
    }
});

server.get("/api", async function handler(request, reply) {
    return { ex: "plode" };
});

configSignupRoutes();
configUserUpdateRoutes();
configBotRoutes();

try {
    server.listen({ port: 5174 });
} catch (err) {
    server.log.error(err);
    process.exit(1);
}

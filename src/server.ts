import Fastify from "fastify";
export const server = Fastify({
    logger: false
});

server.get("/", async function handler(request, reply) {
    return { hello: "world" };
});

try {
    server.listen({ port: 3000 });
} catch (err) {
    server.log.error(err);
    process.exit(1);
}

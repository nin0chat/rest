import { server } from "../server";
import { psqlClient } from "../utils/database";
import { compare, genSalt, hash } from "bcrypt";
import { checkForBannedWords } from "../utils/moderate";

export function configUserUpdateRoutes() {
    type UserUpdateBody = {
        newUsername?: string;
        oldPassword?: string;
        newPassword?: string;
    };
    server.patch("/api/user/update", async function handler(request, reply) {
        try {
            const body = request.body as UserUpdateBody;
            if (body.newUsername) {
                // Check if username or email is already taken
                const query = await psqlClient.query(
                    "SELECT username FROM users WHERE username=$1",
                    [body.newUsername]
                );
                if (query.rowCount > 0) {
                    return reply.code(400).send({ error: "Username already exists" });
                }
                if (
                    body.newUsername.length > 30 ||
                    body.newUsername.length < 1 ||
                    !checkForBannedWords(body.newUsername)
                ) {
                    return reply
                        .code(400)
                        .send({ error: "Username is too long or contains banned words" });
                }
                await psqlClient.query("UPDATE users SET username=$1 WHERE id=$2", [
                    body.newUsername,
                    (request.params as any).dbUser.id
                ]);
            }
            if (body.oldPassword && body.newPassword) {
                const query = await psqlClient.query("SELECT password FROM users WHERE id=$1", [
                    (request.params as any).dbUser.id
                ]);
                const password = query.rows[0].password;
                const verification = await compare(body.oldPassword, password);
                if (!verification) {
                    return reply.code(403).send({ error: "Invalid password" });
                }
                const salt = await genSalt();
                const hashedPassword = await hash(body.newPassword, salt);
                await psqlClient.query("UPDATE users SET password=$1 WHERE id=$2", [
                    hashedPassword,
                    (request.params as any).dbUser.id
                ]);
            }
            return reply.code(204).send();
        } catch (e) {
            console.error(e);
            return reply.code(500).send({ error: "Internal Server Error" });
        }
    });
}

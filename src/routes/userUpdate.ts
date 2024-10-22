import { compare, genSalt, hash } from "bcrypt";
import { psqlClient } from "../lib/database";
import { server } from "../server";
import { checkForBannedWords } from "../utils/moderate";
import { getUser } from '../lib/auth.js';
import { RESTError } from '../lib/error.js';

export function configUserUpdateRoutes() {
    type UserUpdateBody = {
        newUsername?: string;
        oldPassword?: string;
        newPassword?: string;
    };
    server.patch("/api/user/update", {
        schema: {
            body: {
                type: "object",
                properties: {
                    newUsername: { type: "string", minLength: 2, maxLength: 30 },
                    oldPassword: { type: "string" },
                    newPassword: { type: "string" }
                }
            }
        }
    }, async function handler(request, reply) {
        const user = await getUser(request);
            const body = request.body as UserUpdateBody;

            if (body.newUsername) {
                // Check if username or email is already taken
                const query = await psqlClient.query(
                    "SELECT username FROM users WHERE username=$1",
                    [body.newUsername]
                );
                if (query.rowCount > 0) {
                    throw new RESTError(409, "Username already exists");
                }
                if (
                    !checkForBannedWords(body.newUsername)
                ) {
                    throw new RESTError(400, "Username contains banned words");
                }
                await psqlClient.query("UPDATE users SET username=$1 WHERE id=$2", [
                    body.newUsername,
                    user.id
                ]);
            }
            if (body.oldPassword && body.newPassword) {
                const query = await psqlClient.query("SELECT password FROM users WHERE id=$1", [
                    user.id
                ]);
                const password = query.rows[0].password;
                const verification = await compare(body.oldPassword, password);
                if (!verification) {
                    throw new RESTError(403, "Invalid password");
                }

                const hashedPassword = await hash(body.newPassword, await genSalt());
                await psqlClient.query("UPDATE users SET password=$1 WHERE id=$2", [
                    hashedPassword,
                    user.id
                ]);
            }
            return reply.code(204).send();
    });
}

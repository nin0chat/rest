import { genSalt, hash } from "bcrypt";
import { getUser } from "../lib/auth.js";
import { psqlClient } from "../lib/database.js";
import { Role } from "../lib/types";
import { server } from "../server.js";
import { generateID, generateToken } from "../utils/ids";
import { checkForBannedWords } from "../utils/moderate";
import { RESTError } from "../lib/error.js";

export function configBotRoutes() {
    type BotCreateBody = {
        username: string;
    };
    server.post(
        "/api/bots",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["username"],
                    properties: {
                        username: { type: "string", minLength: 2, maxLength: 30 }
                    }
                }
            }
        },
        async function handler(request, reply) {
            const user = await getUser(request);

            const body = request.body as BotCreateBody;

            // Check if username is already taken
            const query = await psqlClient.query("SELECT username FROM users WHERE username=$1", [
                body.username
            ]);

            if (query.rows.length > 0) {
                throw new RESTError(409, "Username already exists");
            }

            if (!checkForBannedWords(body.username)) {
                throw new RESTError(400, "Username contains banned words");
            }

            const futureBotID = generateID();
            await psqlClient.query("INSERT INTO bots (id, owner_id) VALUES ($1, $2)", [
                futureBotID,
                user.id
            ]);
            await psqlClient.query(
                "INSERT INTO users (id, username, activated, role)  VALUES ($1, $2, $3, $4)",
                [futureBotID, body.username, true, Role.Bot | Role.User]
            );

            // Generate token
            const token = generateToken();
            const salt = await genSalt();
            const hashedToken = await hash(token, salt);
            const seed = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;
            await psqlClient.query("INSERT INTO tokens (id, token, seed) VALUES ($1, $2, $3)", [
                futureBotID,
                hashedToken,
                seed
            ]);

            return reply.code(200).send({ token: `${futureBotID}.${seed}.${token}` });
        }
    );
    type BotDeleteBody = {
        id: string;
    };
    server.delete(
        "/api/bots",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["id"],
                    properties: {
                        id: { type: "string" }
                    }
                }
            }
        },
        async function handler(request, reply) {
            const user = await getUser(request);

            const body = request.body as BotDeleteBody;
            // Check if username is already taken
            const query = await psqlClient.query("SELECT * FROM bots WHERE id=$1 AND owner_id=$2", [
                body.id,
                user.id
            ]);
            if (query.rows.length === 0) {
                return reply.code(404).send({ error: "Bot not found" });
            }
            await psqlClient.query("DELETE FROM bots WHERE id=$1", [body.id]);
            await psqlClient.query("DELETE FROM users WHERE id=$1", [body.id]);
            await psqlClient.query("DELETE FROM tokens WHERE id=$1", [body.id]);
            return reply.code(204).send();
        }
    );
    server.get("/api/bots", async function handler(request, reply) {
        const user = await getUser(request);

        const query = await psqlClient.query(
            "SELECT bot.id, user.username FROM bots bot JOIN users user ON bot.id = user.id WHERE bot.owner_id = $1",
            [user.id]
        );
        return reply.code(200).send({ bots: query.rows });
    });
}

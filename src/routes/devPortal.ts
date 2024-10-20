import test from "node:test";
import { server } from "../server";
import { psqlClient } from "../utils/database";
import { config } from "../config";
import { compare, genSalt, hash } from "bcrypt";
import { generateID, generateToken } from "../utils/ids";
import { checkForBannedWords } from "../utils/moderate";
import { sendEmail } from "../utils/email";
import { Role } from "../utils/types";

export function configBotRoutes() {
    type BotCreateBody = {
        username: string;
    };
    server.post("/api/bots", async function handler(request, reply) {
        try {
            // Data validation
            const body = request.body as BotCreateBody;
            if (!body.username) {
                return reply.code(400).send({ error: "Bad Request" });
            }
            // Check if username is already taken
            const query = await psqlClient.query("SELECT username FROM users WHERE username=$1", [
                body.username
            ]);
            if (query.rows.length > 0) {
                return reply.code(400).send({ error: "Username already exists" });
            }
            if (
                body.username.length > 30 ||
                body.username.length < 1 ||
                !checkForBannedWords(body.username)
            ) {
                return reply
                    .code(400)
                    .send({ error: "Username is too long or contains banned words" });
            }
            const futureBotID = generateID();
            await psqlClient.query("INSERT INTO bots (id, owner_id) VALUES ($1, $2)", [
                futureBotID,
                (request.params as any).dbUser.id
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
        } catch (e) {
            console.error(e);
            return reply.code(500).send({ error: "Internal Server Error" });
        }
    });
    type BotDeleteBody = {
        id: string;
    };
    server.delete("/api/bots", async function handler(request, reply) {
        try {
            // Data validation
            const body = request.body as BotDeleteBody;
            if (!body.id) {
                return reply.code(400).send({ error: "Bad Request" });
            }
            // Check if username is already taken
            const query = await psqlClient.query("SELECT * FROM bots WHERE id=$1 AND owner_id=$2", [
                body.id,
                (request.params as any).dbUser.id
            ]);
            if (query.rows.length === 0) {
                return reply
                    .code(400)
                    .send({ error: "Either the bot doesn't exist, or you don't own it" });
            }
            await psqlClient.query("DELETE FROM bots WHERE id=$1", [body.id]);
            await psqlClient.query("DELETE FROM users WHERE id=$1", [body.id]);
            await psqlClient.query("DELETE FROM tokens WHERE id=$1", [body.id]);
            return reply.code(204).send();
        } catch (e) {
            console.error(e);
            return reply.code(500).send({ error: "Internal Server Error" });
        }
    });
    server.get("/api/bots", async function handler(request, reply) {
        try {
            const query = await psqlClient.query(
                "SELECT b.id, u.username FROM bots b JOIN users u ON b.id = u.id WHERE b.owner_id = $1",
                [(request.params as any).dbUser.id]
            );
            return reply.code(200).send(query.rows);
        } catch (e) {
            console.error(e);
            return reply.code(500).send({ error: "Internal Server Error" });
        }
    });
}

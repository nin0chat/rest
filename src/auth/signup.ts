import test from "node:test";
import { server } from "../server";
import { psqlClient } from "../utils/database";
import { config } from "../config";
import { genSalt, hash } from "bcrypt";
import { generateID, generateToken } from "../utils/ids";
import { checkForBannedWords } from "../utils/moderate";
import { sendEmail } from "../utils/email";

export function configSignupRoutes() {
    type SignupBody = {
        username: string;
        email: string;
        password: string;
        turnstileKey: string;
    };
    server.post("/api/auth/signup", async function handler(request, reply) {
        try {
            // Data validation
            const body = request.body as SignupBody;
            if (
                !body.username ||
                !body.email ||
                !body.password ||
                !body.turnstileKey ||
                !body.email.match(/^.+@.+\..+$/)
            ) {
                return reply.code(400).send({ error: "Bad Request" });
            }
            // Check if username or email is already taken
            const query = await psqlClient.query(
                "SELECT username, email FROM users WHERE username=$1 OR email=$2",
                [body.username, body.email]
            );
            if (query.rows.length > 0) {
                return reply.code(400).send({ error: "Email or username already exists" });
            }
            // Validate CAPTCHA
            let testMode = false;
            if (
                body.email.endsWith("@nin0.dev") &&
                body.turnstileKey === "1x00000000000000000000AA"
            ) {
                testMode = true;
            }
            const turnstileReq = await fetch(
                "https://challenges.cloudflare.com/turnstile/v0/siteverify",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        response: body.turnstileKey,
                        secret: testMode
                            ? "1x0000000000000000000000000000000AA"
                            : config.turnstileSecret
                    })
                }
            );
            const res = await turnstileReq.json();
            if (!res.success) {
                return reply.code(400).send({ error: "CAPTCHA isn't passed / is expired" });
            }
            if (body.username.length > 30 || !checkForBannedWords(body.username)) {
                return reply
                    .code(400)
                    .send({ error: "Username is too long or contains banned words" });
            }
            // Hash password
            const salt = await genSalt();
            const hashedPassword = await hash(body.password, salt);
            const newUserID = generateID();
            // Insert user into database
            await psqlClient.query(
                "INSERT INTO users (id, username, email, password)  VALUES ($1, $2, $3, $4)",
                [newUserID, body.username, body.email, hashedPassword]
            );
            const emailToken = generateToken();
            await psqlClient.query("INSERT INTO email_verifications (id, token) VALUES ($1, $2)", [
                newUserID,
                emailToken
            ]);
            sendEmail([body.email], "Confirm your nin0chat registration", "7111988", {
                name: body.username,
                confirm_url: `https://chat.nin0.dev/api/confirm?token=${emailToken}`
            });
            return reply.code(200).send({ success: true });
        } catch (e) {
            console.error(e);
            return reply.code(500).send({ error: "Internal Server Error" });
        }
    });

    server.get("/api/confirm", async function handler(request, reply) {
        // Data validation
        if (
            // @ts-ignore
            !request.query.token
        ) {
            return reply.code(400).send({ error: "Bad Request" });
        }
        // @ts-ignore
        const token = request.query.token.replace(" ", "+");
        // Check if token is valid
        const query = await psqlClient.query("SELECT id FROM email_verifications WHERE token=$1", [
            token
        ]);
        if (query.rows.length === 0) {
            return reply.code(400).send({ error: "Invalid token" });
        }
        // Delete token
        await psqlClient.query("DELETE FROM email_verifications WHERE token=$1", [token]);
        await psqlClient.query("UPDATE users SET activated=true WHERE id=$1", [query.rows[0].id]);
        return reply.redirect("https://chat.nin0.dev/login.html?confirmed=true");
    });
}

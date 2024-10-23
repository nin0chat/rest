import { compare, genSalt, hash } from "bcrypt";
import { validateCaptcha } from "../lib/captcha.js";
import { HOSTNAME } from "../lib/constants.js";
import { psqlClient } from "../lib/database.js";
import { RESTError } from "../lib/error.js";
import { server } from "../server.js";
import { sendEmail } from "../utils/email";
import { generateID, generateToken } from "../utils/ids";
import { checkForBannedWords } from "../utils/moderate";

export function configSignupRoutes() {
    type SignupBody = {
        username: string;
        email: string;
        password: string;
        turnstileKey: string;
    };

    server.post(
        "/api/auth/signup",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["username", "email", "password", "turnstileKey"],
                    properties: {
                        username: { type: "string", minLength: 2, maxLength: 30 },
                        email: { type: "string", format: "email" },
                        password: { type: "string" },
                        turnstileKey: { type: "string" }
                    }
                }
            }
        },
        async function handler(request, reply) {
            // Data validation
            const body = request.body as SignupBody;

            // don't do any db operations until captcha is validated
            await validateCaptcha(body.turnstileKey);

            // Check if username or email is already taken
            const query = await psqlClient.query(
                "SELECT username, email FROM users WHERE username=$1 OR email=$2",
                [body.username, body.email]
            );
            if (query.rows.length > 0) {
                throw new RESTError(409, "Username or email already exists");
            }

            if (!checkForBannedWords(body.username)) {
                throw new RESTError(400, "Username contains banned words");
            }

            // Hash password
            const hashedPassword = await hash(body.password, await genSalt());
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

            if (process.env.NODE_ENV !== "development")
                sendEmail([body.email], "Confirm your nin0chat registration", "7111988", {
                    name: body.username,
                    confirm_url: `https://${HOSTNAME}/api/confirm?token=${emailToken}`
                });
            else {
                await psqlClient.query("UPDATE users SET activated=true WHERE id=$1", [newUserID]);
            }

            return reply.code(201).send();
        }
    );

    server.get(
        "/api/confirm",
        {
            schema: {
                querystring: {
                    type: "object",
                    required: ["token"],
                    properties: {
                        token: { type: "string" }
                    }
                }
            }
        },
        async function handler(request, reply) {
            // @ts-ignore
            const token = request.query.token.replace(" ", "+");
            // Check if token is valid
            const query = await psqlClient.query(
                "SELECT id FROM email_verifications WHERE token=$1",
                [token]
            );
            if (query.rows.length === 0) {
                throw new RESTError(404, "Invalid token");
            }
            // Delete token
            await psqlClient.query("DELETE FROM email_verifications WHERE token=$1", [token]);
            await psqlClient.query("UPDATE users SET activated=true WHERE id=$1", [
                query.rows[0].id
            ]);
            return reply.redirect("https://chat.nin0.dev/login.html?confirmed=true");
        }
    );

    type SigninBody = {
        email: string;
        password: string;
    };
    server.post(
        "/api/auth/login",
        {
            schema: {
                body: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: { type: "string", format: "email" },
                        password: { type: "string" }
                    }
                }
            }
        },
        async function handler(request, reply) {
            // Data validation
            const body = request.body as SigninBody;

            // Check if user exists
            const query = await psqlClient.query(
                "SELECT id, password, activated FROM users WHERE email=$1",
                [body.email]
            );
            if (query.rows.length === 0) {
                await new Promise((r) => setTimeout(r, 3000));
                throw new RESTError(403, "Email or password are invalid");
            }
            const verification = await compare(body.password, query.rows[0].password);
            if (!verification) {
                await new Promise((r) => setTimeout(r, 3000));
                throw new RESTError(403, "Email or password are invalid");
            }
            if (!query.rows[0].activated) {
                throw new RESTError(
                    403,
                    "Account not activated, make sure to check your spam inbox for an email"
                );
            }

            // Generate token
            const token = generateToken();
            const hashedToken = await hash(token, await genSalt());
            const seed = Math.floor(Math.random() * (999999 - 100000 + 1)) + 100000;

            await psqlClient.query("INSERT INTO tokens (id, token, seed) VALUES ($1, $2, $3)", [
                query.rows[0].id,
                hashedToken,
                seed
            ]);

            return reply.code(200).send({
                id: query.rows[0].id,
                token: `${query.rows[0].id}.${seed}.${token}`
            });
        }
    );
}

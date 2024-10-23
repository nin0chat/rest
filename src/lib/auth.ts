import { compare } from "bcrypt";
import { FastifyRequest } from "fastify";
import { psqlClient } from "./database.js";
import { RESTError } from "./error.js";
import { Role, User } from "./types.js";

export async function getUser(request: FastifyRequest, requiredRole?: Role): Promise<User> {
    if (!request.headers.authorization) {
        throw new RESTError(401, "Unauthorized");
    }

    const [id, seed, token] = request.headers.authorization.split(".");
    if (!id || !seed || !token) {
        throw new RESTError(401, "Unauthorized");
    }

    const query = await psqlClient.query("SELECT token FROM tokens WHERE id=$1 AND seed=$2", [
        id,
        seed
    ]);
    if (query.rowCount === 0) {
        throw new RESTError(401, "Unauthorized");
    }
    for (const row of query.rows) {
        const verification = await compare(token, row.token);
        if (!verification) {
            throw new RESTError(401, "Unauthorized");
        }
        break;
    }

    const userQuery = await psqlClient.query("SELECT * FROM users WHERE id=$1", [id]);
    if (userQuery.rowCount !== 1) throw new RESTError(401, "User not found");

    const user = userQuery.rows[0];
    if (!user.activated) throw new RESTError(403, "Account not activated");

    if (requiredRole && !(user.role & requiredRole)) {
        throw new RESTError(403, "Missing permissions");
    }

    return {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.role
    };
}

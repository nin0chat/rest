import { randomBytes } from "crypto";

export function generateID(): string {
    return (((BigInt(Date.now()) - 1729373102932n) << 22n) | (1n << 17n) | (1n << 12n) | 0n)
        .toString()
        .padStart(18, "0");
}

export function generateToken(): string {
    return randomBytes(60).toString("base64").replace("+", "");
}

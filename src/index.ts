import "dotenv/config.js";
import { rm, writeFile } from "fs/promises";

(async () => {
    // migrate from config.ts to .env automatically
    if (!process.env.POSTGRES_URL) {
        try {
            const config = await import("./config.js");

            process.env.POSTGRES_URL = `postgresql://${config.config.postgresUser}:${config.config.postgresPassword}@${config.config.postgresHost || "localhost"}:${config.config.postgresPort}/${config.config.postgresDatabase}`;
            process.env.TURNSTILE_SECRET = config.config.turnstileSecret;
            process.env.SMTP2GO_KEY = config.config.smtp2goKey;

            await writeFile(
                "./.env",
                `POSTGRES_URL=${process.env.POSTGRES_URL}\nTURNSTILE_SECRET=${process.env.TURNSTILE_SECRET ?? ""}\nSMTP2GO_KEY=${process.env.SMTP2GO_KEY ?? ""}\nNODE_ENV=${process.env.NODE_ENV ?? "production"}\n# auto-migrated`
            );
            await rm("./src/config.ts");
            await rm("./dist/config.js");
        } catch {}
    }

    const _ = await import("./server.js");
})();

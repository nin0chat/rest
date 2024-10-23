import pg from "pg";

const url = process.env.POSTGRES_URL;

const { Client } = pg;
export const psqlClient = new Client({
    connectionString: url
});
psqlClient.connect();

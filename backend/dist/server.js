"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./config/db");
const env_1 = require("./config/env");
const app_1 = require("./app");
async function start() {
    await (0, db_1.connectDatabase)();
    app_1.app.listen(env_1.env.port, () => {
        console.log(`LiveWell API listening on http://localhost:${env_1.env.port}`);
    });
}
start().catch((error) => {
    console.error(error);
    process.exit(1);
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const env_1 = require("./config/env");
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const expenseRoutes_1 = __importDefault(require("./routes/expenseRoutes"));
const shoppingRoutes_1 = __importDefault(require("./routes/shoppingRoutes"));
const suiteRoutes_1 = __importDefault(require("./routes/suiteRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)({ origin: env_1.env.clientOrigin }));
exports.app.use(express_1.default.json());
exports.app.use((0, morgan_1.default)("dev"));
exports.app.get("/api/health", (_req, res) => {
    res.json({ ok: true, app: "LiveWell API" });
});
exports.app.use("/api/suites", suiteRoutes_1.default);
exports.app.use("/api/users", userRoutes_1.default);
exports.app.use("/api/tasks", taskRoutes_1.default);
exports.app.use("/api/shopping-items", shoppingRoutes_1.default);
exports.app.use("/api/expenses", expenseRoutes_1.default);
exports.app.use("/api/dashboard", dashboardRoutes_1.default);

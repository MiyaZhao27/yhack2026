import cors from "cors";
import express from "express";
import morgan from "morgan";

import { env } from "./config/env";
import dashboardRoutes from "./routes/dashboardRoutes";
import expenseRoutes from "./routes/expenseRoutes";
import shoppingRoutes from "./routes/shoppingRoutes";
import suiteRoutes from "./routes/suiteRoutes";
import taskRoutes from "./routes/taskRoutes";
import userRoutes from "./routes/userRoutes";

export const app = express();

app.use(cors({ origin: env.clientOrigin }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, app: "LiveWell API" });
});

app.use("/api/suites", suiteRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/shopping-items", shoppingRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/dashboard", dashboardRoutes);

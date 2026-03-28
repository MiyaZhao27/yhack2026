import { Router } from "express";

import { getDashboard } from "../controllers/dashboardController";

const router = Router();

router.get("/:suiteId", getDashboard);

export default router;

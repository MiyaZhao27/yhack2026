import { Router } from "express";

import { createSuite, getSuiteById, getSuites } from "../controllers/suiteController";

const router = Router();

router.get("/", getSuites);
router.get("/:id", getSuiteById);
router.post("/", createSuite);

export default router;

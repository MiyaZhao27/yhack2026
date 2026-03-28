"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const suiteController_1 = require("../controllers/suiteController");
const router = (0, express_1.Router)();
router.get("/", suiteController_1.getSuites);
router.get("/:id", suiteController_1.getSuiteById);
router.post("/", suiteController_1.createSuite);
exports.default = router;

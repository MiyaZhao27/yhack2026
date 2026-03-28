"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const expenseController_1 = require("../controllers/expenseController");
const router = (0, express_1.Router)();
router.get("/", expenseController_1.getExpenses);
router.get("/balances/:suiteId", expenseController_1.getBalances);
router.post("/", expenseController_1.createExpense);
exports.default = router;

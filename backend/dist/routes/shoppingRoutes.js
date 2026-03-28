"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const shoppingController_1 = require("../controllers/shoppingController");
const router = (0, express_1.Router)();
router.get("/", shoppingController_1.getShoppingItems);
router.post("/", shoppingController_1.createShoppingItem);
router.patch("/:id", shoppingController_1.updateShoppingItem);
exports.default = router;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getShoppingItems = getShoppingItems;
exports.createShoppingItem = createShoppingItem;
exports.updateShoppingItem = updateShoppingItem;
const ShoppingItem_1 = require("../models/ShoppingItem");
async function getShoppingItems(req, res) {
    const { suiteId } = req.query;
    const items = await ShoppingItem_1.ShoppingItem.find(suiteId ? { suiteId } : {}).sort({ createdAt: -1 }).lean();
    res.json(items);
}
async function createShoppingItem(req, res) {
    const item = await ShoppingItem_1.ShoppingItem.create(req.body);
    res.status(201).json(item);
}
async function updateShoppingItem(req, res) {
    const item = await ShoppingItem_1.ShoppingItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(item);
}

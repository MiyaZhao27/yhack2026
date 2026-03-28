"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShoppingItem = void 0;
const mongoose_1 = require("mongoose");
const shoppingItemSchema = new mongoose_1.Schema({
    suiteId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Suite", required: true },
    name: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    requestedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    category: {
        type: String,
        enum: ["groceries", "cleaning", "household"],
        default: "groceries",
    },
    status: {
        type: String,
        enum: ["needed", "bought"],
        default: "needed",
    },
    boughtBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });
exports.ShoppingItem = (0, mongoose_1.model)("ShoppingItem", shoppingItemSchema);

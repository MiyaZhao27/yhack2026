"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Suite = void 0;
const mongoose_1 = require("mongoose");
const suiteSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    memberIds: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: [] }],
}, { timestamps: true });
exports.Suite = (0, mongoose_1.model)("Suite", suiteSchema);

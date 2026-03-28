"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = getUsers;
exports.createUser = createUser;
const Suite_1 = require("../models/Suite");
const User_1 = require("../models/User");
async function getUsers(req, res) {
    const { suiteId } = req.query;
    const filter = suiteId ? { suiteId } : {};
    const users = await User_1.User.find(filter).lean();
    res.json(users);
}
async function createUser(req, res) {
    const { name, suiteId } = req.body;
    const user = await User_1.User.create({ name, suiteId });
    await Suite_1.Suite.findByIdAndUpdate(suiteId, { $addToSet: { memberIds: user._id } });
    res.status(201).json(user);
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuites = getSuites;
exports.getSuiteById = getSuiteById;
exports.createSuite = createSuite;
const Suite_1 = require("../models/Suite");
const User_1 = require("../models/User");
async function getSuites(_req, res) {
    const suites = await Suite_1.Suite.find().lean();
    res.json(suites);
}
async function getSuiteById(req, res) {
    const suite = await Suite_1.Suite.findById(req.params.id).lean();
    if (!suite) {
        return res.status(404).json({ message: "Suite not found" });
    }
    const members = await User_1.User.find({ suiteId: suite._id }).lean();
    return res.json({ ...suite, members });
}
async function createSuite(req, res) {
    const { name, members } = req.body;
    const suite = await Suite_1.Suite.create({ name, memberIds: [] });
    const createdMembers = await User_1.User.insertMany(members
        .filter(Boolean)
        .map((memberName) => ({
        name: memberName.trim(),
        suiteId: suite._id,
    })));
    suite.memberIds = createdMembers.map((member) => String(member._id));
    await suite.save();
    res.status(201).json({
        ...suite.toObject(),
        members: createdMembers,
    });
}

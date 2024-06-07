"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSchema = void 0;
const zod_1 = require("zod");
exports.userSchema = zod_1.z.object({
    firstname: zod_1.z.string(),
    lastname: zod_1.z.string(),
    email: zod_1.z.string(),
    password: zod_1.z.string(),
});

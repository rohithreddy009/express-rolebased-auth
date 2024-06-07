"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/routes/index.ts
const express_1 = require("express");
const managerRoutes_1 = __importDefault(require("./managerRoutes"));
const clientRoutes_1 = __importDefault(require("./clientRoutes"));
const router = (0, express_1.Router)();
// Mount auth routes
router.use("/api/v1/manager", managerRoutes_1.default);
router.use("/api/v1/client", clientRoutes_1.default);
exports.default = router;

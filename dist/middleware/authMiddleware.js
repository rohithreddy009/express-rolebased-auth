"use strict";
// src/middleware/authMiddleware.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeClient = exports.authorizeManager = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    if (token == null)
        return res.sendStatus(401);
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err)
            return res.sendStatus(403);
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
const authorizeManager = (req, res, next) => {
    if (req.user && req.user.role === "manager") {
        next();
    }
    else {
        res.status(403).json({ message: "Access forbidden: managers only" });
    }
};
exports.authorizeManager = authorizeManager;
const authorizeClient = (req, res, next) => {
    if (req.user && req.user.role === "client") {
        next();
    }
    else {
        res.status(403).json({ message: "Access forbidden: clients only" });
    }
};
exports.authorizeClient = authorizeClient;

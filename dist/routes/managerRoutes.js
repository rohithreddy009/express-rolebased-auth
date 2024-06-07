"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const userSchema_1 = require("../schemas/userSchema");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
//@ts-ignore
const bcrypt_1 = __importDefault(require("bcrypt"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
//@ts-ignore
const nodemailer_1 = __importDefault(require("nodemailer"));
const crypto_1 = __importDefault(require("crypto"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma = new client_1.PrismaClient();
const router = (0, express_1.Router)();
// Nodemailer setup
const transporter = nodemailer_1.default.createTransport({
    service: "Gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
// Rate limiting middleware
const signupLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: "Too many accounts created from this IP, please try again after 15 minutes",
});
/* prettier-ignore */
router.post("/signup", signupLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { firstname, lastname, email, password } = userSchema_1.userSchema.parse(req.body);
        // Check if the user already exists
        const existingUser = yield prisma.managerInfo.findUnique({
            where: { email },
        });
        if (existingUser) {
            return res.status(400).json({
                message: "User with this email already exists",
            });
        }
        // Generate OTP
        const otp = crypto_1.default.randomInt(100000, 999999).toString();
        // Hash the password before storing
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        // Store OTP and user data in a temporary table
        yield prisma.otp.create({
            data: {
                email,
                otp,
                firstname,
                lastname,
                password: hashedPassword,
            },
        });
        // Send OTP to user's email
        yield transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
        });
        res.status(200).json({
            message: "OTP sent to your email. Please verify to complete signup.",
        });
    }
    catch (error) {
        console.error("Error creating user:", error.message);
        res.status(400).json({
            message: "Invalid request body or server error",
        });
    }
}));
// Verify OTP
router.post("/verifyotp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, otp } = req.body;
        // Validate OTP
        const otpRecord = yield prisma.otp.findUnique({
            where: { email_otp: { email, otp } },
        });
        if (!otpRecord) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        // Create a new user
        const user = yield prisma.managerInfo.create({
            data: {
                firstname: otpRecord.firstname,
                lastname: otpRecord.lastname,
                email: otpRecord.email,
                password: otpRecord.password,
            },
        });
        // Generate JWT
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: "manager" }, process.env.JWT_SECRET, { expiresIn: "10m" });
        // Delete the used OTP record
        yield prisma.otp.delete({
            where: { id: otpRecord.id },
        });
        res.status(201).json({
            message: "User created successfully",
            user: {
                id: user.id,
                email: user.email,
                firstname: user.firstname,
                lastname: user.lastname,
            },
            token,
        });
    }
    catch (error) {
        console.error("Error verifying OTP:", error.message);
        res.status(400).json({
            message: "Invalid request body or server error",
        });
    }
}));
// Manager sign-in
router.post("/signin", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        // Find the user by email
        const user = yield prisma.managerInfo.findUnique({
            where: { email },
        });
        // If user doesn't exist or password doesn't match, return error
        if (!user || !(yield bcrypt_1.default.compare(password, user.password))) {
            return res
                .status(401)
                .json({ message: "Invalid email or password" });
        }
        // Generate JWT token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email, role: "manager" }, process.env.JWT_SECRET, { expiresIn: "10m" });
        res.status(200).json({ message: "Sign in successful", token });
    }
    catch (error) {
        console.error("Error signing in:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}));
/* prettier-ignore */
router.post("/passwordchangeotp", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        // Check if the email exists in the database
        const user = yield prisma.managerInfo.findUnique({
            where: { email },
        });
        if (!user) {
            return res
                .status(404)
                .json({ message: "Email doesn't exist in the database" });
        }
        // Generate OTP
        const otp = crypto_1.default.randomInt(100000, 999999).toString();
        // Store OTP in the database
        yield prisma.passwordReset.create({
            data: {
                email,
                otp,
            },
        });
        // Send OTP to user's email
        yield transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your Password Reset OTP",
            text: `Your OTP code is ${otp}. It will expire in 10 minutes.`,
        });
        res.status(200).json({
            message: "OTP sent to your email. Please verify to reset your password.",
        });
    }
    catch (error) {
        console.error("Error sending password reset OTP:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
// Manager OTP verify and password reset
router.post("/otpverify", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, otp, newPassword } = req.body;
        // Validate OTP
        const otpRecord = yield prisma.passwordReset.findUnique({
            where: { email },
        });
        if (!otpRecord || otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid or expired OTP" });
        }
        // Check if OTP has expired
        const otpExpirationTime = new Date(otpRecord.createdAt).getTime() + 10 * 60 * 1000;
        if (Date.now() > otpExpirationTime) {
            return res.status(400).json({ message: "OTP has expired" });
        }
        // Hash the new password
        const hashedPassword = yield bcrypt_1.default.hash(newPassword, 10);
        // Update user's password
        yield prisma.managerInfo.update({
            where: { email },
            data: { password: hashedPassword },
        });
        // Delete the used OTP record
        yield prisma.passwordReset.delete({
            where: { email },
        });
        res.status(200).json({ message: "Password reset successful" });
    }
    catch (error) {
        console.error("Error resetting password:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
}));
/* prettier-ignore */
router.get("/protected", authMiddleware_1.authenticateToken, authMiddleware_1.authorizeManager, (req, res) => {
    res.status(200).json({
        message: "This is a protected route for managers only",
    });
});
exports.default = router;

import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getKOTs } from "../controllers/kotController.js";

const router = express.Router();

router.get("/", authMiddleware(["admin", "manager", "staff"]), getKOTs);

export default router;

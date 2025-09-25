import express from "express";
import { createUser, findUsers } from "../controllers/userController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware(["super-admin", "admin"]), createUser);
router.get("/", authMiddleware(["super-admin", "admin", "manager"]), findUsers);

export default router;

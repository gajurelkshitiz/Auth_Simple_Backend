import express from "express";
import {
  createManager,
  getManagers,
  getManagerById,
  updateManager,
  deleteManager,
  loginManager,
} from "../controllers/managerController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware(["admin"]), createManager);
router.post("/login", loginManager);
router.get("/", authMiddleware(["admin"]), getManagers);
router.get("/:id", authMiddleware(["admin"]), getManagerById);
router.put("/:id", authMiddleware(["admin"]), updateManager);
router.delete("/:id", authMiddleware(["admin"]), deleteManager);

export default router;

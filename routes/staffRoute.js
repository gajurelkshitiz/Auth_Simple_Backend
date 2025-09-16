import express from "express";
import {
  createStaff,
  getStaffs,
  getStaffById,
  updateStaff,
  deleteStaff,
  loginStaff,
} from "../controllers/staffController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", authMiddleware(["admin", "manager"]), createStaff);
router.post("/login", loginStaff);
router.get("/", authMiddleware(["admin", "manager"]), getStaffs);
router.get("/:id", authMiddleware(["admin", "manager"]), getStaffById);
router.put("/:id", authMiddleware(["admin", "manager"]), updateStaff);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteStaff);

export default router;

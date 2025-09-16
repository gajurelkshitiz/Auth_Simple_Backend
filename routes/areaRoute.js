import express from "express";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/upload.js";
import {
  createArea,
  getAreas,
  getAreaById,
  updateArea,
  deleteArea,
} from "../controllers/areaController.js";

const router = express.Router();

router.post(
  "/",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  createArea
);
router.get("/", authMiddleware(["admin", "manager"]), getAreas);
router.get("/:id", authMiddleware(["admin", "manager"]), getAreaById);
router.put(
  "/:id",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  updateArea
);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteArea);

export default router;

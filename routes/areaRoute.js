import express from "express";
import {
  createArea,
  getAreas,
  getAreaById,
  updateArea,
  deleteArea,
} from "../controllers/areaController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { upload } from "../middleware/uploads.js";

const router = express.Router();

router.get("/", authMiddleware(["admin", "manager", "staff"]), getAreas);
router.get("/:id", authMiddleware(["admin", "manager", "staff"]), getAreaById);

router.post(
  "/",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  createArea
);
router.put(
  "/:id",
  authMiddleware(["admin", "manager"]),
  upload.single("image"),
  updateArea
);
router.delete("/:id", authMiddleware(["admin", "manager"]), deleteArea);

export default router;

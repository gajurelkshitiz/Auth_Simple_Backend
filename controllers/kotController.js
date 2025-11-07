import KOT from "../models/kot.js";
import { emitToRestaurant } from "../utils/socket.js";

export const getKOTs = async (req, res) => {
  try {
    const restaurantId = req.user?.restaurantId;
    if (!restaurantId) {
      return res.status(400).json({ error: "Restaurant context missing" });
    }

    const kots = await KOT.find({ restaurant: restaurantId })
      .populate("table", "name")
      .populate("order", "orderId")
      .sort({ createdAt: -1 });

    res.status(200).json({ kots });
  } catch (err) {
    console.error("[KOT getKOTs]", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

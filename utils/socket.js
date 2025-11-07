export const emitToRestaurant = (req, restaurantId, event, payload = {}) => {
  if (!req?.app) return;
  try {
    const io = req.app.get("io");
    if (io && restaurantId) {
      io.to(restaurantId.toString()).emit(event, payload);
    }
  } catch (err) {
    console.warn(`[WS EMIT FAILED] ${event} to ${restaurantId}:`, err.message);
  }
};

export const emitToAll = (req, event, payload = {}) => {
  if (!req?.app) return;
  try {
    const io = req.app.get("io");
    if (io) {
      io.emit(event, payload);
    }
  } catch (err) {
    console.warn(`[WS BROADCAST FAILED] ${event}:`, err.message);
  }
};

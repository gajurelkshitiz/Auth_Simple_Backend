import { io as importedIo } from "../index.js";

export const emitToRestaurant = (req, restaurantId, event, payload = {}) => {
  console.log(` DEBUG: emitToRestaurant called: ${event}`);
  console.log(` DEBUG: req?.app exists: ${!!req?.app}`);
  console.log(` DEBUG: req?.app?.get("io"): ${!!req?.app?.get("io")}`);
  console.log(` DEBUG: importedIo exists: ${!!importedIo}`);

  try {
    const io = req?.app?.get("io") || importedIo;

    if (io && restaurantId) {
      io.to(restaurantId.toString()).emit(event, payload);
      console.log(`[SOCKET] ${event} to restaurant ${restaurantId}`);
    } else {
      console.warn(
        ` [SOCKET] Cannot emit ${event}: io=${!!io}, restaurantId=${restaurantId}`
      );
    }
  } catch (err) {
    console.warn(`[SOCKET ERROR] ${event}:`, err.message);
  }
};

export const emitToAll = (req, event, payload = {}) => {
  try {
    const io = req?.app?.get("io") || importedIo;
    if (io) {
      io.emit(event, payload);
      console.log(` [SOCKET] ${event} to all clients`);
    } else {
      console.warn(` [SOCKET] Cannot emit ${event}: io not available`);
    }
  } catch (err) {
    console.warn(`[WS BROADCAST FAILED] ${event}:`, err.message);
  }
};

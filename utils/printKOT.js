import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const printKOT = async (kot) => {
  try {
    const tableName = kot.table?.name || "Unknown Table";
    const orderId = kot.order?._id?.toString().slice(-6).toUpperCase();
    const kotType = kot.type?.toUpperCase() || "KOT";
    const time = new Date().toLocaleString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    let text = "";

    text += "********************************\n";
    text += `       KITCHEN ORDER TICKET\n`;
    text += "********************************\n";
    text += `Table : ${tableName}\n`;
    text += `Order : ${orderId}\n`;
    text += `Type  : ${kotType}\n`;
    text += `Time  : ${time}\n`;
    text += "--------------------------------\n";

    if (kot.note && kot.note.trim() !== "") {
      text += `NOTE: ${kot.note.trim()}\n`;
      text += "--------------------------------\n";
    }

    const addedItems = kot.items.filter((it) => it.changeType === "ADDED");
    const voidedItems = kot.items.filter((it) => it.changeType === "VOIDED");
    const updatedItems = kot.items.filter((it) => it.changeType === "UPDATED");

    const printItemLine = (label, it) => {
      const name = it.name?.toUpperCase() || "Unnamed Item";
      const qty = it.quantity;
      const oldQty = it.oldQuantity;
      const unit = it.unit || "";

      if (label === "UPDATED") {
        return `UPDATED : ${name} ${oldQty} -> ${qty} ${unit}\n`;
      } else {
        return `${label.padEnd(7)}: ${name} (${unit}) x${qty}\n`;
      }
    };

    if (addedItems.length > 0) {
      text += "---- ADDED ITEMS ----\n";
      addedItems.forEach((it) => (text += printItemLine("ADDED", it)));
      text += "---------------------\n";
    }

    if (voidedItems.length > 0) {
      text += "---- CANCELLED ITEMS ----\n";
      voidedItems.forEach((it) => (text += printItemLine("CANCEL", it)));
      text += "-------------------------\n";
    }

    if (updatedItems.length > 0) {
      text += "---- UPDATED ITEMS ----\n";
      updatedItems.forEach((it) => (text += printItemLine("UPDATED", it)));
      text += "----------------------\n";
    }

    text += "********************************\n";
    text += "     PLEASE PREPARE IMMEDIATELY\n";
    text += "********************************\n\n\n";

    const printDir = path.join(__dirname, "../prints");
    if (!fs.existsSync(printDir)) fs.mkdirSync(printDir, { recursive: true });

    const filePath = path.join(printDir, `kot_${Date.now()}.txt`);
    fs.writeFileSync(filePath, text, "utf8");

    exec(`lp "${filePath}"`, (err) => {
      if (err) {
        console.error("[KOT print error]", err.message);
      } else {
        console.log(`🖨️  KOT printed for ${tableName}`);
      }
    });
  } catch (err) {
    console.error("[printKOT] error:", err.message);
  }
};

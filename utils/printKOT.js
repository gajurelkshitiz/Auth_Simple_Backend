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

    // Separate change types
    const addedItems = kot.items.filter((it) => it.changeType === "ADDED");
    const voidedItems = kot.items.filter((it) => it.changeType === "VOIDED");
    const updatedItems = kot.items.filter(
      (it) =>
        it.changeType === "UPDATED" ||
        it.changeType === "REDUCED" ||
        it.changeType === "INCREASED"
    );

    const printItemLine = (label, it) => {
      const name = it.name?.toUpperCase() || "Unnamed Item";
      const qty = it.quantity;
      const oldQty = it.oldQuantity || 0;
      const unit = it.unitName || "";
      const unitText = unit ? `(${unit})` : "";

      switch (label) {
        case "ADDED":
          return `ADDED   : ${name} ${unitText} x${qty}\n`;
        case "CANCEL":
          return `CANCEL  : ${name} ${unitText} x${qty}\n`;
        case "REDUCED":
          const reduced = oldQty - qty;
          return `REDUCED : ${name} -${reduced} ${unitText} ${oldQty} -> ${qty}\n`;
        case "INCREASED":
          const increased = qty - oldQty;
          return `INCREASED : ${name} +${increased} ${unitText} ${oldQty} -> ${qty}\n`;
        case "UPDATED":
          if (qty < oldQty) return printItemLine("REDUCED", it);
          if (qty > oldQty) return printItemLine("INCREASED", it);
          return null;
        default:
          return null;
      }
    };

    if (addedItems.length > 0) {
      text += "---- ADDED ITEMS ----\n";
      addedItems.forEach((it) => {
        const line = printItemLine("ADDED", it);
        if (line) text += line;
      });
      text += "---------------------\n";
    }

    if (voidedItems.length > 0) {
      text += "---- CANCELLED ITEMS ----\n";
      voidedItems.forEach((it) => {
        const line = printItemLine("CANCEL", it);
        if (line) text += line;
      });
      text += "-------------------------\n";
    }

    if (updatedItems.length > 0) {
      text += "---- UPDATED ITEMS ----\n";
      updatedItems.forEach((it) => {
        const line =
          printItemLine(it.changeType, it) || printItemLine("UPDATED", it);
        if (line) text += line;
      });
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

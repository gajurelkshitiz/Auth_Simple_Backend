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
    const cancelledItems = kot.items.filter(
      (it) => it.changeType === "VOIDED" || it.changeType === "CANCELLED"
    );
    const changedItems = kot.items.filter(
      (it) => it.changeType === "REDUCED" || it.changeType === "INCREASED"
    );

    const printItemLine = (label, it) => {
      const name = it.name?.toUpperCase() || "Unnamed Item";
      const qty = it.quantity;
      const oldQty = it.oldQuantity || 0;
      const unit = it.unitName || "";
      const unitText = unit ? `(${unit})` : "";

      switch (label) {
        case "ADDED":
          return `ADDED    : ${name} ${unitText} x${qty}\n`;
        case "CANCELLED":
          return `CANCELLED: ${name} ${unitText} x${qty}\n`;
        case "REDUCED":
          return `REDUCED  : ${name} -${oldQty - qty} ${unitText}\n`;
        case "INCREASED":
          return `INCREASED: ${name} +${qty - oldQty} ${unitText}\n`;
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

    if (cancelledItems.length > 0) {
      text += "---- CANCELLED ITEMS ----\n";
      cancelledItems.forEach((it) => {
        const line = printItemLine("CANCELLED", it);
        if (line) text += line;
      });
      text += "-------------------------\n";
    }

    if (changedItems.length > 0) {
      text += "---- CHANGED ITEMS ----\n";
      changedItems.forEach((it) => {
        const line = printItemLine(it.changeType, it);
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

import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

export const printKOT = (kot) => {
  const dir = path.join(process.cwd(), "prints");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileName = `KOT_${kot._id}.pdf`;
  const filePath = path.join(dir, fileName);

  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));

  doc
    .fontSize(16)
    .text(`KITCHEN ORDER TICKET (${kot.type})`, { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Table: ${kot.table.name}`);
  doc.text(`Order ID: ${kot.order.orderId}`);
  doc.text(`Created At: ${new Date(kot.createdAt).toLocaleString()}`);
  doc.moveDown();
  doc.text("Items:", { underline: true });

  // Updated loop
  kot.items.forEach((it) => {
    if (it.oldQuantity) {
      doc.text(
        `• ${it.name} (${it.unitName}) ${it.oldQuantity} → ${it.quantity}`
      );
    } else {
      doc.text(`• ${it.name} (${it.unitName}) x${it.quantity}`);
    }
  });

  doc.end();
  return filePath;
};

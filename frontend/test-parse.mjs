import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const data = new Uint8Array(fs.readFileSync("/tmp/test.pdf"));
try {
  const doc = await pdfjsLib.getDocument({ data, disableWorker: true, isEvalSupported: false }).promise;
  console.log("numPages", doc.numPages);
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  console.log("text:", content.items.map((i) => i.str).join(" "));
} catch (err) {
  console.error("PARSE ERROR:", err.message);
  process.exit(1);
}

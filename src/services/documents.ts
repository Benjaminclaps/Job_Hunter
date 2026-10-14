import fs from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { strFromU8, unzipSync } from "fflate";
import { PDFParse } from "pdf-parse";
import { getDatabase } from "@/db";
import { documents } from "@/db/schema";
import { resolveDocumentsDirectory } from "@/lib/config";
import { recordActivity } from "./activity";
import { DEFAULT_PROFILE_ID, ensureDefaults } from "./defaults";

const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text.trim();
    } finally {
      await parser.destroy();
    }
  }
  const archive = unzipSync(new Uint8Array(buffer));
  const documentXml = archive["word/document.xml"];
  if (!documentXml) throw new Error("El DOCX no contiene un documento válido.");
  return strFromU8(documentXml)
    .replace(/<w:tab\s*\/?>/g, "\t")
    .replace(/<w:br\s*\/?>/g, "\n")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function storeDocument(file: File) {
  ensureDefaults();
  if (!allowedTypes.has(file.type)) throw new Error("Solo se aceptan archivos PDF o DOCX.");
  if (file.size > 10 * 1024 * 1024) throw new Error("El archivo supera el límite de 10 MB.");
  const buffer = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  const extension = file.type === "application/pdf" ? ".pdf" : ".docx";
  const directory = resolveDocumentsDirectory();
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const id = randomUUID();
  const storedPath = path.join(directory, `${id}${extension}`);
  fs.writeFileSync(storedPath, buffer, { mode: 0o600, flag: "wx" });
  try {
    const extractedText = await extractText(buffer, file.type);
    getDatabase().db.insert(documents).values({
      id,
      profileId: DEFAULT_PROFILE_ID,
      kind: "cv",
      originalName: path.basename(file.name),
      storedPath,
      mimeType: file.type,
      sha256,
      extractedText,
    }).run();
    recordActivity({ kind: "document.uploaded", title: `CV cargado: ${path.basename(file.name)}`, entityType: "document", entityId: id, actor: "user" });
    return { id, originalName: path.basename(file.name), extractedText, reviewed: false };
  } catch (error) {
    fs.unlinkSync(storedPath);
    throw error;
  }
}

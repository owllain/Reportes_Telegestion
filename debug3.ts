import * as fs from "fs";
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";

async function run() {
  const csvFilePath1 = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Base claro/notificamecr69ab030fce7edb61181dea8b.csv";
  const xlsxFilePath = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Reporte/REPORTE SMS DE SEGURIDAD 05-03-2026.xlsx";

  const csvBuffer = fs.readFileSync(csvFilePath1);
  const csvRecordsRaw = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  const baseWorkbook = new ExcelJS.Workbook();
  await baseWorkbook.xlsx.load(fs.readFileSync(xlsxFilePath) as any);
  const baseSheet = baseWorkbook.worksheets[0];

  const baseData: any[] = [];
  baseSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; 
    let telefono = row.getCell(1).text || "";
    let mensaje = row.getCell(2).text || "";
    if (telefono) {
      baseData.push({ Telefono1: telefono.trim(), Mensaje: mensaje.trim() });
    }
  });

  const targetFromCSV = csvRecordsRaw.find((r:any) => r.Destino?.includes("60632108"));
  const targetFromXLSX = baseData.find((r:any) => r.Telefono1.includes("60632108"));

  function normalizeMessage(msg: any) {
    if (!msg) return "";
    return msg.toString()
      .replace(/\r?\n|\r/g, " ") // Reemplazar saltos de línea por espacios
      .trim()
      .replace(/[.,;:]+$/, "")   // Eliminar puntos, comas, etc. al final
      .replace(/\s+/g, " ");     // Normalizar múltiples espacios a uno solo
  }

  const normalizedCSV = normalizeMessage(targetFromCSV?.Mensaje);
  const normalizedXLSX = normalizeMessage(targetFromXLSX?.Mensaje);

  const output = {
      fromCSV: targetFromCSV,
      fromXLSX: targetFromXLSX,
      normalizedCSV,
      normalizedXLSX,
      matches: normalizedCSV === normalizedXLSX
  };

  fs.writeFileSync("debug-output.json", JSON.stringify(output, null, 2), "utf-8");
}

run().catch(console.error);

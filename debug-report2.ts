import * as fs from "fs";
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";

async function run() {
  const csvFilePath1 = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Base claro/notificamecr69ab030fce7edb61181dea8b.csv";
  const csvFilePath2 = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Base claro/notificamecr69ad833fae4e0e4e16264cb2.csv";
  const xlsxFilePath = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Reporte/REPORTE SMS DE SEGURIDAD 05-03-2026.xlsx";

  let csvBuffer = fs.readFileSync(csvFilePath1);
  const str = csvBuffer.toString("utf-8");
  if (!str.includes("60632108")) {
      csvBuffer = fs.readFileSync(csvFilePath2);
      process.stdout.write("Using second CSV...\n");
  } else {
      process.stdout.write("Using first CSV...\n");
  }

  const xlsxBuffer = fs.readFileSync(xlsxFilePath);

  const csvRecordsRaw = parse(csvBuffer, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    trim: true,
  });

  const csvRecords = csvRecordsRaw.map((record: any) => {
    let fecha = record.Fecha || "";
    let hora = record[""] || record.Hora || ""; 
    if ((!hora || hora === "") && fecha.includes(" ")) {
      const parts = fecha.split(" ");
      fecha = parts[0];
      hora = parts[1];
    }
    return {
      Destino: record.Destino,
      Mensaje: record.Mensaje,
      "Total Enviados": record["Total Enviados"],
      Estado: record.Estado
    };
  });

  const baseData: { Telefono1: string; Mensaje: string }[] = [];
  const baseWorkbook = new ExcelJS.Workbook();
  await baseWorkbook.xlsx.load(xlsxBuffer as any);
  const baseSheet = baseWorkbook.worksheets[0];

  baseSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; 
    let telefono = row.getCell(1).text || "";
    let mensaje = row.getCell(2).text || "";

    if (telefono) {
      baseData.push({ Telefono1: telefono.trim(), Mensaje: mensaje.trim() });
    }
  });

  process.stdout.write("Base XLSX lines parsed: " + baseData.length + "\n");
  
  const find60632108 = baseData.find(d => d.Telefono1.includes("60632108"));
  if (find60632108) {
      process.stdout.write("Found 60632108 in Base XLSX (Reporte): " + JSON.stringify(find60632108).replace(/\r/g,"\\r").replace(/\n/g,"\\n") + "\n");
  } else {
      process.stdout.write("60632108 NOT FOUND IN BASE XLSX\n");
  }

  const find60632108_csv = csvRecords.find((d:any) => d.Destino?.includes("60632108"));
  if (find60632108_csv) {
      process.stdout.write("Found 60632108 in CSV (Base claro): " + JSON.stringify(find60632108_csv).replace(/\r/g,"\\r").replace(/\n/g,"\\n") + "\n");
  } else {
      process.stdout.write("60632108 NOT FOUND IN CSV\n");
  }

  const telefonosBase = new Set(
    baseData.map((d) => d.Telefono1.startsWith("506") ? d.Telefono1 : "506" + d.Telefono1)
  );
  
  const mensajesBaseMap = new Map(
    baseData.map((d) => {
      const tel = d.Telefono1.startsWith("506") ? d.Telefono1 : "506" + d.Telefono1;
      return [tel, d.Mensaje];
    })
  );

  let exactMatches = 0;
  let mismatchDetails: any[] = [];
  
  let filteredRows = csvRecords.filter((row: any) => {
    const destino = row.Destino?.toString().trim();
    if (telefonosBase.has(destino)) {
      const expectedMsg = mensajesBaseMap.get(destino);
      const currentMsg = row.Mensaje?.toString().replace(/\r?\n|\r/g, " ").trim();
      const normalizedExpected = expectedMsg?.toString().replace(/\r?\n|\r/g, " ").trim();

      if (normalizedExpected && currentMsg === normalizedExpected) {
          exactMatches++;
          return true;
      } else {
          mismatchDetails.push({ destino, currentMsg, normalizedExpected });
          return false;
      }
    }
    return false;
  });

  process.stdout.write("filteredRows using message validation: " + filteredRows.length + "\n");
  process.stdout.write("Exact message matches: " + exactMatches + "\n");
  
  if (mismatchDetails.length > 0) {
      process.stdout.write("Message mismatches for phones that exist in Base (first 5):\n");
      mismatchDetails.slice(0, 5).forEach(m => {
          process.stdout.write(` Phone: ${m.destino}\n`);
          process.stdout.write(` CSV (Claro) msg:  "${m.currentMsg?.replace(/\r/g,"\\r").replace(/\n/g,"\\n")}"\n`);
          process.stdout.write(` XLSX (Base) msg:  "${m.normalizedExpected?.replace(/\r/g,"\\r").replace(/\n/g,"\\n")}"\n`);
      });
  }

  if (filteredRows.length === 0) {
    process.stdout.write("Fallback activated! Filtering ONLY by phone number.\n");
    filteredRows = csvRecords.filter((row: any) => {
      const destino = row.Destino?.toString().trim();
      return telefonosBase.has(destino);
    });
    process.stdout.write("filteredRows after fallback: " + filteredRows.length + "\n");
  }
}

run().catch(e => {
    process.stdout.write("ERROR: " + e.message + "\n");
});

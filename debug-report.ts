import * as fs from "fs";
import * as path from "path";
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";

async function run() {
  const csvFilePath1 = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Base claro/notificamecr69ab030fce7edb61181dea8b.csv";
  const csvFilePath2 = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Base claro/notificamecr69ad833fae4e0e4e16264cb2.csv";
  
  const xlsxFilePath = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Reporte/REPORTE SMS DE SEGURIDAD 05-03-2026.xlsx";

  // Let's test with csvFilePath1 first. If 60632108 is there, great.
  let csvBuffer: Buffer;
  let useCsv2 = false;
  try {
     csvBuffer = fs.readFileSync(csvFilePath1);
     const str = csvBuffer.toString("utf-8");
     if (!str.includes("60632108")) {
         useCsv2 = true;
     }
  } catch(e) { /* ignore */ }
  
  if (useCsv2) {
      console.log("Using second CSV...");
      csvBuffer = fs.readFileSync(csvFilePath2);
  } else {
      console.log("Using first CSV...");
  }

  const xlsxBuffer = fs.readFileSync(xlsxFilePath);

  // 1. Process CSV
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
      Fecha: fecha,
      Hora: hora,
      Destino: record.Destino,
      Mensaje: record.Mensaje,
      Usuario: record.Usuario,
      "Total Enviados": record["Total Enviados"],
      Estado: record.Estado,
      originalRow: record
    };
  });

  // 2. Process XLSX
  const baseData: { Telefono1: string; Mensaje: string }[] = [];
  const baseWorkbook = new ExcelJS.Workbook();
  await baseWorkbook.xlsx.load(xlsxBuffer as any);
  const baseSheet = baseWorkbook.worksheets[0];

  baseSheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; 

    // console.log("Row cells:", row.getCell(1).value, row.getCell(2).value);
    const cell1 = row.getCell(1).value;
    const cell2 = row.getCell(2).value;

    let telefono = "";
    if (typeof cell1 === "object" && cell1 !== null && "richText" in cell1) {
        telefono = cell1.richText.map((t:any) => t.text).join("").trim();
    } else if (cell1 !== undefined && cell1 !== null) {
        telefono = cell1.toString().trim();
    }

    let mensaje = "";
    if (typeof cell2 === "object" && cell2 !== null && "richText" in cell2) {
        mensaje = cell2.richText.map((t:any) => t.text).join("").trim();
    } else if (cell2 !== undefined && cell2 !== null) {
        mensaje = cell2.toString().trim();
    }


    if (telefono) {
      baseData.push({
        Telefono1: telefono,
        Mensaje: mensaje,
      });
    }
  });

  console.log("Base XLSX lines parsed:", baseData.length);
  const find60632108 = baseData.find(d => d.Telefono1.includes("60632108"));
  if (find60632108) {
      console.log("Found 60632108 in Base:", find60632108);
  } else {
      console.log("60632108 NOT FOUND IN BASE XLSX!");
  }

  const telefonosBase = new Set(
    baseData.map((d) =>
      d.Telefono1.startsWith("506") ? d.Telefono1 : "506" + d.Telefono1,
    ),
  );
  
  const mensajesBaseMap = new Map(
    baseData.map((d) => {
      const tel = d.Telefono1.startsWith("506")
        ? d.Telefono1
        : "506" + d.Telefono1;
      return [tel, d.Mensaje];
    }),
  );

  console.log("Base set has size:", telefonosBase.size);

  let exactMatches = 0;
  let mismatchDetails: any[] = [];
  
  let filteredRows = csvRecords.filter((row: any) => {
    const destino = row.Destino?.toString().trim();
    if (telefonosBase.has(destino)) {
      const expectedMsg = mensajesBaseMap.get(destino);
      const currentMsg = row.Mensaje?.toString()
        .replace(/\r?\n|\r/g, " ")
        .trim();
      const normalizedExpected = expectedMsg
        ?.toString()
        .replace(/\r?\n|\r/g, " ")
        .trim();

      if (normalizedExpected && currentMsg === normalizedExpected) {
          exactMatches++;
          return true;
      } else {
          mismatchDetails.push({
              destino,
              currentMsg,
              normalizedExpected
          });
          return false;
      }
    }
    return false;
  });

  console.log("filteredRows using message validation:", filteredRows.length);
  console.log("Exact message matches:", exactMatches);
  
  // Show the issues
  if (mismatchDetails.length > 0) {
      console.log("Message mismatches for phones that exist in Base:");
      mismatchDetails.slice(0, 5).forEach(m => {
          console.log(`\nPhone: ${m.destino}`);
          console.log(`CSV Report text:   "${m.currentMsg}"`);
          console.log(`Base Report text:  "${m.normalizedExpected}"`);
      });
  }

  if (filteredRows.length === 0) {
    console.log("Fallback activated...");
    filteredRows = csvRecords.filter((row: any) => {
      const destino = row.Destino?.toString().trim();
      return telefonosBase.has(destino);
    });
    console.log("filteredRows after fallback:", filteredRows.length);
  }

}

run().catch(console.error);

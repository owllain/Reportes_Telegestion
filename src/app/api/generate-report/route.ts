import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";
import JSZip from "jszip";

// Dev: Alvaro Enrique Cascante Moraga
// Fecha: 05-03-2026
// Commit: Endpoint de API principal responsable de recibir formData, procesar en memoria arrays cruzados y retornar Buffer XLSX
export async function POST(req: NextRequest) {
  let formData: FormData;
  
  // 1. Manejo robusto del parseo de FormData para detectar bloqueos de red corporativa
  try {
    formData = await req.formData();
  } catch (err) {
    console.error("Error crítico al parsear FormData corporativo:", err);
    return NextResponse.json(
      { 
        error: "La red corporativa o el tamaño de los archivos impidió completar la subida masiva. " +
               "Este error suele ocurrir cuando el Firewall bloquea peticiones de gran tamaño. " +
               "Intenta subir menos archivos simultáneamente o verifica tu conexión."
      },
      { status: 413 } // Payload Too Large o similar
    );
  }

  try {
    const csvFile = formData.get("csvFile") as File;
    const xlsxFiles = formData.getAll("xlsxFiles") as File[];
    const responsible = formData.get("responsible") as string;
    const reflection = formData.get("reflection") as string;

    if (!csvFile || xlsxFiles.length === 0) {
      return NextResponse.json(
        { error: "Se requieren el archivo CSV de reporte claro y al menos un archivo base (XLSX/CSV)" },
        { status: 400 },
      );
    }

    if (!responsible || !reflection) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (encargado o reflejo)" },
        { status: 400 },
      );
    }

    // Procesar CSV una sola vez para todo el lote
    const csvBuffer = Buffer.from(await csvFile.arrayBuffer());
    const csvRecordsRaw = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });

    console.log(`[Batch] Iniciando proceso para ${xlsxFiles.length} archivos usando un CSV de ${csvRecordsRaw.length} registros.`);

    // Función interna de normalización (reutilizada)
    function normalizeMessage(msg: any) {
      if (!msg) return "";
      return msg.toString()
        .replace(/\r?\n|\r/g, " ")
        .trim()
        .replace(/[.,;:]+$/, "")
        .replace(/\s+/g, " ");
    }

    const csvRecords = csvRecordsRaw.map((record: any) => {
      let fecha = record.Fecha || "";
      let hora = record[""] || record.Hora || "";
      if ((!hora || hora === "") && fecha.includes(" ")) {
        const parts = fecha.split(" ");
        fecha = parts[0];
        hora = parts[1];
      }
      return {
        ...record,
        Fecha: fecha,
        Hora: hora,
        Destino: record.Destino?.toString().trim() || "",
        MensajeNormalizado: normalizeMessage(record.Mensaje),
        MensajeOriginal: record.Mensaje || ""
      };
    });

    const zip = new JSZip();

    // 2. Bucle de procesamiento por cada archivo base
    for (const xlsxFile of xlsxFiles) {
      const xlsxBuffer = Buffer.from(await xlsxFile.arrayBuffer());
      const campaignName = xlsxFile.name.replace(/\.[^/.]+$/, "").toUpperCase().replace(/-/g, "/");
      
      const baseData: { Telefono1: string; Mensaje: string }[] = [];
      const isCsvBase = xlsxFile.name.toLowerCase().endsWith('.csv');

      if (isCsvBase) {
        const baseCsvRecords = parse(xlsxBuffer, { skip_empty_lines: true, trim: true, from_line: 2 });
        for (const row of baseCsvRecords) {
          if (row[0]) baseData.push({ Telefono1: row[0].toString().trim(), Mensaje: row[1]?.toString().trim() || "" });
        }
      } else {
        const baseWorkbook = new ExcelJS.Workbook();
        await baseWorkbook.xlsx.load(xlsxBuffer as any);
        const baseSheet = baseWorkbook.worksheets[0];
        baseSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const cell1 = row.getCell(1).value;
          const cell2 = row.getCell(2).value;
          let tel = (cell1 as any)?.richText ? (cell1 as any).richText.map((t: any) => t.text).join("") : cell1?.toString() || "";
          let msg = (cell2 as any)?.richText ? (cell2 as any).richText.map((t: any) => t.text).join("") : cell2?.toString() || "";
          if (tel.trim()) baseData.push({ Telefono1: tel.trim(), Mensaje: msg.trim() });
        });
      }

      const telefonosBaseSet = new Set(baseData.map(d => d.Telefono1.startsWith("506") ? d.Telefono1 : "506" + d.Telefono1));
      const baseMap = new Map(baseData.map(d => {
        const tel = d.Telefono1.startsWith("506") ? d.Telefono1 : "506" + d.Telefono1;
        return [`${tel}|${normalizeMessage(d.Mensaje)}`, d];
      }));

      let filteredRows = csvRecords.filter((row: any) => {
        const key = `${row.Destino}|${row.MensajeNormalizado}`;
        return baseMap.has(key);
      });

      if (filteredRows.length === 0 && baseData.length > 0) {
        filteredRows = csvRecords.filter((row: any) => telefonosBaseSet.has(row.Destino));
      }

      // 3. Generar Excel individual
      const wb = new ExcelJS.Workbook();
      const wsBase = wb.addWorksheet("BASE");
      wsBase.addRow(["telefono", "SMS"]);
      baseData.forEach(d => wsBase.addRow([d.Telefono1, d.Mensaje]));

      const wsReporte = wb.addWorksheet("REPORTE");
      const headers = ["Fecha", "Hora", "Destino", "Mensaje", "Usuario", "Total enviado", "Estado", "Reflejo", "Campaña", "Factura"];
      wsReporte.addRow(headers);
      filteredRows.forEach((row: any) => {
        wsReporte.addRow([
          row.Fecha, row.Hora, row.Destino, row.MensajeOriginal, row.Usuario, 
          row["Total Enviados"], row.Estado === "ENVIADO" ? "Entregado" : "No entregado",
          reflection, campaignName, 0.03
        ]);
      });

      const wsResumen = wb.addWorksheet("RESUMEN");
      wsResumen.addRow(["Base", "Cantidad", "Enviados", "Encargado"]);
      wsResumen.addRow([campaignName, baseData.length, filteredRows.length, responsible]);

      const excelBuffer = await wb.xlsx.writeBuffer();
      
      // Si solo es un archivo, retornarlo directamente sin ZIP si se prefiere
      if (xlsxFiles.length === 1) {
        console.log(`[SISTEMA] Enviando archivo único: ${xlsxFile.name}`);
        return new NextResponse(excelBuffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="Reporte ${xlsxFile.name.replace(/\.[^/.]+$/, "")}.xlsx"`,
          },
        });
      }

      zip.file(`Reporte ${xlsxFile.name.replace(/\.[^/.]+$/, "")}.xlsx`, excelBuffer);
    }

    // 4. Retornar el ZIP comprimido para múltiples archivos
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
    console.log("[SISTEMA] Lote masivo completado. Enviando ZIP.");
    return new NextResponse(zipBuffer as any, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": 'attachment; filename="Reportes_Generados.zip"',
      },
    });

  } catch (error: any) {
    console.error("Error fatal en procesamiento batch:", error);
    return NextResponse.json({ error: "Error interno: " + error.message }, { status: 500 });
  }
}

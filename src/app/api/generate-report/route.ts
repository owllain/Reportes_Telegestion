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
        error:
          "La red corporativa o el tamaño de los archivos impidió completar la subida masiva. " +
          "Este error suele ocurrir cuando el Firewall bloquea peticiones de gran tamaño. " +
          "Intenta subir menos archivos simultáneamente o verifica tu conexión.",
      },
      { status: 413 }, // Payload Too Large o similar
    );
  }

  try {
    const csvFile = formData.get("csvFile") as File;
    const xlsxFiles = formData.getAll("xlsxFiles") as File[];
    const responsible = formData.get("responsible") as string;
    const reflection = formData.get("reflection") as string;

    if (!csvFile || xlsxFiles.length === 0) {
      return NextResponse.json(
        {
          error:
            "Se requieren el archivo CSV de reporte claro y al menos un archivo base (XLSX/CSV)",
        },
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

    console.log(
      `[Batch] Iniciando proceso para ${xlsxFiles.length} archivos usando un CSV de ${csvRecordsRaw.length} registros.`,
    );

    // Función interna de normalización (reutilizada)
    function normalizeMessage(msg: any) {
      if (!msg) return "";
      return msg
        .toString()
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
        MensajeOriginal: record.Mensaje || "",
      };
    });

    const zip = new JSZip();

    // 2. Bucle de procesamiento por cada archivo base
    for (const xlsxFile of xlsxFiles) {
      const xlsxBuffer = Buffer.from(await xlsxFile.arrayBuffer());
      const campaignName = xlsxFile.name
        .replace(/\.[^/.]+$/, "")
        .toUpperCase()
        .replace(/-/g, "/");

      const baseData: { Telefono1: string; Mensaje: string }[] = [];
      const isCsvBase = xlsxFile.name.toLowerCase().endsWith(".csv");

      if (isCsvBase) {
        const baseCsvRecords = parse(xlsxBuffer, {
          skip_empty_lines: true,
          trim: true,
          from_line: 2,
        });
        for (const row of baseCsvRecords) {
          if (row[0])
            baseData.push({
              Telefono1: row[0].toString().trim(),
              Mensaje: row[1]?.toString().trim() || "",
            });
        }
      } else {
        const baseWorkbook = new ExcelJS.Workbook();
        await baseWorkbook.xlsx.load(xlsxBuffer as any);
        const baseSheet = baseWorkbook.worksheets[0];
        baseSheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return;
          const cell1 = row.getCell(1).value;
          const cell2 = row.getCell(2).value;
          let tel = (cell1 as any)?.richText
            ? (cell1 as any).richText.map((t: any) => t.text).join("")
            : cell1?.toString() || "";
          let msg = (cell2 as any)?.richText
            ? (cell2 as any).richText.map((t: any) => t.text).join("")
            : cell2?.toString() || "";
          if (tel.trim())
            baseData.push({ Telefono1: tel.trim(), Mensaje: msg.trim() });
        });
      }

      const telefonosBaseSet = new Set(
        baseData.map((d) =>
          d.Telefono1.startsWith("506") ? d.Telefono1 : "506" + d.Telefono1,
        ),
      );
      const baseMap = new Map(
        baseData.map((d) => {
          const tel = d.Telefono1.startsWith("506")
            ? d.Telefono1
            : "506" + d.Telefono1;
          return [`${tel}|${normalizeMessage(d.Mensaje)}`, d];
        }),
      );

      let filteredRows = csvRecords.filter((row: any) => {
        const key = `${row.Destino}|${row.MensajeNormalizado}`;
        return baseMap.has(key);
      });

      if (filteredRows.length === 0 && baseData.length > 0) {
        filteredRows = csvRecords.filter((row: any) =>
          telefonosBaseSet.has(row.Destino),
        );
      }

      // 3. Generar Excel individual (Replicando exactamente 1cec5fa)
      const wb = new ExcelJS.Workbook();
      
      // Estilos Comunes (Exactos de 1cec5fa)
      const headerFill: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFB4A7D6" }, // Lila
      };
      const headerFont: Partial<ExcelJS.Font> = {
        name: "Calibri",
        size: 11,
        bold: true,
        color: { argb: "FF000000" }, // Negro
      };
      const headerAlignment: Partial<ExcelJS.Alignment> = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };
      const border: Partial<ExcelJS.Borders> = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
      const cellFont: Partial<ExcelJS.Font> = {
        name: "Calibri",
        size: 11,
      };
      const cellAlignment: Partial<ExcelJS.Alignment> = {
        horizontal: "center",
        vertical: "middle",
        wrapText: true,
      };

      // Lógica de ID Campaña (Exacta de 1cec5fa)
      let idCampana = "";
      const dateMatch = xlsxFile.name.match(/(\d{2})_(\d{2})_(\d{4})/) || xlsxFile.name.match(/(\d{2})-(\d{2})-(\d{4})/);
      if (dateMatch) {
        idCampana = `${dateMatch[3]}${dateMatch[2]}-SMS`;
      } else {
        const now = new Date();
        idCampana = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-SMS`;
      }

      const reportSheetName = xlsxFile.name.replace(/\.[^/.]+$/, "").toUpperCase().replace(/-/g, "/");

      // ==================== HOJA 1: BASE ====================
      const wsBase = wb.addWorksheet("BASE");
      wsBase.views = [{ showGridLines: false }];
      wsBase.columns = [
        { header: "telefono", key: "telefono", width: 15 },
        { header: "SMS", key: "sms", width: 80 },
      ];

      wsBase.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = headerAlignment;
        cell.border = border;
      });

      baseData.forEach((d) => {
        const row = wsBase.addRow({ telefono: d.Telefono1, sms: d.Mensaje });
        row.eachCell((cell) => {
          cell.font = cellFont;
          cell.alignment = cellAlignment;
          cell.border = border;
        });
      });

      // ==================== HOJA 2: REPORTE ====================
      const wsReporte = wb.addWorksheet("REPORTE");
      wsReporte.views = [{ showGridLines: false }];
      const headersReporte = [
        "Fecha", "Hora", "Destino", "Mensaje", "Usuario", "Total enviado", "Estado", "Reflejo", "Campaña", "IdCampaña", "Factura"
      ];
      wsReporte.columns = headersReporte.map((h, i) => ({
        header: h,
        key: h,
        width: [12, 12, 15, 80, 30, 12, 12, 12, 20, 15, 10][i],
      }));

      wsReporte.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = headerAlignment;
        cell.border = border;
      });

      filteredRows.forEach((row: any) => {
        const addedRow = wsReporte.addRow({
          Fecha: row.Fecha,
          Hora: row.Hora,
          Destino: row.Destino,
          Mensaje: row.MensajeOriginal,
          Usuario: row.Usuario,
          "Total enviado": row["Total Enviados"],
          Estado: row.Estado === "ENVIADO" || row.Estado === "ENTREGADO" ? "Entregado" : "No entregado",
          Reflejo: reflection,
          Campaña: reportSheetName,
          IdCampaña: idCampana,
          Factura: 0.03,
        });
        addedRow.eachCell((cell) => {
          cell.font = cellFont;
          cell.alignment = cellAlignment;
          cell.border = border;
        });
      });

      // ==================== HOJA 3: RESUMEN ====================
      const wsResumen = wb.addWorksheet("RESUMEN");
      wsResumen.views = [{ showGridLines: false }];
      const headersResumen = [
        "Base", "Cantidad de la base", "Cantidad de la prosa ( caracteres)", "Cantidad Enviados", "Hora", "Fecha", "Reflejo", "Encargado"
      ];
      wsResumen.getRow(1).values = headersResumen;
      wsResumen.columns = [
        { width: 50 }, { width: 20 }, { width: 25 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 25 }
      ];

      wsResumen.getRow(1).eachCell((cell) => {
        cell.fill = headerFill;
        cell.font = headerFont;
        cell.alignment = headerAlignment;
        cell.border = border;
      });

      const messageSample = baseData[0]?.Mensaje || "";
      const fechaEnvio = filteredRows[0]?.Fecha || "";
      const horaEnvio = filteredRows[0]?.Hora || "";

      const totalIntentos = filteredRows.reduce((acc: number, r: any) => acc + (Number(r["Total Enviados"]) || 0), 0);
      const totalEntregados = filteredRows.filter((r: any) => r.Estado === "ENVIADO" || r.Estado === "ENTREGADO").length;
      const totalNoEnviados = baseData.length - totalEntregados;

      const resumenRow2 = wsResumen.addRow([
        reportSheetName,
        baseData.length,
        messageSample.length,
        totalIntentos,
        horaEnvio,
        fechaEnvio,
        reflection,
        responsible,
      ]);
      resumenRow2.eachCell((cell, colNum) => {
        cell.font = cellFont;
        cell.alignment = colNum === 1 || colNum === 8 ? cellAlignment : { horizontal: "center", vertical: "middle" };
        cell.border = border;
      });

      // Línea 3 vacía sin bordes
      const emptyRow = wsResumen.addRow(["", "", "", "", "", "", "", ""]);
      emptyRow.eachCell((cell) => (cell.border = {}));

      // Sección final de totales (Vertical con fondo Rosa)
      const bgPink: ExcelJS.Fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFEF2F2" },
      };
      const boldFont: Partial<ExcelJS.Font> = { ...cellFont, bold: true };

      // Fila 4: No recibidos
      const row4 = wsResumen.addRow(["Total enviados ( no recibidos)", totalNoEnviados]);
      [1, 2].forEach((col) => {
        const cell = row4.getCell(col);
        cell.fill = bgPink;
        cell.font = boldFont;
        cell.border = border;
        cell.alignment = col === 1 ? cellAlignment : { horizontal: "center", vertical: "middle" };
      });

      // Fila 5: Entregados
      const row5 = wsResumen.addRow(["Total Entregados", totalEntregados]);
      [1, 2].forEach((col) => {
        const cell = row5.getCell(col);
        cell.fill = bgPink;
        cell.font = boldFont;
        cell.border = border;
        cell.alignment = col === 1 ? cellAlignment : { horizontal: "center", vertical: "middle" };
      });

      // Fila 6: Duplicados/Excluidos
      const row6 = wsResumen.addRow(["Total de mensajes No Enviados (duplicados/excluidos)", 0]);
      [1, 2].forEach((col) => {
        const cell = row6.getCell(col);
        cell.fill = bgPink;
        cell.font = boldFont;
        cell.border = border;
        cell.alignment = col === 1 ? cellAlignment : { horizontal: "center", vertical: "middle" };
      });

      const excelBuffer = await wb.xlsx.writeBuffer();

      // Si solo es un archivo, retornarlo directamente (Exactamente como 1cec5fa)
      if (xlsxFiles.length === 1) {
        console.log(`[SISTEMA] Enviando archivo único: ${xlsxFile.name}`);
        const safeFilename = `Reporte_${campaignName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "")}.xlsx`;
        const encodedFilename = encodeURIComponent("Reporte " + campaignName + ".xlsx");
        
        return new NextResponse(excelBuffer as any, {
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
          },
        });
      }

      const zipFilename = `Reporte ${campaignName}.xlsx`;
      zip.file(zipFilename, excelBuffer);
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
    return NextResponse.json(
      { error: "Error interno: " + error.message },
      { status: 500 },
    );
  }
}

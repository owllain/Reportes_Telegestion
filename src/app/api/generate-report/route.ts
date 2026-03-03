import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { parse } from "csv-parse/sync";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const csvFile = formData.get("csvFile") as File;
    const xlsxFile = formData.get("xlsxFile") as File;
    const campaignName = formData.get("campaignName") as string;
    const responsible = formData.get("responsible") as string;
    const reflection = formData.get("reflection") as string;

    if (!csvFile || !xlsxFile) {
      return NextResponse.json(
        { error: "Se requieren ambos archivos" },
        { status: 400 },
      );
    }

    if (!campaignName || !responsible || !reflection) {
      return NextResponse.json(
        { error: "Faltan campos requeridos (campaña, encargado o reflejo)" },
        { status: 400 },
      );
    }

    // Leer búferes
    const csvBuffer = Buffer.from(await csvFile.arrayBuffer());
    const xlsxBuffer = Buffer.from(await xlsxFile.arrayBuffer());

    // 1. Procesar CSV (Reporte Claro)
    // El formato esperado es: Fecha, Hora, Destino, Mensaje, Usuario, Total Enviados, Estado
    const csvRecords = parse(csvBuffer, {
      columns: [
        "Fecha",
        "Hora",
        "Destino",
        "Mensaje",
        "Usuario",
        "Total Enviados",
        "Estado",
      ],
      skip_empty_lines: true,
      relax_column_count: true,
      trim: true,
    });

    // 2. Procesar XLSX (Base SMS Selección)
    const baseWorkbook = new ExcelJS.Workbook();
    await baseWorkbook.xlsx.load(xlsxBuffer);
    const baseSheet = baseWorkbook.worksheets[0];

    const baseData: { Telefono1: string; Mensaje: string }[] = [];
    baseSheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezado

      const telefono = row.getCell(1).value?.toString() || "";
      const mensaje = row.getCell(2).value?.toString() || "";

      if (telefono) {
        baseData.push({
          Telefono1: telefono,
          Mensaje: mensaje,
        });
      }
    });

    // Mapeo para búsqueda rápida: Telefono con 506 -> Mensaje
    const telefonosBase = new Set(
      baseData.map((d) => "506" + d.Telefono1.trim()),
    );
    const mensajesBaseMap = new Map(
      baseData.map((d) => ["506" + d.Telefono1.trim(), d.Mensaje]),
    );

    // 3. Filtrar CSV según la BASE
    let filteredRows = csvRecords.filter((row: any) => {
      const destino = row.Destino?.toString().trim();
      if (telefonosBase.has(destino)) {
        const expectedMsg = mensajesBaseMap.get(destino);
        return expectedMsg && row.Mensaje === expectedMsg;
      }
      return false;
    });

    // Fallback: si no hay coincidencias exactas con mensaje, filtrar solo por teléfono
    if (filteredRows.length === 0) {
      filteredRows = csvRecords.filter((row: any) => {
        const destino = row.Destino?.toString().trim();
        return telefonosBase.has(destino);
      });
    }

    // 4. Calcular Estadísticas
    const totalBase = baseData.length;
    const totalEnviados = filteredRows.reduce(
      (acc: number, row: any) => acc + (Number(row["Total Enviados"]) || 0),
      0,
    );
    const totalEntregados = filteredRows.filter(
      (row: any) => row.Estado === "ENVIADO",
    ).length;
    const totalNoEnviados = filteredRows.filter(
      (row: any) => row.Estado === "ERROR",
    ).length;
    const mensajeEjemplo = baseData[0]?.Mensaje || "";
    const cantidadProsa = mensajeEjemplo.length;
    const fechaEnvio = filteredRows[0]?.Fecha || "";
    const horaEnvio = filteredRows[0]?.Hora || "";

    // 5. Crear el nuevo Libro de Excel (Reporte Final)
    const wb = new ExcelJS.Workbook();
    const now = new Date();
    const idCampana = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${campaignName}`;

    // Estilos Comunes
    const headerFill: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFDC2626" },
    }; // Rojo
    const headerFont: Partial<ExcelJS.Font> = {
      name: "Times New Roman",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
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
      name: "Times New Roman",
      size: 10,
    };
    const cellAlignment: Partial<ExcelJS.Alignment> = {
      horizontal: "left",
      vertical: "middle",
      wrapText: true,
    };

    // ==================== HOJA BASE ====================
    const wsBase = wb.addWorksheet("BASE");
    wsBase.columns = [
      { header: "telefono", key: "telefono", width: 15 },
      { header: "SMS", key: "sms", width: 80 },
    ];

    // Aplicar estilos a encabezados BASE
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

    // ==================== HOJA REPORTE ====================
    const wsReporte = wb.addWorksheet("REPORTE");
    const headersReporte = [
      "Fecha",
      "Hora",
      "Destino",
      "Mensaje",
      "Usuario",
      "Total enviado",
      "Estado",
      "Reflejo",
      "Campaña",
      "IdCampaña",
      "Factura",
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
        Mensaje: row.Mensaje,
        Usuario: row.Usuario,
        "Total enviado": row["Total Enviados"],
        Estado: row.Estado === "ENVIADO" ? "Entregado" : "No enviado",
        Reflejo: reflection,
        Campaña: campaignName,
        IdCampaña: idCampana,
        Factura: 0.03,
      });
      addedRow.eachCell((cell) => {
        cell.font = cellFont;
        cell.alignment = cellAlignment;
        cell.border = border;
      });
    });

    // ==================== HOJA RESUMEN ====================
    const wsResumen = wb.addWorksheet("RESUMEN");
    const headersResumen = [
      "Base",
      "Cantidad de la base",
      "Cantidad de la prosa ( caracteres)",
      "Cantidad Enviados",
      "Hora",
      "Fecha",
      "Reflejo",
      "Encargado",
    ];
    wsResumen.getRow(1).values = headersResumen;
    wsResumen.columns = [
      { width: 50 },
      { width: 20 },
      { width: 25 },
      { width: 18 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 25 },
    ];

    wsResumen.getRow(1).eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = headerAlignment;
      cell.border = border;
    });

    // Datos Fila 2
    const resumenRow2 = wsResumen.addRow([
      `SMS ${campaignName}`,
      totalBase,
      cantidadProsa,
      totalEnviados,
      horaEnvio,
      fechaEnvio,
      reflection,
      responsible,
    ]);
    resumenRow2.eachCell((cell, colNum) => {
      cell.font = cellFont;
      cell.alignment =
        colNum === 1 || colNum === 8
          ? cellAlignment
          : { horizontal: "center", vertical: "middle" };
      cell.border = border;
    });

    // Fila 3 vacía con bordes
    const emptyRow = wsResumen.addRow(["", "", "", "", "", "", "", ""]);
    emptyRow.eachCell((cell) => (cell.border = border));

    // Sección final de totales
    const bgPink: ExcelJS.Fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFEF2F2" },
    };
    const boldFont: Partial<ExcelJS.Font> = { ...cellFont, bold: true };

    // Fila 4: No recibidos
    const row4 = wsResumen.addRow([
      "Total enviados ( no recibidos)",
      totalNoEnviados,
    ]);
    [1, 2].forEach((col) => {
      const cell = row4.getCell(col);
      cell.fill = bgPink;
      cell.font = boldFont;
      cell.border = border;
      cell.alignment =
        col === 1
          ? cellAlignment
          : { horizontal: "center", vertical: "middle" };
    });

    // Fila 5: Entregados
    const row5 = wsResumen.addRow(["Total Entregados", totalEntregados]);
    [1, 2].forEach((col) => {
      const cell = row5.getCell(col);
      cell.fill = bgPink;
      cell.font = boldFont;
      cell.border = border;
      cell.alignment =
        col === 1
          ? cellAlignment
          : { horizontal: "center", vertical: "middle" };
    });

    // Fila 6: Duplicados/Excluidos
    const row6 = wsResumen.addRow([
      "Total de mensajes No Enviados (duplicados/excluidos)",
      0,
    ]);
    [1, 2].forEach((col) => {
      const cell = row6.getCell(col);
      cell.fill = bgPink;
      cell.font = boldFont;
      cell.border = border;
      cell.alignment =
        col === 1
          ? cellAlignment
          : { horizontal: "center", vertical: "middle" };
    });

    // 6. Generar el buffer final
    const finalBuffer = (await wb.xlsx.writeBuffer()) as Buffer;

    return new NextResponse(finalBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="REPORTE SMS ${campaignName}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error("Error al generar el reporte:", error);
    return NextResponse.json(
      { error: error.message || "Error al generar el reporte" },
      { status: 500 },
    );
  }
}

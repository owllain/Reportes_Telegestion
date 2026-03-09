import ExcelJS from "exceljs";
import * as fs from "fs";

async function run() {
    const filePath = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Reporte/REPORTE SMS DE SEGURIDAD 05-03-2026.xlsx";
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fs.readFileSync(filePath));
    const sheet = workbook.worksheets[0];
    
    console.log("Sheet name:", sheet.name);
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber > 5) return;
        const values = row.values as any[];
        console.log(`Row ${rowNumber}:`, values.slice(1));
    });
}
run();

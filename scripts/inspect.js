const ExcelJS = require('exceljs');
const fs = require('fs');

async function run() {
    try {
        const filePath = "e:/Mis proyectos/Generador de Reportes/public/DATA FOR EXAMPLES/Reporte/REPORTE SMS DE SEGURIDAD 05-03-2026.xlsx";
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(fs.readFileSync(filePath));
        const sheet = workbook.worksheets[0];
        
        const data = [];
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 5) return;
            data.push({
                row: rowNumber,
                values: row.values
            });
        });
        fs.writeFileSync('xlsx-inspect.json', JSON.stringify(data, null, 2));
    } catch (e) {
        fs.writeFileSync('xlsx-inspect-error.txt', e.stack);
    }
}
run();

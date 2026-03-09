const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

async function run() {
    const dir = 'e:/Mis proyectos/Generador de Reportes/public/templates';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }

    // 1. Create XLSX Template (SMS Selección)
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('SMS Selección');
    sheet.addRow(['telefono', 'SMS']);
    sheet.addRow(['88888888', 'Mensaje de prueba para el reporte']);
    await workbook.xlsx.writeFile(path.join(dir, 'plantilla-sms-seleccion.xlsx'));

    // 2. Create CSV Template (Reporte Claro)
    const csvContent = `"Fecha","Destino","Mensaje","Usuario","Cuenta","Total Enviados","No Entregados","Total Entregados","Estado","Estado de Entrega","Fecha Estado Entrega","Codigo de error","Marcacion","ID Plantilla","Vistas Previas","Clicks Totales","Clicks Unicos"\n"2026-03-08 10:00","50688888888","Mensaje de prueba para el reporte","admin","MI EMPRESA",1,0,1,"ENVIADO","DELIVERED","2026-03-08 10:01","","50671984362","",0,0,0`;
    fs.writeFileSync(path.join(dir, 'plantilla-reporte-claro.csv'), csvContent);

    console.log('Templates created successfully');
}
run();

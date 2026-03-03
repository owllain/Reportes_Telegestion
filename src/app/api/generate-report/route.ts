import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const csvFile = formData.get('csvFile') as File
    const xlsxFile = formData.get('xlsxFile') as File
    const campaignName = formData.get('campaignName') as string
    const responsible = formData.get('responsible') as string
    const reflection = formData.get('reflection') as string

    if (!csvFile || !xlsxFile) {
      return NextResponse.json(
        { error: 'Se requieren ambos archivos' },
        { status: 400 }
      )
    }

    if (!campaignName || !responsible || !reflection) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (campaña, encargado o reflejo)' },
        { status: 400 }
      )
    }

    // Leer archivos
    const csvBuffer = Buffer.from(await csvFile.arrayBuffer())
    const xlsxBuffer = Buffer.from(await xlsxFile.arrayBuffer())

    // Crear script de Python para procesar los archivos
    const pythonScript = `
import sys
import pandas as pd
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from datetime import datetime
import io
import traceback

# Variables inyectadas desde el servidor
campaignName = """${campaignName}"""
responsible = """${responsible}"""
reflection = """${reflection}"""

try:
    # Leer archivos desde stdin
    import struct
    size = struct.unpack('>I', sys.stdin.buffer.read(4))[0]
    csv_buffer = sys.stdin.buffer.read(size)
    size = struct.unpack('>I', sys.stdin.buffer.read(4))[0]
    xlsx_buffer = sys.stdin.buffer.read(size)

    # Leer CSV
    df_csv = pd.read_csv(io.BytesIO(csv_buffer))
    df_csv.columns = ['Fecha', 'Hora', 'Destino', 'Mensaje', 'Usuario', 'Total Enviados', 'Estado']
    df_csv['Destino_str'] = df_csv['Destino'].astype(str)

    # Leer XLSX (base)
    df_base = pd.read_excel(io.BytesIO(xlsx_buffer))
    df_base['Telefono1_str'] = df_base['Telefono1'].astype(str)
    df_base['Telefono_con_506'] = '506' + df_base['Telefono1_str']

    # Obtener lista de teléfonos y mensajes de la base
    telefonos_base = set(df_base['Telefono_con_506'])
    mensajes_base = df_base.set_index('Telefono_con_506')['Mensaje'].to_dict()

    # Filtrar CSV para obtener solo los registros de la base
    filtered_rows = []
    for idx, row in df_csv.iterrows():
        telefono = row['Destino_str']
        if telefono in telefonos_base:
            # Verificar si el mensaje coincide
            expected_mensaje = mensajes_base.get(telefono)
            if expected_mensaje and row['Mensaje'] == expected_mensaje:
                filtered_rows.append(row.to_dict())

    df_filtered = pd.DataFrame(filtered_rows)

    if len(df_filtered) == 0:
        # Si no hay coincidencias exactas, intentar solo por teléfono
        filtered_rows = []
        for idx, row in df_csv.iterrows():
            telefono = row['Destino_str']
            if telefono in telefonos_base:
                filtered_rows.append(row.to_dict())
        df_filtered = pd.DataFrame(filtered_rows)

    # Calcular estadísticas
    total_base = len(df_base)
    total_enviados = df_filtered['Total Enviados'].sum()
    total_entregados = len(df_filtered[df_filtered['Estado'] == 'ENVIADO'])
    total_no_enviados = len(df_filtered[df_filtered['Estado'] == 'ERROR'])
    mensaje_ejemplo = df_base['Mensaje'].iloc[0] if len(df_base) > 0 else ''
    cantidad_prosa = len(mensaje_ejemplo)

    # Obtener fecha y hora del primer envío
    fecha_envio = df_filtered['Fecha'].iloc[0] if len(df_filtered) > 0 else ''
    hora_envio = df_filtered['Hora'].iloc[0] if len(df_filtered) > 0 else ''

    # Crear workbook
    wb = Workbook()
    wb.remove(wb.active)

    # Generar IdCampaña
    fecha_actual = datetime.now()
    id_campana = f"{fecha_actual.strftime('%Y%m')}-{campaignName}"

    # ==================== HOJA BASE ====================
    ws_base = wb.create_sheet('BASE')

    # Estilos
    header_font = Font(name='Times New Roman', size=11, bold=True, color='FFFFFF')
    header_fill = PatternFill(start_color='DC2626', end_color='DC2626', fill_type='solid')
    header_alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
    border = Border(
        left=Side(style='thin', color='000000'),
        right=Side(style='thin', color='000000'),
        top=Side(style='thin', color='000000'),
        bottom=Side(style='thin', color='000000')
    )
    cell_font = Font(name='Times New Roman', size=10)
    cell_alignment = Alignment(horizontal='left', vertical='center', wrap_text=True)

    # Encabezados
    headers_base = ['telefono', 'SMS']
    for col_idx, header in enumerate(headers_base, start=1):
        cell = ws_base.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = border

    # Datos de la base
    for row_idx, (_, row) in enumerate(df_base.iterrows(), start=2):
        telefono = str(row['Telefono1'])
        mensaje = str(row['Mensaje'])
        
        ws_base.cell(row=row_idx, column=1, value=telefono).font = cell_font
        ws_base.cell(row=row_idx, column=1, value=telefono).alignment = cell_alignment
        ws_base.cell(row=row_idx, column=1, value=telefono).border = border
        
        ws_base.cell(row=row_idx, column=2, value=mensaje).font = cell_font
        ws_base.cell(row=row_idx, column=2, value=mensaje).alignment = cell_alignment
        ws_base.cell(row=row_idx, column=2, value=mensaje).border = border

    # Ajustar ancho de columnas
    ws_base.column_dimensions['A'].width = 15
    ws_base.column_dimensions['B'].width = 80

    # ==================== HOJA REPORTE ====================
    ws_reporte = wb.create_sheet('REPORTE')

    # Encabezados
    headers_reporte = ['Fecha', 'Hora', 'Destino', 'Mensaje', 'Usuario', 'Total enviado', 'Estado', 'Reflejo', 'Campaña', 'IdCampaña', 'Factura']
    for col_idx, header in enumerate(headers_reporte, start=1):
        cell = ws_reporte.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = border

    # Datos del reporte
    for row_idx, (_, row) in enumerate(df_filtered.iterrows(), start=2):
        datos = [
            row['Fecha'],
            row['Hora'],
            row['Destino'],
            row['Mensaje'],
            row['Usuario'],
            row['Total Enviados'],
            'Entregado' if row['Estado'] == 'ENVIADO' else 'No enviado',
            reflection,
            campaignName,
            id_campana,
            0.03
        ]
        
        for col_idx, valor in enumerate(datos, start=1):
            cell = ws_reporte.cell(row=row_idx, column=col_idx, value=valor)
            cell.font = cell_font
            cell.alignment = cell_alignment
            cell.border = border

    # Ajustar ancho de columnas
    ws_reporte.column_dimensions['A'].width = 12
    ws_reporte.column_dimensions['B'].width = 12
    ws_reporte.column_dimensions['C'].width = 15
    ws_reporte.column_dimensions['D'].width = 80
    ws_reporte.column_dimensions['E'].width = 30
    ws_reporte.column_dimensions['F'].width = 12
    ws_reporte.column_dimensions['G'].width = 12
    ws_reporte.column_dimensions['H'].width = 12
    ws_reporte.column_dimensions['I'].width = 20
    ws_reporte.column_dimensions['J'].width = 15
    ws_reporte.column_dimensions['K'].width = 10

    # ==================== HOJA RESUMEN ====================
    ws_resumen = wb.create_sheet('RESUMEN')

    # Encabezados
    headers_resumen = ['Base', 'Cantidad de la base', 'Cantidad de la prosa ( caracteres)', 'Cantidad Enviados', 'Hora', 'Fecha', 'Reflejo', 'Encargado']
    for col_idx, header in enumerate(headers_resumen, start=1):
        cell = ws_resumen.cell(row=1, column=col_idx, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_alignment
        cell.border = border

    # Datos del resumen
    ws_resumen.cell(row=2, column=1, value=f'SMS {campaignName}').font = cell_font
    ws_resumen.cell(row=2, column=1).alignment = cell_alignment
    ws_resumen.cell(row=2, column=1).border = border

    ws_resumen.cell(row=2, column=2, value=total_base).font = cell_font
    ws_resumen.cell(row=2, column=2).alignment = Alignment(horizontal='center', vertical='center')
    ws_resumen.cell(row=2, column=2).border = border

    ws_resumen.cell(row=2, column=3, value=cantidad_prosa).font = cell_font
    ws_resumen.cell(row=2, column=3).alignment = Alignment(horizontal='center', vertical='center')
    ws_resumen.cell(row=2, column=3).border = border

    ws_resumen.cell(row=2, column=4, value=total_enviados).font = cell_font
    ws_resumen.cell(row=2, column=4).alignment = Alignment(horizontal='center', vertical='center')
    ws_resumen.cell(row=2, column=4).border = border

    ws_resumen.cell(row=2, column=5, value=hora_envio).font = cell_font
    ws_resumen.cell(row=2, column=5).alignment = Alignment(horizontal='center', vertical='center')
    ws_resumen.cell(row=2, column=5).border = border

    ws_resumen.cell(row=2, column=6, value=fecha_envio).font = cell_font
    ws_resumen.cell(row=2, column=6).alignment = Alignment(horizontal='center', vertical='center')
    ws_resumen.cell(row=2, column=6).border = border

    ws_resumen.cell(row=2, column=7, value=reflection).font = cell_font
    ws_resumen.cell(row=2, column=7).alignment = Alignment(horizontal='center', vertical='center')
    ws_resumen.cell(row=2, column=7).border = border

    ws_resumen.cell(row=2, column=8, value=responsible).font = cell_font
    ws_resumen.cell(row=2, column=8).alignment = cell_alignment
    ws_resumen.cell(row=2, column=8).border = border

    # Fila vacía
    for col_idx in range(1, 9):
        cell = ws_resumen.cell(row=3, column=col_idx, value='')
        cell.border = border

    # Total enviados (no recibidos)
    ws_resumen.cell(row=4, column=1, value='Total enviados ( no recibidos)').font = Font(name='Times New Roman', size=10, bold=True)
    ws_resumen.cell(row=4, column=1).alignment = cell_alignment
    ws_resumen.cell(row=4, column=1).border = border
    ws_resumen.cell(row=4, column=1).fill = PatternFill(start_color='FEF2F2', end_color='FEF2F2', fill_type='solid')

    ws_resumen.cell(row=4, column=2, value=total_no_enviados).font = Font(name='Times New Roman', size=10, bold=True)
    ws_resumen.cell(row=4, column=2).alignment = Alignment(horizontal='center', vertical='center')
    ws_resumen.cell(row=4, column=2).border = border
    ws_resumen.cell(row=4, column=2).fill = PatternFill(start_color='FEF2F2', end_color='FEF2F2', fill_type='solid')

    # Total entregados
    ws_resumen.cell(row=5, column=1, value='Total Entregados').font = Font(name='Times New Roman', size=10, bold=True)
    ws_resumen.cell(row=5, column=1).alignment = cell_alignment
    ws_resumen.cell(row=5, column=1).border = border
    ws_resumen.cell(row=5, column=1).fill = PatternFill(start_color='FEF2F2', end_color='FEF2F2', fill_type='solid')

    ws_resumen.cell(row=5, column=2, value=total_entregados).font = Font(name='Times New Roman', size=10, bold=True)
    ws_resumen.cell(row=5, column=2).alignment = Alignment(horizontal='center', vertical='center')
    ws_resumen.cell(row=5, column=2).border = border
    ws_resumen.cell(row=5, column=2).fill = PatternFill(start_color='FEF2F2', end_color='FEF2F2', fill_type='solid')

    # Total de mensajes no enviados
    ws_resumen.cell(row=6, column=1, value='Total de mensajes No Enviados (duplicados/excluidos)').font = Font(name='Times New Roman', size=10, bold=True)
    ws_resumen.cell(row=6, column=1).alignment = cell_alignment
    ws_resumen.cell(row=6, column=1).border = border
    ws_resumen.cell(row=6, column=1).fill = PatternFill(start_color='FEF2F2', end_color='FEF2F2', fill_type='solid')

    ws_resumen.cell(row=6, column=2, value=0).font = Font(name='Times New Roman', size=10, bold=True)
    ws_resumen.cell(row=6, column=2).alignment = Alignment(horizontal='center', vertical='center')
    ws_resumen.cell(row=6, column=2).border = border
    ws_resumen.cell(row=6, column=2).fill = PatternFill(start_color='FEF2F2', end_color='FEF2F2', fill_type='solid')

    # Ajustar ancho de columnas
    ws_resumen.column_dimensions['A'].width = 50
    ws_resumen.column_dimensions['B'].width = 20
    ws_resumen.column_dimensions['C'].width = 25
    ws_resumen.column_dimensions['D'].width = 18
    ws_resumen.column_dimensions['E'].width = 12
    ws_resumen.column_dimensions['F'].width = 12
    ws_resumen.column_dimensions['G'].width = 12
    ws_resumen.column_dimensions['H'].width = 25

    # Guardar en buffer
    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    # Escribir el resultado a stdout
    sys.stdout.buffer.write(output.read())
    sys.exit(0)

except Exception as e:
    sys.stderr.write(f"ERROR: {str(e)}\\n")
    sys.stderr.write(traceback.format_exc())
    sys.exit(1)
`

    // Ejecutar el script de Python
    const { spawn } = await import('child_process')
    
    // Usar el Python del entorno virtual
    const pythonPath = '/home/z/.venv/bin/python3'
    
    const result = await new Promise<{ buffer: Buffer; error: string | null }>((resolve) => {
      const python = spawn(pythonPath, ['-c', pythonScript])
      
      // Enviar datos al script
      const headerBuffer = Buffer.alloc(4)
      headerBuffer.writeUInt32BE(csvBuffer.length, 0)
      python.stdin.write(headerBuffer)
      python.stdin.write(csvBuffer)
      
      headerBuffer.writeUInt32BE(xlsxBuffer.length, 0)
      python.stdin.write(headerBuffer)
      python.stdin.write(xlsxBuffer)
      python.stdin.end()
      
      // Recibir el resultado
      const chunks: Buffer[] = []
      const errorChunks: Buffer[] = []
      
      python.stdout.on('data', (chunk) => {
        chunks.push(chunk)
      })
      
      python.stderr.on('data', (data) => {
        errorChunks.push(data)
      })
      
      python.on('close', (code) => {
        const error = errorChunks.length > 0 ? Buffer.concat(errorChunks).toString() : null
        const buffer = chunks.length > 0 ? Buffer.concat(chunks) : Buffer.alloc(0)
        resolve({ buffer, error })
      })
    })

    if (result.error || result.buffer.length === 0) {
      console.error('Python error:', result.error)
      return NextResponse.json(
        { error: result.error || 'Error al procesar los archivos: No se generó salida' },
        { status: 500 }
      )
    }
    
    const response = new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="REPORTE SMS ${campaignName}.xlsx"`,
      },
    })
    
    return response
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar el reporte' },
      { status: 500 }
    )
  }
}

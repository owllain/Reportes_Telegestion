'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, FileText, Download, Loader2, Calendar, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Dev: Alvaro Enrique Cascante Moraga
// Fecha: 05-03-2026
// Commit: Componente raíz para gestionar la interfaz gráfica y los estados del generador SMS
export default function SMSReportGenerator() {
  const { toast } = useToast()
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [xlsxFiles, setXlsxFiles] = useState<File[]>([])
  const [responsible, setResponsible] = useState('')
  const [customResponsible, setCustomResponsible] = useState('')
  const [reflection, setReflection] = useState('71984362')
  const [loading, setLoading] = useState(false)
  const [processingStatus, setProcessingStatus] = useState('')
  const [generatedReports, setGeneratedReports] = useState<{ url: string; filename: string; originalName: string }[]>([])
  
  // Agregar una key para forzar el re-renderizado de los inputs type file
  const [resetKey, setResetKey] = useState(0)

  // Dev: Alvaro Enrique Cascante Moraga
  // Fecha: 05-03-2026
  // Commit: Manejador de selección de archivos (Soporta múltiples archivos XLSX/CSV)
  const handleFileChange = (type: 'csv' | 'xlsx', files: FileList | null) => {
    if (type === 'csv') {
      setCsvFile(files?.[0] || null)
    } else {
      setXlsxFiles(files ? Array.from(files) : [])
    }
  }

  // Dev: Alvaro Enrique Cascante Moraga
  // Fecha: 05-03-2026
  // Commit: Bucle principal asíncrono que coordina la carga, envío a API y generación de los reportes lote por lote
  const generateReport = async () => {
    if (!csvFile || xlsxFiles.length === 0) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione ambos archivos (CSV de reporte claro y al menos un XLSX/CSV de SMS selección)',
        variant: 'destructive',
      })
      return
    }

    if (!responsible || (responsible === 'other' && !customResponsible)) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione o ingrese el nombre del encargado',
        variant: 'destructive',
      })
      return
    }

    if (!reflection) {
      toast({
        title: 'Error',
        description: 'Por favor ingrese el número de reflejo',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    setGeneratedReports([])
    const newReports: typeof generatedReports = []
    
    const finalResponsible = responsible === 'other' ? customResponsible : responsible

    try {
      for (let i = 0; i < xlsxFiles.length; i++) {
        const currentFile = xlsxFiles[i]
        setProcessingStatus(`Generando reporte ${i + 1} de ${xlsxFiles.length} (${currentFile.name})...`)

        let derivedCampaignName = currentFile.name.replace(/\.[^/.]+$/, "")
        
        // Transformar nombre de campaña
        derivedCampaignName = derivedCampaignName.toUpperCase().replace(/-/g, '/')

        const formData = new FormData()
        formData.append('csvFile', csvFile)
        formData.append('xlsxFile', currentFile)
        formData.append('campaignName', derivedCampaignName)
        formData.append('responsible', finalResponsible)
        formData.append('reflection', reflection)

        const response = await fetch('/api/generate-report', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          let errorMessage = `Error al generar el reporte de ${currentFile.name}`
          try {
            const contentType = response.headers.get('content-type')
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json()
              errorMessage = errorData.error || errorMessage
            } else {
              const errorText = await response.text()
              errorMessage = errorText || errorMessage
            }
          } catch (e) {
            // Si no podemos parsear el error, usar mensaje genérico
          }
          throw new Error(errorMessage)
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        newReports.push({
          url,
          filename: `Reporte ${derivedCampaignName}.xlsx`,
          originalName: currentFile.name
        })
      }

      setGeneratedReports(newReports)
      toast({
        title: '¡Éxito!',
        description: `Se generaron ${newReports.length} reporte(s) correctamente`,
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al generar los reportes',
        variant: 'destructive',
      })
      // Aun si falla a medio camino, mostramos los que sí se generaron
      if (newReports.length > 0) setGeneratedReports(newReports)
    } finally {
      setLoading(false)
      setProcessingStatus('')
    }
  }

  // Dev: Alvaro Enrique Cascante Moraga
  // Fecha: 05-03-2026
  // Commit: Función utilitaria para forzar una descarga de archivos manipulando el DOM temporalmente
  const downloadReport = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  // Dev: Alvaro Enrique Cascante Moraga
  // Fecha: 05-03-2026
  // Commit: Automatiza la descarga secuencial de todos los reportes generados insertando retardos seguros
  const downloadAll = () => {
    generatedReports.forEach((report, index) => {
      // Pequeño timeout para no saturar el navegador si son muchos
      setTimeout(() => downloadReport(report.url, report.filename), index * 300)
    })
  }

  // Dev: Alvaro Enrique Cascante Moraga
  // Fecha: 05-03-2026
  // Commit: Restaura todos los estados de React para limpiar la sesión lista para un nuevo set
  const handleReset = () => {
    setCsvFile(null)
    setXlsxFiles([])
    setResponsible('')
    setCustomResponsible('')
    setReflection('71984362')
    setGeneratedReports([])
    setProcessingStatus('')
    setResetKey(prevKey => prevKey + 1) // Fuerza re-render de campos file
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50">
      <header className="bg-red-600 text-white py-6 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8" />
            Reportes Telegestion
          </h1>
          <p className="text-red-100 mt-2">Automatización de reportes de envío de SMS</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-4xl mx-auto shadow-xl">
          <CardHeader className="bg-red-600 text-white">
            <CardTitle className="text-2xl">Configuración del Reporte</CardTitle>
            <CardDescription className="text-red-100">
              Cargue los archivos fuente y complete la información requerida
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {/* Archivo CSV */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Archivo Reporte Claro (CSV)
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  key={`csv-${resetKey}`}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange('csv', e.target.files)}
                  className="cursor-pointer"
                />
                {csvFile && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    ✓ {csvFile.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Archivo CSV del reporte de Claro (Fecha, Hora, Destino, Mensaje, Usuario, Total Enviados, Estado)
              </p>
            </div>

            {/* Archivos SMS (XLSX/CSV) */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Archivos SMS (XLSX, CSV)
              </Label>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-4">
                  <Input
                    key={`xlsx-${resetKey}`}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    multiple
                    onChange={(e) => handleFileChange('xlsx', e.target.files)}
                    className="cursor-pointer"
                  />
                </div>
                {xlsxFiles.length > 0 && (
                  <div className="text-sm bg-green-50 text-green-700 p-3 rounded-md border border-green-200">
                    <p className="font-semibold mb-1">✓ {xlsxFiles.length} archivo(s) seleccionado(s):</p>
                    <ul className="list-disc list-inside max-h-24 overflow-y-auto">
                      {xlsxFiles.map((file, i) => (
                        <li key={i} className="truncate">{file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Seleccione uno o más archivos con la base de envíos (Teléfono, Mensaje)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">              {/* Encargado */}
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Encargado
                </Label>
                <div className="space-y-3">
                  <Select value={responsible} onValueChange={setResponsible}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Seleccione un encargado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Isaac Sánchez Rodríguez">Isaac Sánchez Rodríguez</SelectItem>
                      <SelectItem value="Karen Herrera Quesada">Karen Herrera Quesada</SelectItem>
                      <SelectItem value="Victor Castillo Salazar">Victor Castillo Salazar</SelectItem>
                      <SelectItem value="Angela Oses Jimenez">Angela Oses Jimenez</SelectItem>
                      <SelectItem value="other">Otro (Especificar)</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {responsible === 'other' && (
                    <Input
                      type="text"
                      value={customResponsible}
                      onChange={(e) => setCustomResponsible(e.target.value)}
                      placeholder="Ingrese el nombre del encargado"
                      className="mt-2"
                    />
                  )}
                </div>
              </div>

              {/* Reflejo */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Número de Reflejo</Label>
                <Input
                  type="text"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  placeholder="Ej: 71984362"
                />
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button
                onClick={generateReport}
                disabled={loading || generatedReports.length > 0}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    {processingStatus || 'Generando reporte...'}
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    Generar Reporte
                  </>
                )}
              </Button>

              {generatedReports.length > 0 && (
                <>
                  <Button
                    onClick={downloadAll}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg flex-1"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Descargar Todos ({generatedReports.length})
                  </Button>
                  <Button
                    onClick={handleReset}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-6 text-lg flex-none px-6"
                  >
                    Nuevo Reporte
                  </Button>
                </>
              )}
            </div>
            
            {generatedReports.length > 0 && (
              <div className="pt-4 border-t mt-4">
                <Label className="font-semibold mb-3 block">Archivos Generados:</Label>
                <div className="grid gap-2 grid-cols-1 md:grid-cols-2">
                  {generatedReports.map((report, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-gray-50 border rounded-md">
                      <div className="flex flex-col overflow-hidden">
                         <span className="text-sm font-medium truncate" title={report.filename}>{report.filename}</span>
                         <span className="text-xs text-gray-500 truncate">Origen: {report.originalName}</span>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => downloadReport(report.url, report.filename)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información adicional */}
        <Card className="max-w-4xl mx-auto mt-6">
          <CardHeader>
            <CardTitle className="text-xl">Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0">1</span>
              <p className="text-sm">
                <strong>Archivo Reporte Claro (CSV):</strong> Contiene el consolidado de todos los envíos SMS. 
                Columnas: Fecha, Hora, Destino (con 506), Mensaje, Usuario, Total Enviados, Estado.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0">2</span>
              <p className="text-sm">
                <strong>Archivo SMS (XLSX):</strong> Base de envíos con Teléfono (sin 506) y Mensaje. 
                Este archivo define qué registros incluir en el reporte. (Registro original obtenido de FTP)
              </p>
            </div>
            <div className="flex gap-3">
              <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center font-bold text-sm flex-shrink-0">3</span>
              <p className="text-sm">
                <strong>Reporte Generado:</strong> Excel con 3 hojas:
                <br/>• <strong>BASE:</strong> Copia del archivo SMS Selección
                <br/>• <strong>REPORTE:</strong> Detalle de envíos del reporte Claro filtrado por la base
                <br/>• <strong>RESUMEN:</strong> Estadísticas y totales
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="bg-red-600 text-white py-4 mt-auto">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm">© 2026 Sistema de Reportes SMS | Powered by Alvaro Enrique Cascante Moraga</p>
        </div>
      </footer>
    </div>
  )
}

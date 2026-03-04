'use client'

import { useState } from 'react'
import { Upload, FileSpreadsheet, FileText, Download, Loader2, Calendar, User } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export default function SMSReportGenerator() {
  const { toast } = useToast()
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [xlsxFile, setXlsxFile] = useState<File | null>(null)
  const [responsible, setResponsible] = useState('')
  const [reflection, setReflection] = useState('71984362')
  const [loading, setLoading] = useState(false)
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  
  // Agregar una key para forzar el re-renderizado de los inputs type file
  const [resetKey, setResetKey] = useState(0)

  const handleFileChange = (type: 'csv' | 'xlsx', file: File | null) => {
    if (type === 'csv') {
      setCsvFile(file)
    } else {
      setXlsxFile(file)
    }
  }

  const generateReport = async () => {
    if (!csvFile || !xlsxFile) {
      toast({
        title: 'Error',
        description: 'Por favor seleccione ambos archivos (CSV de reporte claro y XLSX de SMS selección)',
        variant: 'destructive',
      })
      return
    }

    if (!responsible) {
      toast({
        title: 'Error',
        description: 'Por favor ingrese el nombre del encargado',
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
    setDownloadUrl(null)

    try {
      const derivedCampaignName = xlsxFile.name.replace(/\.[^/.]+$/, "")

      const formData = new FormData()
      formData.append('csvFile', csvFile)
      formData.append('xlsxFile', xlsxFile)
      formData.append('campaignName', derivedCampaignName)
      formData.append('responsible', responsible)
      formData.append('reflection', reflection)

      const response = await fetch('/api/generate-report', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        let errorMessage = 'Error al generar el reporte'
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
      setDownloadUrl(url)

      toast({
        title: '¡Éxito!',
        description: 'Reporte generado correctamente',
      })
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Error al generar el reporte',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const downloadReport = () => {
    if (downloadUrl && xlsxFile) {
      const derivedCampaignName = xlsxFile.name.replace(/\.[^/.]+$/, "")
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `Reporte ${derivedCampaignName}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }

  const handleReset = () => {
    setCsvFile(null)
    setXlsxFile(null)
    setResponsible('')
    setReflection('71984362')
    setDownloadUrl(null)
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
                  onChange={(e) => handleFileChange('csv', e.target.files?.[0] || null)}
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

            {/* Archivo XLSX */}
            <div className="space-y-2">
              <Label className="text-base font-semibold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Archivo SMS (XLSX)
              </Label>
              <div className="flex items-center gap-4">
                <Input
                  key={`xlsx-${resetKey}`}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => handleFileChange('xlsx', e.target.files?.[0] || null)}
                  className="cursor-pointer"
                />
                {xlsxFile && (
                  <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                    ✓ {xlsxFile.name}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                Archivo Excel con la base de envíos (Teléfono, Mensaje)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">              {/* Encargado */}
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Encargado
                </Label>
                <Input
                  type="text"
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  placeholder="Ej: Isaac Sánchez Rodríguez"
                />
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
                disabled={loading || !!downloadUrl}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-6 text-lg flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generando reporte...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-5 h-5 mr-2" />
                    Generar Reporte
                  </>
                )}
              </Button>

              {downloadUrl && (
                <>
                  <Button
                    onClick={downloadReport}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-6 text-lg flex-1"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Descargar
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

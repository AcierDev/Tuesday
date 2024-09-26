'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Download, Upload, File, Trash2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { checkPdfExists } from '@/utils/labelUtils'
import { useRealmApp } from '@/hooks/useRealmApp'
import { ColumnTitles, ColumnTypes } from '@/typings/types'

export function ViewLabel({ orderId }: { orderId: string }) {
  const [pdfExists, setPdfExists] = useState<boolean | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const { collection } = useRealmApp();

  useEffect(() => {
    async function checkLabel() {
      const exists = await checkPdfExists(orderId)
      setPdfExists(exists)
      if (exists) {
        fetchPdf()
      }
    }
    checkLabel()
  }, [orderId])

  const fetchPdf = async () => {
    try {
      const response = await fetch(`http://144.172.71.72:3003/pdf/${orderId}.pdf`)
      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        setPdfUrl(url)
      } else {
        throw new Error('Failed to fetch PDF')
      }
    } catch (error) {
      console.error('Error fetching PDF:', error)
      setError('Failed to load the PDF. Please try again.')
    }
  }

  const handleFile = useCallback((file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file.')
      return
    }
    setFile(file)
    setError(null)
  }, [])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFile(event.target.files[0])
    }
  }

  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const updateItemLabels = async (orderId: string, hasLabel: boolean) => {
    if (collection) {
      try {
        const result = await collection.updateOne(
          { "items_page.items.id": orderId },
          { 
            $set: { 
              "items_page.items.$[elem].values.$[val].text": hasLabel.toString()
            }
          },
          { 
            arrayFilters: [
              { "elem.id": orderId },
              { "val.columnName": ColumnTitles.Labels }
            ]
          }
        );

        if (result.modifiedCount === 1) {
          console.log('Labels field updated successfully');
        } else {
          console.log('No document was updated');
        }
      } catch (error) {
        console.error('Error updating Labels field:', error);
      }
    } else {
      console.error('Collection is not available');
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.")
      return
    }

    setUploading(true)
    setUploadProgress(0)
    setError(null)

    const formData = new FormData()
    formData.append('label', file)

    try {
      const response = await fetch(`http://144.172.71.72:3003/upload-label?filename=${orderId}.pdf`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setPdfExists(true)
        await fetchPdf()
        await updateItemLabels(orderId, true)
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      setError("Failed to upload the file. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!pdfExists) return;

    try {
      const response = await fetch(`http://144.172.71.72:3003/pdf/${orderId}.pdf`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setPdfExists(false);
        setPdfUrl(null);
        await updateItemLabels(orderId, false);
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError("Failed to delete the file. Please try again.");
    }
  };

  if (pdfExists === null) {
    return (
      <Card className="w-full max-w-3xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Shipping Label for Order {orderId}</CardTitle>
      </CardHeader>
      <CardContent>
        {pdfExists && pdfUrl ? (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <iframe 
                src={pdfUrl}
                width="100%" 
                height="600px" 
                className="border-0"
                title={`Shipping Label for Order ${orderId}`}
              />
            </div>
            <div className="flex justify-between">
              <Button className="w-auto" onClick={() => window.open(pdfUrl, '_blank')}>
                <Download className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              <Button variant="destructive" className="w-auto" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Label Found</AlertTitle>
              <AlertDescription>
                No shipping label has been uploaded for this order yet. You can upload one below.
              </AlertDescription>
            </Alert>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                dragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Input 
                id="pdf-upload" 
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange} 
                className="hidden"
              />
              <Label htmlFor="pdf-upload" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <File className="h-10 w-10 text-muted-foreground mb-2" />
                  <p className="text-lg font-semibold mb-1">Drag & Drop your PDF here</p>
                  <p className="text-sm text-muted-foreground mb-2">or click to select a file</p>
                  {file && (
                    <p className="text-sm font-medium text-primary">{file.name}</p>
                  )}
                </div>
              </Label>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">{uploadProgress}% uploaded</p>
              </div>
            )}
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading} 
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-current mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" /> Upload Label
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
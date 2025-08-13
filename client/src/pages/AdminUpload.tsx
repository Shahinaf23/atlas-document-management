import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress"; 
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface AdminUploadProps {
  project: string;
}

export default function AdminUpload({ project = "jeddah" }: AdminUploadProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'success' | 'error'>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, type }: { file: File; type: 'document_submittal' | 'shop_drawing' }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', type);

      console.log('🚀 Starting upload:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: type,
        mimeType: file.type
      });

      setUploadStatus('uploading');
      setUploadProgress(0);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const uploadEndpoint = project === 'emct' ? '/api/emct/admin/upload' : '/api/admin/upload-excel';
        const response = await fetch(uploadEndpoint, {
          method: 'POST',
          body: formData,
        });

        const result = await response.json();
        console.log('📤 Upload response:', result);

        if (!response.ok) {
          throw new Error(result.message || result.error || `Upload failed: ${response.statusText}`);
        }

        clearInterval(progressInterval);
        setUploadProgress(100);
        setUploadStatus('processing');

        return result;
      } catch (error) {
        clearInterval(progressInterval);
        setUploadStatus('error');
        console.error('❌ Upload error:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      setUploadStatus('success');
      console.log('✅ Upload successful:', data);
      
      toast({
        title: "Upload Successful",
        description: `Excel file uploaded successfully. Processed ${data.recordCount} records with ${data.validation?.errors || 0} warnings.`,
      });

      // Invalidate queries to refresh data based on project
      const documentsKey = project === 'emct' ? '/api/emct/documents' : '/api/documents';
      const shopDrawingsKey = project === 'emct' ? '/api/emct/shop-drawings' : '/api/shop-drawings';
      
      queryClient.invalidateQueries({ queryKey: [documentsKey] });
      queryClient.invalidateQueries({ queryKey: [shopDrawingsKey] });
      
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 3000);
    },
    onError: (error: Error) => {
      setUploadStatus('error');
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload Excel file. Please try again.",
        variant: "destructive",
      });
      
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 3000);
    },
  });

  const refreshDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/refresh-excel', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to refresh data');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Data Refreshed",
        description: "Dashboard data has been refreshed from Excel files.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shop-drawings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh data.",
        variant: "destructive",
      });
    },
  });

  const handleUpload = (type: 'document_submittal' | 'shop_drawing') => {
    if (!selectedFile) {
      toast({
        title: "No File Selected",
        description: "Please select a file to upload.",
        variant: "destructive",
      });
      return;
    }
    
    if (!selectedFile.name.endsWith('.xlsx')) {
      toast({
        title: "Invalid File Format",
        description: "Please upload an Excel (.xlsx) file.",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate({ file: selectedFile, type });
  };

  const getStatusIcon = () => {
    switch (uploadStatus) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'uploading':
      case 'processing':
        return <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Upload className="h-4 w-4" />;
    }
  };

  const getStatusMessage = () => {
    switch (uploadStatus) {
      case 'uploading':
        return 'Uploading file...';
      case 'processing':
        return 'Processing Excel data...';
      case 'success':
        return 'Upload completed successfully!';
      case 'error':
        return 'Upload failed. Please try again.';
      default:
        return '';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document Submittal Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Document Submittal Log
            </CardTitle>
            <CardDescription>
              Upload the updated Document Submittal Log.xlsx file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="document-file">Excel File</Label>
                <Input
                  id="document-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      console.log('Document file selected:', file.name);
                    }
                  }}
                />
              </div>

              <Button
                onClick={() => handleUpload('document_submittal')}
                disabled={uploadMutation.isPending || uploadStatus !== 'idle' || !selectedFile}
                className="w-full"
              >
                {getStatusIcon()}
                <span className="ml-2">
                  {uploadStatus === 'idle' ? 'Upload Document Log' : getStatusMessage()}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shop Drawing Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Shop Drawing Log
            </CardTitle>
            <CardDescription>
              Upload the updated Shop Drawing Log.xlsx file
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shop-file">Excel File</Label>
                <Input
                  id="shop-file"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      console.log('Shop drawing file selected:', file.name);
                    }
                  }}
                />
              </div>

              <Button
                onClick={() => handleUpload('shop_drawing')}
                disabled={uploadMutation.isPending || uploadStatus !== 'idle' || !selectedFile}
                className="w-full"
              >
                {getStatusIcon()}
                <span className="ml-2">
                  {uploadStatus === 'idle' ? 'Upload Shop Drawing Log' : getStatusMessage()}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upload Progress */}
      {uploadStatus !== 'idle' && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Upload Progress</span>
                <span className="text-sm text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              
              {uploadStatus === 'success' && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Excel file uploaded and processed successfully. Dashboard data has been updated.
                  </AlertDescription>
                </Alert>
              )}
              
              {uploadStatus === 'error' && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Upload failed. Please check your file format and try again.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
}
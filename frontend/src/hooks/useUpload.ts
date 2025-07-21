import { useState } from "react";
import { uploadService, type UploadResponse } from "@/services/api";

export const useUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [response, setResponse] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [columns, setColumns] = useState<string[]>([]);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResponse(""); // Clear previous response
      setColumns([]); // Clear previous columns
      setUploadedFileName(null); // Clear previous upload
    }
  };

  const handleUpload = async (): Promise<boolean> => {
    if (!file) {
      setResponse("Please select a file");
      return false;
    }

    setIsUploading(true);
    setResponse("");

    try {
      const result: UploadResponse = await uploadService.uploadFile(file);
      setResponse(result.message);
      setUploadedFileName(result.filename);

      // Fetch columns after successful upload using fetchSchema (not fetchColumns)
      try {
        const { columns: fetchedColumns } = await uploadService.fetchSchema({
          filename: result.filename,
        });
        setColumns(fetchedColumns || []);
      } catch (columnError) {
        console.warn("Failed to fetch columns:", columnError);
        // Don't fail the upload if column fetching fails
      }

      return true;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Upload failed";
      setResponse(errorMessage);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setResponse("");
    setColumns([]);
    setUploadedFileName(null);
  };

  return {
    file,
    response,
    isUploading,
    columns,
    uploadedFileName,
    handleFileChange,
    handleUpload,
    clearFile,
    setColumns,
  };
};

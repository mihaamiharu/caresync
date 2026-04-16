import { useState, useCallback, useRef } from "react";
import { UploadCloudIcon, XIcon, Loader2, FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  error?: string;
}

interface FileUploadProps {
  onUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onUpload,
  accept,
  maxSizeMB = 10,
  disabled = false,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return `${file.name} exceeds ${maxSizeMB}MB limit`;
      }
      return null;
    },
    [maxSizeMB]
  );

  const addFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setValidationError(null);

      // Validate all files first
      const newUploadingFiles: UploadingFile[] = [];
      for (const file of Array.from(files)) {
        const error = validateFile(file);
        newUploadingFiles.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          progress: 0,
          error: error ?? undefined,
        });
      }

      setUploadingFiles((prev) => [...prev, ...newUploadingFiles]);

      // Upload valid files
      for (const uploadingFile of newUploadingFiles) {
        if (!uploadingFile.error) {
          try {
            await onUpload(uploadingFile.file);
            // Remove from uploading list on success
            setUploadingFiles((prev) =>
              prev.filter((f) => f.id !== uploadingFile.id)
            );
          } catch {
            // Mark as error but keep in list so user can see
            setUploadingFiles((prev) =>
              prev.map((f) =>
                f.id === uploadingFile.id
                  ? { ...f, error: "Upload failed. Try again." }
                  : f
              )
            );
          }
        }
      }
    },
    [onUpload, validateFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(e.target.files);
      // Reset input so same file can be selected again
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    [addFiles]
  );

  const removeFile = useCallback((id: string) => {
    setUploadingFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearError = useCallback(() => {
    setValidationError(null);
  }, []);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-accent/50",
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="sr-only"
          aria-label="File upload"
        />
        <UploadCloudIcon
          className={cn(
            "h-8 w-8",
            isDragging ? "text-primary" : "text-muted-foreground"
          )}
        />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {isDragging ? "Drop files here" : "Drag & drop or click to browse"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Maximum file size: {maxSizeMB}MB
          </p>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span>{validationError}</span>
          <button
            type="button"
            onClick={clearError}
            className="inline-flex items-center justify-center"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
          {uploadingFiles.map((uploadingFile) => (
            <li
              key={uploadingFile.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-card"
            >
              <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {uploadingFile.file.name}
                </p>
                {uploadingFile.error ? (
                  <p className="text-xs text-destructive">
                    {uploadingFile.error}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Uploading...</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeFile(uploadingFile.id)}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useState, useCallback } from "react";
import { FileIcon, DownloadIcon, Trash2Icon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { attachmentsApi } from "@/lib/attachments-api";
import type { MedicalRecordAttachment } from "@caresync/shared";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(fileType: string) {
  return FileIcon;
}

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete?: (attachmentId: string) => void;
  showDownload?: boolean;
  className?: string;
}

export function AttachmentList({
  attachments,
  onDelete,
  showDownload = true,
  className,
}: AttachmentListProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = useCallback(async (attachment: Attachment) => {
    setDownloadingId(attachment.id);
    try {
      const url = attachmentsApi.downloadUrl(attachment.fileUrl);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setDownloadingId(null);
    }
  }, []);

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium text-foreground">Attachments</p>
      <ul className="divide-y divide-border rounded-lg border border-border overflow-hidden">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment.fileType);
          const isDownloading = downloadingId === attachment.id;

          return (
            <li
              key={attachment.id}
              className="flex items-center gap-3 px-3 py-2.5 bg-card hover:bg-accent/50 transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">
                  {attachment.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.fileSize)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {showDownload && (
                  <button
                    type="button"
                    onClick={() => handleDownload(attachment)}
                    disabled={isDownloading}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                    title="Download"
                  >
                    {isDownloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <DownloadIcon className="h-4 w-4" />
                    )}
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => onDelete(attachment.id)}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete"
                  >
                    <Trash2Icon className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { apiClient } from "./api-client";
import type { MedicalRecordAttachment } from "@caresync/shared";

export interface ListAttachmentsParams {
  medicalRecordId: string;
}

export const attachmentsApi = {
  list: async (medicalRecordId: string): Promise<MedicalRecordAttachment[]> => {
    const res = await apiClient.get<MedicalRecordAttachment[]>(
      `/api/v1/medical-records/${medicalRecordId}/attachments`
    );
    return res.data;
  },

  upload: async (
    medicalRecordId: string,
    file: File
  ): Promise<MedicalRecordAttachment> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await apiClient.post<MedicalRecordAttachment>(
      `/api/v1/medical-records/${medicalRecordId}/attachments`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return res.data;
  },

  delete: async (attachmentId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/attachments/${attachmentId}`);
  },

  downloadUrl: (fileUrl: string): string => {
    // If it's already an absolute URL, return it
    if (fileUrl.startsWith("http")) return fileUrl;
    // Otherwise prepend the API base URL
    return `/api/v1${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
  },
};

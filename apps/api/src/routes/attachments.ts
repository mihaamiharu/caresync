import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { eq, and } from "drizzle-orm";
import { db } from "../db";
import {
  medicalRecordAttachments,
  medicalRecords,
  appointments,
  patients,
  doctors,
  users,
} from "../db/schema";
import { requireAuth, requireRole } from "../middleware/auth";
import { uploadMiddleware } from "../lib/upload";
import { deleteFile } from "../lib/file-storage";
import type { AppEnv } from "../app";

export const attachmentsRoute = new OpenAPIHono<AppEnv>();

attachmentsRoute.use("/medical-records/:recordId/attachments", requireAuth);
attachmentsRoute.use("/medical-records/:recordId/attachments/*", requireAuth);

// ─── Shared schemas ────────────────────────────────────────────────────────────

const errorResponse = z.object({ message: z.string() });

const attachmentSchema = z.object({
  id: z.string(),
  medicalRecordId: z.string(),
  fileName: z.string(),
  fileUrl: z.string(),
  fileType: z.string(),
  fileSize: z.number(),
});

const recordIdParam = z.object({ recordId: z.string().uuid() });
const attachmentIdParam = z.object({
  recordId: z.string().uuid(),
  attachmentId: z.string().uuid(),
});

// ─── POST /medical-records/:recordId/attachments ────────────────────────────────

const uploadAttachmentRoute = createRoute({
  method: "post",
  path: "/medical-records/{recordId}/attachments",
  tags: ["Medical Record Attachments"],
  summary: "Upload an attachment to a medical record (doctor only)",
  security: [{ bearerAuth: [] }],
  middleware: [requireRole("doctor"), uploadMiddleware] as const,
  request: {
    params: recordIdParam,
  },
  responses: {
    201: {
      description: "Attachment uploaded",
      content: {
        "application/json": { schema: attachmentSchema },
      },
    },
    400: {
      description: "Validation error",
      content: { "application/json": { schema: errorResponse } },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Medical record not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

attachmentsRoute.openapi(uploadAttachmentRoute, async (c) => {
  const userId = c.get("userId");
  const { recordId } = c.req.valid("param");
  const uploadedFile = c.get("uploadedFile");

  // Fetch medical record
  const [record] = await db
    .select({
      id: medicalRecords.id,
      doctorId: medicalRecords.doctorId,
      appointmentId: medicalRecords.appointmentId,
    })
    .from(medicalRecords)
    .where(eq(medicalRecords.id, recordId))
    .limit(1);

  if (!record) {
    return c.json({ message: "Medical record not found" }, 404);
  }

  // Verify the requesting doctor owns this record
  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.userId, userId))
    .limit(1);

  if (!doctor || doctor.id !== record.doctorId) {
    return c.json({ message: "Forbidden" }, 403);
  }

  // Insert attachment
  const [created] = await db
    .insert(medicalRecordAttachments)
    .values({
      medicalRecordId: recordId,
      fileName: uploadedFile.originalName,
      fileUrl: uploadedFile.url,
      fileType: uploadedFile.mimeType,
      fileSize: uploadedFile.size,
    })
    .returning();

  return c.json(
    {
      id: created.id,
      medicalRecordId: created.medicalRecordId,
      fileName: created.fileName,
      fileUrl: created.fileUrl,
      fileType: created.fileType,
      fileSize: created.fileSize,
    },
    201
  );
});

// ─── GET /medical-records/:recordId/attachments ───────────────────────────────

const listAttachmentsRoute = createRoute({
  method: "get",
  path: "/medical-records/{recordId}/attachments",
  tags: ["Medical Record Attachments"],
  summary: "List attachments for a medical record",
  security: [{ bearerAuth: [] }],
  request: { params: recordIdParam },
  responses: {
    200: {
      description: "List of attachments",
      content: {
        "application/json": {
          schema: z.array(attachmentSchema),
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Medical record not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

attachmentsRoute.openapi(listAttachmentsRoute, async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const { recordId } = c.req.valid("param");

  // Fetch medical record with ownership info
  const [record] = await db
    .select({
      id: medicalRecords.id,
      patientId: medicalRecords.patientId,
      doctorId: medicalRecords.doctorId,
    })
    .from(medicalRecords)
    .where(eq(medicalRecords.id, recordId))
    .limit(1);

  if (!record) {
    return c.json({ message: "Medical record not found" }, 404);
  }

  // Check access permissions
  if (role === "patient") {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    if (!patient || patient.id !== record.patientId) {
      return c.json({ message: "Forbidden" }, 403);
    }
  } else if (role === "doctor") {
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);
    if (!doctor || doctor.id !== record.doctorId) {
      return c.json({ message: "Forbidden" }, 403);
    }
  }
  // admin bypasses ownership check

  const rows = await db
    .select()
    .from(medicalRecordAttachments)
    .where(eq(medicalRecordAttachments.medicalRecordId, recordId));

  return c.json(
    rows.map((r) => ({
      id: r.id,
      medicalRecordId: r.medicalRecordId,
      fileName: r.fileName,
      fileUrl: r.fileUrl,
      fileType: r.fileType,
      fileSize: r.fileSize,
    })),
    200
  );
});

// ─── GET /medical-records/:recordId/attachments/:attachmentId ───────────────

const getAttachmentRoute = createRoute({
  method: "get",
  path: "/medical-records/{recordId}/attachments/{attachmentId}",
  tags: ["Medical Record Attachments"],
  summary: "Get a specific attachment",
  security: [{ bearerAuth: [] }],
  request: { params: attachmentIdParam },
  responses: {
    200: {
      description: "Attachment details",
      content: {
        "application/json": { schema: attachmentSchema },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Attachment not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

attachmentsRoute.openapi(getAttachmentRoute, async (c) => {
  const userId = c.get("userId");
  const role = c.get("userRole");
  const { recordId, attachmentId } = c.req.valid("param");

  const [record] = await db
    .select({
      id: medicalRecords.id,
      patientId: medicalRecords.patientId,
      doctorId: medicalRecords.doctorId,
    })
    .from(medicalRecords)
    .where(eq(medicalRecords.id, recordId))
    .limit(1);

  if (!record) {
    return c.json({ message: "Medical record not found" }, 404);
  }

  // Access check
  if (role === "patient") {
    const [patient] = await db
      .select({ id: patients.id })
      .from(patients)
      .where(eq(patients.userId, userId))
      .limit(1);
    if (!patient || patient.id !== record.patientId) {
      return c.json({ message: "Forbidden" }, 403);
    }
  } else if (role === "doctor") {
    const [doctor] = await db
      .select({ id: doctors.id })
      .from(doctors)
      .where(eq(doctors.userId, userId))
      .limit(1);
    if (!doctor || doctor.id !== record.doctorId) {
      return c.json({ message: "Forbidden" }, 403);
    }
  }

  const [attachment] = await db
    .select()
    .from(medicalRecordAttachments)
    .where(
      and(
        eq(medicalRecordAttachments.id, attachmentId),
        eq(medicalRecordAttachments.medicalRecordId, recordId)
      )
    )
    .limit(1);

  if (!attachment) {
    return c.json({ message: "Attachment not found" }, 404);
  }

  return c.json(
    {
      id: attachment.id,
      medicalRecordId: attachment.medicalRecordId,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      fileType: attachment.fileType,
      fileSize: attachment.fileSize,
    },
    200
  );
});

// ─── DELETE /medical-records/:recordId/attachments/:attachmentId ─────────────

const deleteAttachmentRoute = createRoute({
  method: "delete",
  path: "/medical-records/{recordId}/attachments/{attachmentId}",
  tags: ["Medical Record Attachments"],
  summary: "Delete an attachment (doctor only, ownership enforced)",
  security: [{ bearerAuth: [] }],
  middleware: [requireRole("doctor")] as const,
  request: { params: attachmentIdParam },
  responses: {
    200: {
      description: "Attachment deleted",
      content: {
        "application/json": { schema: z.object({ message: z.string() }) },
      },
    },
    401: {
      description: "Not authenticated",
      content: { "application/json": { schema: errorResponse } },
    },
    403: {
      description: "Insufficient permissions",
      content: { "application/json": { schema: errorResponse } },
    },
    404: {
      description: "Attachment not found",
      content: { "application/json": { schema: errorResponse } },
    },
  },
});

attachmentsRoute.openapi(deleteAttachmentRoute, async (c) => {
  const userId = c.get("userId");
  const { recordId, attachmentId } = c.req.valid("param");

  // Get record with ownership check
  const [record] = await db
    .select({
      id: medicalRecords.id,
      doctorId: medicalRecords.doctorId,
    })
    .from(medicalRecords)
    .where(eq(medicalRecords.id, recordId))
    .limit(1);

  if (!record) {
    return c.json({ message: "Medical record not found" }, 404);
  }

  const [doctor] = await db
    .select({ id: doctors.id })
    .from(doctors)
    .where(eq(doctors.userId, userId))
    .limit(1);

  if (!doctor || doctor.id !== record.doctorId) {
    return c.json({ message: "Forbidden" }, 403);
  }

  const [attachment] = await db
    .select()
    .from(medicalRecordAttachments)
    .where(
      and(
        eq(medicalRecordAttachments.id, attachmentId),
        eq(medicalRecordAttachments.medicalRecordId, recordId)
      )
    )
    .limit(1);

  if (!attachment) {
    return c.json({ message: "Attachment not found" }, 404);
  }

  // Delete file from storage
  const storedName = attachment.fileUrl.split("/").pop() || "";
  await deleteFile(storedName);

  // Delete from database
  await db
    .delete(medicalRecordAttachments)
    .where(eq(medicalRecordAttachments.id, attachmentId));

  return c.json({ message: "Attachment deleted" }, 200);
});

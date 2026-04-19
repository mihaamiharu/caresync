import { z } from "zod";

export const prescriptionItemSchema = z.object({
  id: z.string().uuid().optional(),
  prescriptionId: z.string().uuid().optional(),
  medicationName: z.string().min(1, "Medication name is required").max(200),
  dosage: z.string().min(1, "Dosage is required").max(100),
  frequency: z.string().min(1, "Frequency is required").max(100),
  duration: z.string().min(1, "Duration is required").max(100),
  instructions: z.string().max(500).optional().nullable(),
});

export const prescriptionSchema = z.object({
  id: z.string().uuid(),
  medicalRecordId: z.string().uuid(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(prescriptionItemSchema).optional(),
});

export const createPrescriptionSchema = z.object({
  medicalRecordId: z.string().uuid("Invalid medical record ID"),
  notes: z.string().max(2000).optional().nullable(),
  items: z
    .array(prescriptionItemSchema)
    .min(1, "At least one medication item is required"),
});

export const updatePrescriptionSchema = z.object({
  notes: z.string().max(2000).optional().nullable(),
  items: z
    .array(prescriptionItemSchema)
    .min(1, "At least one medication item is required"),
});

export const listPrescriptionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().optional(),
  medicalRecordId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
  doctorId: z.string().uuid().optional(),
});

export const prescriptionResponseSchema = z.object({
  id: z.string().uuid(),
  medicalRecordId: z.string().uuid(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(prescriptionItemSchema),
  medicalRecord: z
    .object({
      id: z.string().uuid(),
      diagnosis: z.string(),
      appointmentDate: z.string(),
      type: z.string(),
      status: z.string(),
    })
    .optional(),
});

export type PrescriptionItemInput = z.infer<typeof prescriptionItemSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof updatePrescriptionSchema>;
export type ListPrescriptionsQuery = z.infer<
  typeof listPrescriptionsQuerySchema
>;
export type PrescriptionResponse = z.infer<typeof prescriptionResponseSchema>;

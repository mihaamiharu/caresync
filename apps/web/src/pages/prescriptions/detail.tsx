import { useLoaderData, Link, type LoaderFunctionArgs } from "react-router";
import { prescriptionsApi } from "@/lib/api-client";
import type { PrescriptionResponse } from "@caresync/shared";
import { ArrowLeft, Printer } from "lucide-react";

export async function prescriptionDetailLoader({ params }: LoaderFunctionArgs) {
  if (!params.id) throw new Error("Prescription ID is required");
  return prescriptionsApi.get(params.id);
}

export function PrescriptionDetailPage() {
  const prescription = useLoaderData() as PrescriptionResponse;

  const handlePrint = () => window.print();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/prescriptions"
            className="rounded-md border border-border p-2 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Prescription</h1>
            <p className="text-sm text-muted-foreground">
              {new Date(prescription.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
        >
          <Printer className="h-4 w-4" />
          Print
        </button>
      </div>

      <div className="print:hidden" />

      <div className="rounded-lg border border-border bg-card shadow-sm">
        {prescription.medicalRecord && (
          <div className="border-b border-border p-6">
            <h2 className="text-lg font-semibold mb-3">Medical Record</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Diagnosis</p>
                <p className="font-medium">
                  {prescription.medicalRecord.diagnosis}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Appointment Date</p>
                <p className="font-medium">
                  {prescription.medicalRecord.appointmentDate}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium capitalize">
                  {prescription.medicalRecord.type}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium capitalize">
                  {prescription.medicalRecord.status}
                </p>
              </div>
            </div>
            <div className="mt-3">
              <Link
                to={`/medical-records/${prescription.medicalRecord.id}`}
                className="text-sm text-primary hover:underline"
              >
                View Medical Record →
              </Link>
            </div>
          </div>
        )}

        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Medications</h2>
          {prescription.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No medications listed.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-2 font-medium">Medication</th>
                  <th className="pb-2 font-medium">Dosage</th>
                  <th className="pb-2 font-medium">Frequency</th>
                  <th className="pb-2 font-medium">Duration</th>
                  <th className="pb-2 font-medium">Instructions</th>
                </tr>
              </thead>
              <tbody>
                {prescription.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="py-3 font-medium">{item.medicationName}</td>
                    <td className="py-3">{item.dosage}</td>
                    <td className="py-3">{item.frequency}</td>
                    <td className="py-3">{item.duration}</td>
                    <td className="py-3 text-muted-foreground">
                      {item.instructions ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {prescription.notes && (
          <div className="border-t border-border p-6">
            <h2 className="text-lg font-semibold mb-2">Notes</h2>
            <p className="text-sm whitespace-pre-wrap">{prescription.notes}</p>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page {
            margin: 1cm;
          }
          body * {
            visibility: hidden;
          }
          div, span, p, h1, h2, table, thead, tbody, tr, th, td {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          a {
            text-decoration: none;
            color: inherit;
          }
        }
      `}</style>
    </div>
  );
}

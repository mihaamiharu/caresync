ALTER TABLE "appointments" ADD CONSTRAINT "uq_appointments_doctor_date_time" UNIQUE("doctor_id","appointment_date","start_time");

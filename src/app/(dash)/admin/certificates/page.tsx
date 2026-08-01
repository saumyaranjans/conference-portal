import { CertificateOffice } from "@/components/CertificateOffice";
import { requireRole } from "@/lib/auth";

export default async function AdminCertificatesPage() {
  await requireRole("admin");
  return <CertificateOffice />;
}

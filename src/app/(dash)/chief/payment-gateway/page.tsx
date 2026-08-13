import { PageHeader } from "@/components/ui/Primitives";
import { PaymentGatewayConfig } from "@/components/PaymentGatewayConfig";
import { loadGatewayConfig } from "@/lib/paymentConfigActions";

/**
 * Convener-only. loadGatewayConfig calls requireUserManagement(), which admits
 * an outright Convener holding manage rights and nobody else — not Editorial
 * Office by courtesy, and not a view-only Convener. These settings decide
 * where real money goes.
 */
export default async function PaymentGatewayPage() {
  const config = await loadGatewayConfig();
  return (
    <>
      <PageHeader
        title="Payment Gateway"
        subtitle="Credentials and settings for online registration payments."
      />
      <PaymentGatewayConfig config={config} />
    </>
  );
}

import { useEffect } from "react";
import { InvoiceList } from "@/components/billing/invoice-list";
import { usePageTitle } from "@/context/page-context";
import { useAuth } from "@/context/auth-context";

export default function Billing() {
  const { setPageInfo } = usePageTitle();
  const { user } = useAuth();
  const isPractitioner = user?.role === 'practitioner';

  useEffect(() => {
    if (isPractitioner) {
      setPageInfo("Service Billing", "Manage recovery service billing and payment processing");
    } else {
      setPageInfo("Billing & Invoices", "Manage patient billing and payment processing");
    }
  }, [setPageInfo, isPractitioner]);

  const handleNewInvoice = () => {
    // This will be handled by the InvoiceList component
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <InvoiceList onNewInvoice={handleNewInvoice} />
      </div>
    </div>
  );
}

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { DownloadIcon, MoreVertical } from "lucide-react";
import React from "react";
import { useDistributor } from "@/cloud/distributor/contexts/DistributorProvider";
import { Invoice, InvoicePDF } from "@/cloud/msp/interfaces/Invoice";

type Props = {
  invoice: Invoice;
};

export default function InvoicesActionCell({ invoice }: Readonly<Props>) {
  const { isActive: isDistributor } = useDistributor();
  const apiRequestPath = isDistributor
    ? "/integrations/msp/reseller/invoices"
    : "/integrations/billing/invoices";

  const pdfInvoiceRequest = useApiCall<InvoicePDF>(apiRequestPath, true);

  const csvInvoiceRequest = useApiCall<Blob>(apiRequestPath, true, {
    blob: true,
  });

  const downloadCSV = async () => {
    let promise = csvInvoiceRequest
      .get(`/${invoice?.id}/csv`)
      .then((blob) => {
        let fileName = `${invoice.id}.csv`;

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      })
      .catch((error) => {
        throw error;
      });

    notify({
      title: `Download Invoice (CSV)`,
      description: `Downloading ${invoice.id}.csv...`,
      loadingMessage: `Getting invoice for this billing period...`,
      promise,
    });
    return promise;
  };

  const redirectToStripe = async () => {
    let promise = pdfInvoiceRequest.get(`/${invoice?.id}/pdf`);
    notify({
      title: `Download Invoice (PDF)`,
      description: `Redirecting to Stripe to download the invoice...`,
      loadingMessage: `Getting invoice for this billing period...`,
      promise,
    });
    return promise;
  };

  return (
    <div className={"flex gap-4 items-center justify-end ml-auto"}>
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild={true}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <Button variant={"secondary"} className={"!px-3"}>
            <MoreVertical size={16} className={"shrink-0"} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-auto" align="end">
          <DropdownMenuItem
            onClick={() => {
              redirectToStripe().then((r) => {
                if (r?.url) window.open(r.url, "_blank");
              });
            }}
          >
            <div className={"flex gap-3 items-center justify-center pr-3"}>
              <DownloadIcon size={12} />
              Download as PDF
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={downloadCSV}>
            <div className={"flex gap-3 items-center justify-center pr-3"}>
              <DownloadIcon size={12} />
              Download as CSV
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

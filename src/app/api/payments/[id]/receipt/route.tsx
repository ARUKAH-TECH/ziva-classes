import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { renderToBuffer } from "@react-pdf/renderer";
import { getPaymentReceipt } from "@/lib/actions/payments";
import { getOrgBranding } from "@/lib/actions/organization";
import { PaymentReceiptPDF } from "@/lib/reports/payment-receipt-pdf";

export const runtime = "nodejs";

let cachedLogoDataUri: string | null = null;

async function getLogoDataUri(): Promise<string> {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  const filePath = path.join(process.cwd(), "public", "images", "ziva-logo-original.jpg");
  const buffer = await readFile(filePath);
  cachedLogoDataUri = `data:image/jpeg;base64,${buffer.toString("base64")}`;
  return cachedLogoDataUri;
}

// getPaymentReceipt is RLS-scoped (not admin-gated) — an admin can print any
// receipt in their org, a parent only their own children's, and anyone
// unauthorized simply gets a null (404) rather than any data.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const receipt = await getPaymentReceipt(id);
  if (!receipt) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const [branding, logoDataUri] = await Promise.all([getOrgBranding(), getLogoDataUri()]);

  const buffer = await renderToBuffer(
    <PaymentReceiptPDF
      receipt={receipt}
      logoDataUri={logoDataUri}
      orgName={branding?.name ?? "ZIVA Online & Special Classes"}
      orgMotto={branding?.motto ?? "Excellence Our Hallmark"}
    />
  );

  const filename = `Receipt-${receipt.student_name}-${receipt.payment_date}.pdf`.replace(/\s+/g, "-");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}

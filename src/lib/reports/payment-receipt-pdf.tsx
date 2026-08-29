import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import type { PaymentReceipt } from "@/lib/actions/payments";

const NAVY = "#0A1F44";
const GOLD = "#B8873C";
const INK = "#101828";
const MUTED = "#5B6472";
const BORDER = "#DCE1E8";
const SURFACE = "#F7F8FA";

const METHOD_LABEL: Record<string, string> = {
  MTN_MOBILE_MONEY: "MTN Mobile Money",
  CASH: "Cash",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: GOLD,
    paddingBottom: 12,
    marginBottom: 16,
  },
  logo: { width: 48, height: 48, borderRadius: 24 },
  headerCenter: { flex: 1, textAlign: "center" },
  orgName: { fontSize: 16, fontWeight: 700, color: NAVY },
  motto: { fontSize: 8, color: GOLD, textTransform: "uppercase", letterSpacing: 1, marginTop: 2 },
  title: { fontSize: 13, fontWeight: 700, color: NAVY, textAlign: "center", marginBottom: 16, textTransform: "uppercase", letterSpacing: 1 },
  identityBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: SURFACE,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    marginBottom: 16,
  },
  fieldLabel: { color: MUTED, fontSize: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  fieldValue: { color: NAVY, fontWeight: 700, fontSize: 11, marginTop: 2 },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: NAVY, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  table: { borderWidth: 1, borderColor: NAVY, marginBottom: 16 },
  tr: { flexDirection: "row" },
  th: { backgroundColor: NAVY, color: "#FFFFFF", padding: 6, fontSize: 9, fontWeight: 700 },
  td: { padding: 6, fontSize: 9, borderTopWidth: 1, borderTopColor: BORDER },
  colSubject: { width: "70%" },
  colAmount: { width: "30%", textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, paddingRight: 6 },
  totalLabel: { fontSize: 10, color: MUTED, marginRight: 12 },
  totalValue: { fontSize: 13, fontWeight: 700, color: NAVY },
  notes: { marginTop: 16, fontSize: 9, color: MUTED },
  signRow: { flexDirection: "row", gap: 24, marginTop: 40 },
  signBlock: { flex: 1 },
  signLine: { borderTopWidth: 1, borderTopColor: MUTED, marginTop: 28 },
  signLabel: { textAlign: "center", fontSize: 8, color: MUTED, marginTop: 3 },
  footer: { textAlign: "center", fontSize: 7, color: MUTED, marginTop: 24 },
});

export function PaymentReceiptPDF({
  receipt,
  logoDataUri,
  orgName,
  orgMotto,
}: {
  receipt: PaymentReceipt;
  logoDataUri: string;
  orgName: string;
  orgMotto: string;
}) {
  return (
    <Document title={`Receipt - ${receipt.student_name} - ${receipt.payment_date}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer's Image, not an HTML img; no alt prop exists */}
          <Image src={logoDataUri} style={styles.logo} />
          <View style={styles.headerCenter}>
            <Text style={styles.orgName}>{orgName}</Text>
            <Text style={styles.motto}>{orgMotto}</Text>
          </View>
        </View>

        <Text style={styles.title}>Payment Receipt</Text>

        <View style={styles.identityBox}>
          <View>
            <Text style={styles.fieldLabel}>Student</Text>
            <Text style={styles.fieldValue}>{receipt.student_name}</Text>
            <Text style={[styles.fieldLabel, { marginTop: 6 }]}>Student ID</Text>
            <Text style={styles.fieldValue}>{receipt.student_number}</Text>
          </View>
          <View>
            <Text style={styles.fieldLabel}>Receipt No.</Text>
            <Text style={styles.fieldValue}>{receipt.id.slice(0, 8).toUpperCase()}</Text>
            <Text style={[styles.fieldLabel, { marginTop: 6 }]}>Date</Text>
            <Text style={styles.fieldValue}>
              {new Date(receipt.payment_date).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
          <View>
            <Text style={styles.fieldLabel}>Method</Text>
            <Text style={styles.fieldValue}>{METHOD_LABEL[receipt.payment_method] ?? receipt.payment_method}</Text>
            <Text style={[styles.fieldLabel, { marginTop: 6 }]}>Reference</Text>
            <Text style={styles.fieldValue}>{receipt.reference ?? "—"}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Allocated To</Text>
        <View style={styles.table}>
          <View style={styles.tr}>
            <Text style={[styles.th, styles.colSubject]}>Description</Text>
            <Text style={[styles.th, styles.colAmount]}>Amount (GH₵)</Text>
          </View>
          {receipt.allocations.length === 0 ? (
            <View style={styles.tr}>
              <Text style={[styles.td, styles.colSubject]}>General payment</Text>
              <Text style={[styles.td, styles.colAmount]}>{receipt.amount.toFixed(2)}</Text>
            </View>
          ) : (
            receipt.allocations.map((a, i) => (
              <View style={styles.tr} key={i}>
                <Text style={[styles.td, styles.colSubject]}>{a.subject_name}</Text>
                <Text style={[styles.td, styles.colAmount]}>{a.amount_allocated.toFixed(2)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Amount Paid</Text>
          <Text style={styles.totalValue}>GH₵{receipt.amount.toFixed(2)}</Text>
        </View>

        {receipt.notes && <Text style={styles.notes}>Notes: {receipt.notes}</Text>}

        <View style={styles.signRow}>
          <View style={styles.signBlock}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Recorded by{receipt.recorded_by_name ? ` — ${receipt.recorded_by_name}` : ""}</Text>
          </View>
          <View style={styles.signBlock}>
            <View style={styles.signLine} />
            <Text style={styles.signLabel}>Received by / Signature</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          {orgName} · This receipt was generated electronically and is valid without a signature.
        </Text>
      </Page>
    </Document>
  );
}

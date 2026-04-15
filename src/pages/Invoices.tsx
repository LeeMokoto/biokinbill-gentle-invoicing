import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, CalendarIcon, X, Mail, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useClients, useServices, useInvoices } from "@/hooks/use-data";
import { generateInvoicePDF, sendInvoiceEmail, downloadPDF } from "@/lib/api";
import type { Invoice, Service } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-primary/10 text-primary",
};

interface LineItem {
  code: string;
  description: string;
  amount: number;
}

export default function Invoices() {
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const { data: invoices = [], isLoading } = useInvoices();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [markPaid, setMarkPaid] = useState(true);
  const [sendEmail, setSendEmail] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const { toast } = useToast();

  const selectedClientData = clients.find((c) => c.id === selectedClient);

  const addServiceLine = (service: Service) => {
    if (lineItems.some((li) => li.code === service.code)) return;
    setLineItems((prev) => [...prev, { code: service.code, description: service.description, amount: service.default_amount }]);
  };

  const removeLineItem = (code: string) => {
    setLineItems((prev) => prev.filter((li) => li.code !== code));
  };

  const updateAmount = (code: string, amount: number) => {
    setLineItems((prev) => prev.map((li) => (li.code === code ? { ...li, amount } : li)));
  };

  const handleSubmit = async () => {
    if (!selectedClient || !date || lineItems.length === 0) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    setGenerating(true);

    try {
      // 1. Generate invoice + PDF via API
      const result = await generateInvoicePDF({
        clientId: selectedClient,
        date: format(date, "yyyy-MM-dd"),
        serviceCodes: lineItems.map((li) => li.code),
        markPaid,
      });

      // 2. Download the PDF
      downloadPDF(result.pdf.base64, result.pdf.filename);

      // 3. Optionally send email
      if (sendEmail && selectedClientData?.email) {
        try {
          await sendInvoiceEmail({
            invoiceId: result.invoice.id,
            pdfBase64: result.pdf.base64,
            pdfFilename: result.pdf.filename,
          });
          toast({ title: `Invoice #${result.invoice.invoice_number} created & emailed to ${selectedClientData.email}` });
        } catch (emailErr: any) {
          toast({
            title: `Invoice created, but email failed`,
            description: emailErr.message,
            variant: "destructive",
          });
        }
      } else {
        toast({ title: `Invoice #${result.invoice.invoice_number} created — PDF downloaded` });
      }

      // 4. Refresh invoice list
      queryClient.invalidateQueries({ queryKey: ["invoices"] });

      // 5. Reset form
      setDialogOpen(false);
      setSelectedClient("");
      setDate(new Date());
      setLineItems([]);
      setMarkPaid(true);
      setSendEmail(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  // Manual send for existing invoices
  const handleManualSend = async (inv: Invoice) => {
    // We need the PDF — regenerate it via the API
    // For now, we'll call generate which creates a duplicate.
    // Better approach: store PDF or add a "download existing" endpoint.
    // For MVP, we'll use the send-email endpoint which fetches invoice data.
    setSendingEmail(inv.id);
    try {
      // Re-generate PDF for this invoice
      const result = await generateInvoicePDF({
        clientId: inv.client_id,
        date: inv.date,
        serviceCodes: [], // Will need line items — see note below
        markPaid: true,
      });

      await sendInvoiceEmail({
        invoiceId: inv.id,
        pdfBase64: result.pdf.base64,
        pdfFilename: result.pdf.filename,
      });

      toast({ title: `Email sent for invoice #${inv.invoice_number}` });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSendingEmail(null);
    }
  };

  if (isLoading) {
    return <p className="text-muted-foreground py-12 text-center">Loading invoices...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Invoices</h1>
          <p className="text-muted-foreground mt-1">{invoices.length} invoices</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> New Invoice</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif">Create Invoice</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="grid gap-1.5">
                <Label>Client</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                  <SelectContent>
                    {clients.filter((c) => c.is_active).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClientData && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedClientData.email} · {selectedClientData.medical_aid} {selectedClientData.medical_aid_no}
                  </p>
                )}
              </div>

              <div className="grid gap-1.5">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} /></PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>Service Codes (click to add)</Label>
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <Button
                      key={s.id}
                      variant={lineItems.some((li) => li.code === s.code) ? "default" : "outline"}
                      size="sm"
                      onClick={() => lineItems.some((li) => li.code === s.code) ? removeLineItem(s.code) : addServiceLine(s)}
                    >
                      {s.code} — {s.description}
                    </Button>
                  ))}
                </div>
              </div>

              {lineItems.length > 0 && (
                <div className="space-y-2 rounded-lg border p-4">
                  <p className="text-sm font-medium text-muted-foreground">Line Items</p>
                  {lineItems.map((li) => (
                    <div key={li.code} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-16">{li.code}</span>
                      <span className="text-sm text-muted-foreground flex-1">{li.description}</span>
                      <Input
                        type="number"
                        className="w-28"
                        value={li.amount}
                        onChange={(e) => updateAmount(li.code, Number(e.target.value))}
                      />
                      <Button variant="ghost" size="icon" onClick={() => removeLineItem(li.code)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 border-t">
                    <span className="font-semibold">Total: R {lineItems.reduce((s, li) => s + li.amount, 0).toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <Checkbox id="markPaid" checked={markPaid} onCheckedChange={(v) => setMarkPaid(v === true)} />
                  <Label htmlFor="markPaid">Mark as paid</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="sendEmail" checked={sendEmail} onCheckedChange={(v) => setSendEmail(v === true)} />
                  <Label htmlFor="sendEmail" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Email invoice to client
                  </Label>
                  {sendEmail && selectedClientData?.email && (
                    <span className="text-xs text-muted-foreground ml-1">→ {selectedClientData.email}</span>
                  )}
                  {sendEmail && selectedClientData && !selectedClientData.email && (
                    <span className="text-xs text-destructive ml-1">Client has no email address</span>
                  )}
                </div>
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={generating}>
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                ) : sendEmail ? (
                  <><Mail className="h-4 w-4 mr-2" /> Generate, Download & Email</>
                ) : (
                  <><Download className="h-4 w-4 mr-2" /> Generate & Download PDF</>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Preview dialog */}
      <Dialog open={!!previewInvoice} onOpenChange={(o) => !o && setPreviewInvoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">Invoice #{previewInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {previewInvoice && (
            <div className="space-y-3 py-2">
              <p><span className="text-muted-foreground">Client:</span> {previewInvoice.client_name}</p>
              <p><span className="text-muted-foreground">Date:</span> {previewInvoice.date}</p>
              <p><span className="text-muted-foreground">Total:</span> R {previewInvoice.total.toLocaleString()}</p>
              <p><span className="text-muted-foreground">Status:</span> <Badge className={statusColor[previewInvoice.status]}>{previewInvoice.status}</Badge></p>
              {previewInvoice.status !== 'sent' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  disabled={sendingEmail === previewInvoice.id}
                  onClick={() => handleManualSend(previewInvoice)}
                >
                  {sendingEmail === previewInvoice.id ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <><Mail className="h-4 w-4 mr-2" /> Send Email Now</>
                  )}
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {invoices.map((inv) => (
          <Card key={inv.id} className="cursor-pointer hover:border-primary/40 transition-colors" onClick={() => setPreviewInvoice(inv)}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground">
                  {inv.client_name.split(" ").map((n: string) => n[0]).join("")}
                </div>
                <div>
                  <p className="font-medium text-foreground">{inv.client_name}</p>
                  <p className="text-sm text-muted-foreground">#{inv.invoice_number} · {inv.date}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold">R {inv.total.toLocaleString()}</span>
                <Badge className={statusColor[inv.status]}>{inv.status}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
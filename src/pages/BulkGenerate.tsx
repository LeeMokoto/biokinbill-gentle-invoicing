import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send, Download, Mail, Loader2, Check, X } from "lucide-react";
import { format } from "date-fns";
import { useClients, useServices } from "@/hooks/use-data";
import { generateBulkInvoicePDFs, sendBulkInvoiceEmails, downloadAllPDFs } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function BulkGenerate() {
  const { data: clients = [] } = useClients();
  const { data: services = [] } = useServices();
  const queryClient = useQueryClient();

  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [markPaid, setMarkPaid] = useState(true);
  const [sendEmails, setSendEmails] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<any>(null);
  const { toast } = useToast();

  const activeClients = clients.filter((c) => c.is_active);
  const allSelected = selectedClients.length === activeClients.length && activeClients.length > 0;

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelectedClients(allSelected ? [] : activeClients.map((c) => c.id));
  };

  const handleGenerate = async () => {
    if (selectedClients.length === 0 || selectedServices.length === 0 || !date) {
      toast({ title: "Select clients, services, and a date", variant: "destructive" });
      return;
    }

    setGenerating(true);
    setResults(null);

    try {
      const selectedSvcs = services.filter((s) => selectedServices.includes(s.id));
      const serviceCodes = selectedSvcs.map((s) => s.code);

      // 1. Generate all invoices + PDFs
      const bulkResult = await generateBulkInvoicePDFs({
        clientIds: selectedClients,
        date: format(date, "yyyy-MM-dd"),
        serviceCodes,
        markPaid,
      });

      // 2. Download all PDFs
      await downloadAllPDFs(bulkResult.invoices);

      // 3. Optionally send emails
      let emailResults = null;
      if (sendEmails) {
        const emailPayloads = bulkResult.invoices
          .filter((inv: any) => inv.clientEmail)
          .map((inv: any) => ({
            invoiceId: inv.id,
            pdfBase64: inv.pdf.base64,
            pdfFilename: inv.pdf.filename,
          }));

        if (emailPayloads.length > 0) {
          emailResults = await sendBulkInvoiceEmails(emailPayloads);
        }
      }

      setResults({ ...bulkResult, emailResults });

      const emailMsg = emailResults
        ? ` — ${emailResults.sent?.length || 0} emails sent`
        : '';
      toast({ title: `${bulkResult.count} invoices generated${emailMsg}` });

      // 4. Refresh
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      setSelectedClients([]);
      setSelectedServices([]);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const selectedSvcs = services.filter((s) => selectedServices.includes(s.id));
  const batchTotal = selectedClients.length * selectedSvcs.reduce((s, svc) => s + svc.default_amount, 0);

  // ─── Results screen ───
  if (results) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Batch Complete</h1>
          <p className="text-muted-foreground mt-1">{results.count} invoices generated</p>
        </div>

        <Card>
          <CardContent className="p-0 divide-y">
            {results.invoices.map((inv: any) => {
              const emailed = results.emailResults?.sent?.some((s: any) => s.invoiceId === inv.id);
              const emailFailed = results.emailResults?.failed?.some((f: any) => f.invoiceId === inv.id);
              return (
                <div key={inv.invoiceNumber} className="flex items-center gap-4 p-4">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-mono w-14">#{inv.invoiceNumber}</span>
                  <span className="flex-1 text-sm font-medium">{inv.clientName}</span>
                  <span className="text-sm font-semibold">
                    R {(selectedSvcs.reduce((s, svc) => s + svc.default_amount, 0)).toLocaleString()}
                  </span>
                  {emailed && <Badge className="bg-blue-100 text-blue-700">Emailed</Badge>}
                  {emailFailed && <Badge className="bg-red-100 text-red-700">Email failed</Badge>}
                  {!emailed && !emailFailed && <Badge className="bg-primary/10 text-primary">PDF downloaded</Badge>}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {results.emailResults?.failed?.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <p className="text-sm font-medium text-destructive mb-2">Failed emails:</p>
              {results.emailResults.failed.map((f: any) => (
                <p key={f.invoiceId} className="text-sm text-muted-foreground">{f.error}</p>
              ))}
            </CardContent>
          </Card>
        )}

        <Button variant="outline" onClick={() => setResults(null)}>Generate more</Button>
      </div>
    );
  }

  // ─── Main form ───
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif text-foreground">Bulk Generate</h1>
        <p className="text-muted-foreground mt-1">Generate invoices for multiple clients at once</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Clients */}
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-serif">Select Clients</Label>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {allSelected ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activeClients.map((client) => (
                <label
                  key={client.id}
                  className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedClients.includes(client.id)}
                    onCheckedChange={() => toggleClient(client.id)}
                  />
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                    {client.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm font-medium">{client.name}</span>
                    <p className="text-xs text-muted-foreground">{client.medical_aid} · {client.icd10_codes}</p>
                  </div>
                  {!client.email && <span className="text-xs text-destructive">No email</span>}
                </label>
              ))}
              {activeClients.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No active clients. Add clients first.</p>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{selectedClients.length} selected</p>
          </CardContent>
        </Card>

        {/* Services + Date + Options */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <Label className="text-base font-serif">Select Service Codes</Label>
              <div className="space-y-2">
                {services.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      checked={selectedServices.includes(s.id)}
                      onCheckedChange={() => toggleService(s.id)}
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium">{s.code}</span>
                      <span className="text-sm text-muted-foreground ml-2">{s.description}</span>
                    </div>
                    <span className="text-sm font-semibold">R {s.default_amount}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">{selectedServices.length} selected</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <Label className="text-base font-serif">Invoice Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={date} onSelect={setDate} /></PopoverContent>
              </Popover>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="markPaid" checked={markPaid} onCheckedChange={(v) => setMarkPaid(v === true)} />
                  <Label htmlFor="markPaid">Mark all as paid</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="sendEmails" checked={sendEmails} onCheckedChange={(v) => setSendEmails(v === true)} />
                  <Label htmlFor="sendEmails" className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Email invoices to clients
                  </Label>
                </div>
                {sendEmails && (
                  <p className="text-xs text-muted-foreground ml-6">
                    Each client will receive their invoice PDF as an email attachment.
                    Clients without an email address will be skipped.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          {selectedClients.length > 0 && selectedServices.length > 0 && (
            <Card>
              <CardContent className="p-5 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Clients</span><span className="font-semibold">{selectedClients.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Services each</span><span className="font-semibold">{selectedServices.length}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Per invoice</span><span className="font-semibold">R {selectedSvcs.reduce((s, svc) => s + svc.default_amount, 0).toLocaleString()}</span></div>
                <div className="flex justify-between border-t pt-2"><span className="text-muted-foreground">Batch total</span><span className="font-bold text-lg">R {batchTotal.toLocaleString()}</span></div>
              </CardContent>
            </Card>
          )}

          <Button
            size="lg"
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || selectedClients.length === 0 || selectedServices.length === 0}
          >
            {generating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating {selectedClients.length} invoices...</>
            ) : sendEmails ? (
              <><Send className="h-4 w-4 mr-2" /> Generate, Download & Email ({selectedClients.length})</>
            ) : (
              <><Download className="h-4 w-4 mr-2" /> Generate & Download ({selectedClients.length})</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
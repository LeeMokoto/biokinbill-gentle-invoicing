import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Send } from "lucide-react";
import { format } from "date-fns";
import { mockClients, mockServices } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function BulkGenerate() {
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const activeClients = mockClients.filter((c) => c.is_active);
  const allSelected = selectedClients.length === activeClients.length;

  const toggleClient = (id: string) => {
    setSelectedClients((prev) => prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]);
  };

  const toggleService = (id: string) => {
    setSelectedServices((prev) => prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    setSelectedClients(allSelected ? [] : activeClients.map((c) => c.id));
  };

  const handleGenerate = () => {
    if (selectedClients.length === 0 || selectedServices.length === 0 || !date) {
      toast({ title: "Select clients, services, and a date", variant: "destructive" });
      return;
    }
    toast({
      title: `${selectedClients.length} invoices queued`,
      description: "These will be generated once connected to the backend.",
    });
  };

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
                  <span className="text-sm font-medium">{client.name}</span>
                </label>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{selectedClients.length} selected</p>
          </CardContent>
        </Card>

        {/* Services + Date */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <Label className="text-base font-serif">Select Service Codes</Label>
              <div className="space-y-2">
                {mockServices.map((s) => (
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
            </CardContent>
          </Card>

          <Button size="lg" className="w-full" onClick={handleGenerate}>
            <Send className="h-4 w-4 mr-2" />
            Generate & Send ({selectedClients.length} invoices)
          </Button>
        </div>
      </div>
    </div>
  );
}

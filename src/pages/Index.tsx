import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, DollarSign, TrendingUp } from "lucide-react";
import { mockClients, mockInvoices } from "@/lib/mock-data";

const stats = [
  { label: "Total Clients", value: mockClients.length, icon: Users, color: "text-primary" },
  { label: "Invoices This Month", value: mockInvoices.length, icon: FileText, color: "text-info" },
  { label: "Monthly Revenue", value: `R ${mockInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0).toLocaleString()}`, icon: DollarSign, color: "text-primary" },
  { label: "All-Time Revenue", value: `R ${mockInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0).toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
];

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/10 text-info",
  paid: "bg-primary/10 text-primary",
};

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your practice billing</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-sans font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-sans">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-serif">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-sm font-semibold text-accent-foreground">
                    {inv.client_name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{inv.client_name}</p>
                    <p className="text-sm text-muted-foreground">{inv.invoice_number} · {inv.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-foreground">R {inv.total.toLocaleString()}</span>
                  <Badge className={statusColor[inv.status]}>{inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, FileText, TrendingUp, DollarSign, LogOut } from "lucide-react";
import { useClients, useInvoices } from "@/hooks/use-data";
import { supabase } from "@/lib/supabase";

const statusColor: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-info/10 text-info",
  paid: "bg-primary/10 text-primary",
};

export default function Index() {
  const { data: clients = [] } = useClients();
  const { data: invoices = [], isLoading } = useInvoices();

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthlyInvoices = invoices.filter((inv) => inv.date.startsWith(thisMonth));
  const monthlyRevenue = monthlyInvoices.reduce((s, inv) => s + inv.total, 0);
  const totalRevenue = invoices.reduce((s, inv) => s + inv.total, 0);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Wanderers Sports Medical Centre</p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" /> Sign out
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Clients</p>
              <p className="text-2xl font-bold">{clients.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center">
              <FileText className="h-5 w-5 text-accent-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoices</p>
              <p className="text-2xl font-bold">{invoices.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-2xl font-bold">R {monthlyRevenue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">All Time</p>
              <p className="text-2xl font-bold">R {totalRevenue.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">Recent Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-6">Loading...</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">No invoices yet. Create your first one!</p>
          ) : (
            <div className="space-y-2">
              {invoices.slice(0, 10).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                      {inv.client_name.split(" ").map((n: string) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{inv.client_name}</p>
                      <p className="text-xs text-muted-foreground">#{inv.invoice_number} · {inv.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">R {inv.total.toLocaleString()}</span>
                    <Badge className={statusColor[inv.status]}>{inv.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
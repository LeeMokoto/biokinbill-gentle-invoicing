import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { mockServices, type Service } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

export default function ServiceCodes() {
  const [services, setServices] = useState<Service[]>(mockServices);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newService: Service = {
      id: crypto.randomUUID(),
      code: fd.get("code") as string,
      description: fd.get("description") as string,
      default_amount: Number(fd.get("default_amount")),
      is_active: true,
    };
    setServices((prev) => [...prev, newService]);
    toast({ title: `Service ${newService.code} added` });
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    toast({ title: "Service removed" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Service Codes</h1>
          <p className="text-muted-foreground mt-1">{services.length} service codes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Service</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">New Service Code</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" placeholder="97110" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Therapeutic exercises" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="default_amount">Default Amount (R)</Label>
                <Input id="default_amount" name="default_amount" type="number" placeholder="450" required />
              </div>
              <Button type="submit" className="mt-2">Add Service</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {services.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                  {s.code}
                </div>
                <div>
                  <p className="font-medium text-foreground">{s.description}</p>
                  <p className="text-sm text-muted-foreground">R {s.default_amount.toLocaleString()}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

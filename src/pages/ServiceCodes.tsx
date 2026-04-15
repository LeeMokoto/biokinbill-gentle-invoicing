import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { useServices, useCreateService, useDeleteService } from "@/hooks/use-data";
import { useToast } from "@/hooks/use-toast";

export default function ServiceCodes() {
  const { data: services = [], isLoading } = useServices();
  const createService = useCreateService();
  const deleteService = useDeleteService();

  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const handleAdd = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    createService.mutate(
      {
        code: fd.get("code") as string,
        description: fd.get("description") as string,
        default_amount: Number(fd.get("default_amount")),
      },
      {
        onSuccess: () => {
          toast({ title: "Service code added" });
          setDialogOpen(false);
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteService.mutate(id, {
      onSuccess: () => toast({ title: "Service code removed" }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <p className="text-muted-foreground py-12 text-center">Loading service codes...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Service Codes</h1>
          <p className="text-muted-foreground mt-1">{services.length} billing codes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Code</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="font-serif">New Service Code</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="grid gap-4 py-2">
              <div className="grid gap-1.5">
                <Label htmlFor="code">Code</Label>
                <Input id="code" name="code" placeholder="91928" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="A rehab exercise program" required />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="default_amount">Default Amount (R)</Label>
                <Input id="default_amount" name="default_amount" type="number" placeholder="200" required />
              </div>
              <Button type="submit" className="mt-2" disabled={createService.isPending}>
                {createService.isPending ? "Adding..." : "Add Service Code"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {services.map((service) => (
          <Card key={service.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {service.code}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{service.description}</p>
                <p className="text-sm text-muted-foreground">Code: {service.code}</p>
              </div>
              <span className="font-semibold text-foreground">R {service.default_amount.toLocaleString()}</span>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(service.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
        {services.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No service codes yet</p>
        )}
      </div>
    </div>
  );
}
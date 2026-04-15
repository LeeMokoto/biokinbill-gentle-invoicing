import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Pencil, Trash2 } from "lucide-react";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/use-data";
import type { Client } from "@/lib/mock-data";
import { useToast } from "@/hooks/use-toast";

export default function Clients() {
  const { data: clients = [], isLoading } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const { toast } = useToast();

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.medical_aid.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = {
      name: fd.get("name") as string,
      contact_no: fd.get("contact_no") as string,
      email: fd.get("email") as string,
      medical_aid: fd.get("medical_aid") as string,
      medical_aid_no: fd.get("medical_aid_no") as string,
      icd10_codes: fd.get("icd10_codes") as string,
    };

    if (editing) {
      updateClient.mutate(
        { id: editing.id, ...data },
        {
          onSuccess: () => {
            toast({ title: "Client updated" });
            setEditing(null);
            setDialogOpen(false);
          },
          onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
        }
      );
    } else {
      createClient.mutate(data, {
        onSuccess: () => {
          toast({ title: "Client added" });
          setDialogOpen(false);
        },
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteClient.mutate(id, {
      onSuccess: () => toast({ title: "Client removed" }),
      onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return <p className="text-muted-foreground py-12 text-center">Loading clients...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif text-foreground">Clients</h1>
          <p className="text-muted-foreground mt-1">{clients.length} total clients</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Add Client</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-serif">{editing ? "Edit Client" : "New Client"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="grid gap-4 py-2">
              {[
                { name: "name", label: "Full Name", placeholder: "John Doe" },
                { name: "contact_no", label: "Contact Number", placeholder: "082 123 4567" },
                { name: "email", label: "Email", placeholder: "john@email.com" },
                { name: "medical_aid", label: "Medical Aid", placeholder: "Discovery" },
                { name: "medical_aid_no", label: "Medical Aid Number", placeholder: "DIS001234" },
                { name: "icd10_codes", label: "ICD-10 Codes", placeholder: "M54.5, R51" },
              ].map((field) => (
                <div key={field.name} className="grid gap-1.5">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder={field.placeholder}
                    defaultValue={editing ? (editing as any)[field.name] : ""}
                    required={field.name === "name"}
                  />
                </div>
              ))}
              <Button type="submit" className="mt-2" disabled={createClient.isPending || updateClient.isPending}>
                {editing ? "Save Changes" : "Add Client"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search clients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid gap-3">
        {filtered.map((client) => (
          <Card key={client.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-11 w-11 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-accent-foreground shrink-0">
                {client.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-foreground truncate">{client.name}</p>
                  {!client.is_active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <p className="text-sm text-muted-foreground truncate">{client.email} · {client.contact_no}</p>
                <p className="text-xs text-muted-foreground">{client.medical_aid} — {client.medical_aid_no}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => { setEditing(client); setDialogOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(client.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No clients found</p>
        )}
      </div>
    </div>
  );
}
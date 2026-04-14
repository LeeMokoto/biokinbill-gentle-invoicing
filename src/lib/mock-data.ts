export interface Client {
  id: string;
  name: string;
  contact_no: string;
  email: string;
  medical_aid: string;
  medical_aid_no: string;
  icd10_codes: string;
  is_active: boolean;
}

export interface Service {
  id: string;
  code: string;
  description: string;
  default_amount: number;
  is_active: boolean;
}

export interface Invoice {
  id: string;
  client_id: string;
  client_name: string;
  invoice_number: string;
  date: string;
  total: number;
  paid: boolean;
  status: "draft" | "sent" | "paid";
  sent_at: string | null;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  code: string;
  description: string;
  amount: number;
  sort_order: number;
}

export const mockClients: Client[] = [
  { id: "1", name: "Sarah Johnson", contact_no: "082 123 4567", email: "sarah@email.com", medical_aid: "Discovery", medical_aid_no: "DIS001234", icd10_codes: "M54.5, R51", is_active: true },
  { id: "2", name: "Michael Chen", contact_no: "073 987 6543", email: "michael.chen@email.com", medical_aid: "Bonitas", medical_aid_no: "BON005678", icd10_codes: "G43.9", is_active: true },
  { id: "3", name: "Emily Nkosi", contact_no: "061 555 8899", email: "emily.n@email.com", medical_aid: "Gems", medical_aid_no: "GEM009012", icd10_codes: "M79.3, M25.5", is_active: true },
  { id: "4", name: "David Pretorius", contact_no: "084 222 3344", email: "david.p@email.com", medical_aid: "Medihelp", medical_aid_no: "MED003456", icd10_codes: "S93.4", is_active: false },
];

export const mockServices: Service[] = [
  { id: "1", code: "97110", description: "Therapeutic exercises", default_amount: 450, is_active: true },
  { id: "2", code: "97140", description: "Manual therapy techniques", default_amount: 550, is_active: true },
  { id: "3", code: "97530", description: "Therapeutic activities", default_amount: 400, is_active: true },
  { id: "4", code: "97012", description: "Mechanical traction", default_amount: 300, is_active: true },
];

export const mockInvoices: Invoice[] = [
  { id: "1", client_id: "1", client_name: "Sarah Johnson", invoice_number: "INV-0001", date: "2026-04-10", total: 1000, paid: true, status: "paid", sent_at: "2026-04-10" },
  { id: "2", client_id: "2", client_name: "Michael Chen", invoice_number: "INV-0002", date: "2026-04-12", total: 550, paid: false, status: "sent", sent_at: "2026-04-12" },
  { id: "3", client_id: "3", client_name: "Emily Nkosi", invoice_number: "INV-0003", date: "2026-04-14", total: 850, paid: false, status: "draft", sent_at: null },
];

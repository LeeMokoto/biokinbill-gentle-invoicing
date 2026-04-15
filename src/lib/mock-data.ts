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


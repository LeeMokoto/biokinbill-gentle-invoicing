// ============================================================================
// src/lib/api.ts
// ============================================================================
// Helper functions to call the Vercel serverless API endpoints
// for PDF generation and email sending.
// ============================================================================

import { supabase } from './supabase';

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`,
  };
}

// ─── Generate Single Invoice PDF ───

export async function generateInvoicePDF(params: {
  clientId: string;
  date: string;
  serviceCodes: string[];
  markPaid: boolean;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/invoices/generate', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate invoice');
  }

  return await res.json();
}

// ─── Generate Bulk Invoice PDFs ───

export async function generateBulkInvoicePDFs(params: {
  clientIds: string[];
  date: string;
  serviceCodes: string[];
  markPaid: boolean;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/invoices/generate-bulk', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to generate invoices');
  }

  return await res.json();
}

// ─── Send Invoice Email ───

export async function sendInvoiceEmail(params: {
  invoiceId: string;
  pdfBase64: string;
  pdfFilename: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/invoices/send-email', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to send email');
  }

  return await res.json();
}

// ─── Send Bulk Invoice Emails ───

export async function sendBulkInvoiceEmails(invoices: {
  invoiceId: string;
  pdfBase64: string;
  pdfFilename: string;
}[]) {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/invoices/send-email', {
    method: 'POST',
    headers,
    body: JSON.stringify({ invoices }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to send emails');
  }

  return await res.json();
}

// ─── Download PDF Helper ───

export function downloadPDF(base64: string, filename: string) {
  const link = document.createElement('a');
  link.href = `data:application/pdf;base64,${base64}`;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Download All PDFs as Zip (optional, uses JSZip if installed) ───

export async function downloadAllPDFs(
  invoices: { pdf: { base64: string; filename: string } }[]
) {
  // If only one invoice, just download directly
  if (invoices.length === 1) {
    downloadPDF(invoices[0].pdf.base64, invoices[0].pdf.filename);
    return;
  }

  // For multiple, download each individually
  // (Could use JSZip for a single zip file, but keeping deps minimal)
  for (const inv of invoices) {
    downloadPDF(inv.pdf.base64, inv.pdf.filename);
    // Small delay so browser doesn't block multiple downloads
    await new Promise((r) => setTimeout(r, 300));
  }
}
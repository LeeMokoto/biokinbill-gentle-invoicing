// ============================================================================
// api/invoices/send-email.ts
// ============================================================================
// Vercel Serverless Function — emails a previously generated invoice PDF.
// Endpoint: POST /api/invoices/send-email
//
// Body: { invoiceId, pdfBase64, pdfFilename }
//   OR: { invoices: [{ invoiceId, pdfBase64, pdfFilename }] } for bulk
// ============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'billing@wandererssportsmed.co.za';
const FROM_NAME = process.env.RESEND_FROM_NAME || 'Wanderers Sports Medical Centre';

async function sendOne(invoice: any, client: any, pdfBase64: string, pdfFilename: string) {
  const fmtDate = invoice.date.split('-').reverse().join('/');
  const formattedTotal = `R ${Number(invoice.total).toFixed(2)}`;

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_EMAIL}>`,
    to: [client.email],
    subject: `Invoice #${invoice.invoice_number} — ${FROM_NAME}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #222; margin-bottom: 4px;">Invoice #${invoice.invoice_number}</h2>
        <p style="color: #666; margin-top: 0;">${fmtDate} &middot; ${formattedTotal}</p>
        <p>Dear ${client.name},</p>
        <p>Please find your invoice attached for services rendered at ${FROM_NAME}.</p>
        <table style="border-collapse: collapse; margin: 20px 0; width: 100%;">
          <tr style="background: #f8f8f8;">
            <td style="padding: 10px 16px; border: 1px solid #ddd; font-weight: bold;">Invoice Number</td>
            <td style="padding: 10px 16px; border: 1px solid #ddd;">#${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding: 10px 16px; border: 1px solid #ddd; font-weight: bold;">Date</td>
            <td style="padding: 10px 16px; border: 1px solid #ddd;">${fmtDate}</td>
          </tr>
          <tr style="background: #f8f8f8;">
            <td style="padding: 10px 16px; border: 1px solid #ddd; font-weight: bold;">Amount</td>
            <td style="padding: 10px 16px; border: 1px solid #ddd; font-weight: bold; color: #0a7c5a;">${formattedTotal}</td>
          </tr>
        </table>
        <p style="color: #666; font-size: 13px;">
          This invoice has been marked as paid. Please submit to your medical aid for reimbursement.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">
          ${FROM_NAME}<br />Wanderers Cricket Stadium<br />35 Corlett Drive, Illovo, 2195
        </p>
      </div>
    `,
    attachments: [{
      filename: pdfFilename,
      content: pdfBase64,
      contentType: 'application/pdf',
    }],
  });

  if (error) throw new Error(`Email to ${client.email} failed: ${error.message}`);
  return data;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing auth' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { invoiceId, pdfBase64, pdfFilename, invoices: bulkInvoices } = req.body;

    // ─── Bulk mode ───
    if (bulkInvoices && Array.isArray(bulkInvoices)) {
      const sent = [];
      const failed = [];

      for (const item of bulkInvoices) {
        try {
          const { data: invoice } = await supabase
            .from('invoices')
            .select('*, clients(*)')
            .eq('id', item.invoiceId)
            .eq('user_id', user.id)
            .single();

          if (!invoice || !invoice.clients?.email) {
            failed.push({ invoiceId: item.invoiceId, error: 'Invoice or client email not found' });
            continue;
          }

          await sendOne(invoice, invoice.clients, item.pdfBase64, item.pdfFilename);

          // Update status
          await supabase
            .from('invoices')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('id', item.invoiceId);

          sent.push({ invoiceId: item.invoiceId, email: invoice.clients.email });

          // Rate limit: 600ms between sends
          if (bulkInvoices.indexOf(item) < bulkInvoices.length - 1) {
            await new Promise((r) => setTimeout(r, 600));
          }
        } catch (err: any) {
          failed.push({ invoiceId: item.invoiceId, error: err.message });
        }
      }

      return res.status(200).json({ sent, failed });
    }

    // ─── Single mode ───
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*, clients(*)')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();

    if (invErr || !invoice) return res.status(404).json({ error: 'Invoice not found' });
    if (!invoice.clients?.email) return res.status(400).json({ error: 'Client has no email' });

    await sendOne(invoice, invoice.clients, pdfBase64, pdfFilename);

    await supabase
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invoiceId);

    return res.status(200).json({ success: true, email: invoice.clients.email });
  } catch (err: any) {
    console.error('Email error:', err);
    return res.status(500).json({ error: err.message });
  }
}
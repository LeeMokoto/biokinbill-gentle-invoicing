// ============================================================================
// api/invoices/generate.ts
// ============================================================================
// Vercel Serverless Function — generates a single invoice PDF.
// Endpoint: POST /api/invoices/generate
//
// Since @react-pdf/renderer is heavy (~30MB) and requires Node.js,
// we use jsPDF instead — lightweight, works in Vercel serverless.
// ============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for server-side ops
);

// ─── PDF Generation (jsPDF) ───

async function generateInvoicePDF(invoice: any, client: any, lineItems: any[], settings: any) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const dateStr = fmtDate(invoice.date);
  let y = 20;

  // Practice header
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.practice_venue || 'Wanderers Cricket Stadium', 20, y);
  doc.setFont('helvetica', 'normal');
  y += 5;
  doc.text(settings.practice_name || 'Wanderers Sports Medical Centre', 20, y);
  y += 5;
  doc.text(settings.practice_address || '35 Corlett Drive', 20, y);
  y += 5;
  doc.text(settings.practice_suburb || 'Illovo', 20, y);
  y += 5;
  doc.text(settings.practice_postal || '2195', 20, y);
  y += 10;

  // Statement title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'italic');
  doc.text('Statement', 20, y);
  y += 10;

  // Two-column meta
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Left column
  doc.setFont('helvetica', 'bold');
  doc.text('Patient name:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(client.name, 55, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Contact No:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(client.contact_no || '—', 55, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, 55, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Invoice #:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(invoice.invoice_number), 55, y);

  // Right column
  let ry = y - 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 115, ry);
  doc.setFont('helvetica', 'normal');
  doc.text(client.email || '—', 135, ry);
  ry += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('ICD 10 code:', 115, ry);
  doc.setFont('helvetica', 'normal');
  doc.text(client.icd10_codes || '—', 150, ry);
  ry += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Medical aid:', 115, ry);
  doc.setFont('helvetica', 'normal');
  doc.text(client.medical_aid || '—', 150, ry);
  ry += 5;

  doc.setFont('helvetica', 'bold');
  doc.text('Medical aid no:', 115, ry);
  doc.setFont('helvetica', 'normal');
  doc.text(client.medical_aid_no || '—', 155, ry);

  y += 12;

  // Table header
  const colX = [20, 50, 70, 155];
  const colW = [30, 20, 85, 35];
  const rowH = 8;

  doc.setFillColor(240, 240, 240);
  doc.rect(20, y, 170, rowH, 'F');
  doc.setDrawColor(187, 187, 187);
  doc.rect(20, y, 170, rowH, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Date', colX[0] + 2, y + 5.5);
  doc.text('Code', colX[1] + 2, y + 5.5);
  doc.text('Description', colX[2] + 2, y + 5.5);
  doc.text('Amount', colX[3] + 2, y + 5.5);

  // Vertical lines in header
  doc.line(colX[1], y, colX[1], y + rowH);
  doc.line(colX[2], y, colX[2], y + rowH);
  doc.line(colX[3], y, colX[3], y + rowH);

  y += rowH;

  // Table rows
  doc.setFont('helvetica', 'normal');
  for (const item of lineItems) {
    doc.rect(20, y, 170, rowH, 'S');
    doc.line(colX[1], y, colX[1], y + rowH);
    doc.line(colX[2], y, colX[2], y + rowH);
    doc.line(colX[3], y, colX[3], y + rowH);

    const desc = client.icd10_codes
      ? `${item.description} ${client.icd10_codes}`
      : item.description;

    doc.text(dateStr, colX[0] + 2, y + 5.5);
    doc.text(item.code, colX[1] + 2, y + 5.5);
    doc.text(desc.substring(0, 45), colX[2] + 2, y + 5.5);
    doc.text(`R ${Number(item.amount).toFixed(2)}`, colX[3] + 2, y + 5.5);
    y += rowH;
  }

  y += 4;

  // Totals
  const total = Number(invoice.total);
  const paid = Number(invoice.paid);
  const balance = total - paid;

  doc.setFont('helvetica', 'bold');
  doc.text('Please reimburse member', 20, y + 4);

  const totX = 135;
  const totW1 = 25;
  const totW2 = 30;

  // Total row
  doc.rect(totX, y, totW1, rowH, 'S');
  doc.rect(totX + totW1, y, totW2, rowH, 'S');
  doc.text('Total', totX + 2, y + 5.5);
  doc.text(`R ${total.toFixed(2)}`, totX + totW1 + 2, y + 5.5);
  y += rowH;

  // Paid row
  doc.rect(totX, y, totW1, rowH, 'S');
  doc.rect(totX + totW1, y, totW2, rowH, 'S');
  doc.text('Paid', totX + 2, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`R ${paid.toFixed(2)}`, totX + totW1 + 2, y + 5.5);
  y += rowH;

  // Balance row
  doc.setFont('helvetica', 'bold');
  doc.rect(totX, y, totW1, rowH, 'S');
  doc.rect(totX + totW1, y, totW2, rowH, 'S');
  doc.text('Balance', totX + 2, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(balance === 0 ? 'R -' : `R ${balance.toFixed(2)}`, totX + totW1 + 2, y + 5.5);

  return Buffer.from(doc.output('arraybuffer'));
}

// ─── Handler ───

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify auth from the Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { clientId, date, serviceCodes, markPaid = true } = req.body;

    // 1. Fetch client
    const { data: client, error: clientErr } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .single();

    if (clientErr || !client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // 2. Fetch practice settings
    const { data: settings } = await supabase
      .from('practice_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // 3. Fetch services
    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('user_id', user.id)
      .in('code', serviceCodes);

    const lineItems = (services || []).map((s: any) => ({
      code: s.code,
      description: s.description,
      amount: Number(s.default_amount),
    }));

    const total = lineItems.reduce((s: number, li: any) => s + li.amount, 0);
    const paid = markPaid ? total : 0;

    // 4. Claim invoice number
    const { data: invoiceNumber, error: numErr } = await supabase
      .rpc('claim_next_invoice_number', { p_user_id: user.id });
    if (numErr) {
      return res.status(500).json({ error: 'Failed to claim invoice number' });
    }

    // 5. Create invoice record
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        client_id: clientId,
        invoice_number: invoiceNumber,
        date,
        total,
        paid,
        status: markPaid ? 'paid' : 'draft',
      })
      .select()
      .single();

    if (invErr) {
      return res.status(500).json({ error: 'Failed to create invoice', details: invErr.message });
    }

    // 6. Insert line items
    const rows = lineItems.map((li: any, i: number) => ({
      invoice_id: invoice.id,
      code: li.code,
      description: li.description,
      amount: li.amount,
      sort_order: i,
    }));
    await supabase.from('invoice_line_items').insert(rows);

    // 7. Generate PDF
    const pdfBuffer = await generateInvoicePDF(
      { ...invoice, invoice_number: invoiceNumber },
      client,
      lineItems,
      settings || {}
    );

    const safeName = client.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const filename = `invoice_${invoiceNumber}_${safeName}.pdf`;

    // 8. Return PDF as base64
    return res.status(200).json({
      invoice: { ...invoice, invoice_number: invoiceNumber },
      pdf: {
        filename,
        base64: pdfBuffer.toString('base64'),
        mimeType: 'application/pdf',
      },
    });
  } catch (err: any) {
    console.error('Invoice generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}
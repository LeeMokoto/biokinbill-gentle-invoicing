// ============================================================================
// api/invoices/generate-bulk.ts
// ============================================================================
// Vercel Serverless Function — generates invoices for multiple clients.
// Endpoint: POST /api/invoices/generate-bulk
// ============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function generateInvoicePDF(invoice: any, client: any, lineItems: any[], settings: any) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const fmtDate = (d: string) => {
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  };

  const dateStr = fmtDate(invoice.date);
  let y = 20;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(settings.practice_venue || 'Wanderers Cricket Stadium', 20, y); y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(settings.practice_name || 'Wanderers Sports Medical Centre', 20, y); y += 5;
  doc.text(settings.practice_address || '35 Corlett Drive', 20, y); y += 5;
  doc.text(settings.practice_suburb || 'Illovo', 20, y); y += 5;
  doc.text(settings.practice_postal || '2195', 20, y); y += 10;

  doc.setFontSize(16);
  doc.setFont('helvetica', 'italic');
  doc.text('Statement', 20, y); y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Patient name:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(client.name, 55, y); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Contact No:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(client.contact_no || '—', 55, y); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, 55, y); y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice #:', 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(invoice.invoice_number), 55, y);

  let ry = y - 15;
  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 115, ry);
  doc.setFont('helvetica', 'normal');
  doc.text(client.email || '—', 135, ry); ry += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('ICD 10 code:', 115, ry);
  doc.setFont('helvetica', 'normal');
  doc.text(client.icd10_codes || '—', 150, ry); ry += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Medical aid:', 115, ry);
  doc.setFont('helvetica', 'normal');
  doc.text(client.medical_aid || '—', 150, ry); ry += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Medical aid no:', 115, ry);
  doc.setFont('helvetica', 'normal');
  doc.text(client.medical_aid_no || '—', 155, ry);

  y += 12;

  const colX = [20, 50, 70, 155];
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
  doc.line(colX[1], y, colX[1], y + rowH);
  doc.line(colX[2], y, colX[2], y + rowH);
  doc.line(colX[3], y, colX[3], y + rowH);
  y += rowH;

  doc.setFont('helvetica', 'normal');
  for (const item of lineItems) {
    doc.rect(20, y, 170, rowH, 'S');
    doc.line(colX[1], y, colX[1], y + rowH);
    doc.line(colX[2], y, colX[2], y + rowH);
    doc.line(colX[3], y, colX[3], y + rowH);
    const desc = client.icd10_codes ? `${item.description} ${client.icd10_codes}` : item.description;
    doc.text(dateStr, colX[0] + 2, y + 5.5);
    doc.text(item.code, colX[1] + 2, y + 5.5);
    doc.text(desc.substring(0, 45), colX[2] + 2, y + 5.5);
    doc.text(`R ${Number(item.amount).toFixed(2)}`, colX[3] + 2, y + 5.5);
    y += rowH;
  }

  y += 4;
  const total = Number(invoice.total);
  const paid = Number(invoice.paid);
  const balance = total - paid;
  const totX = 135, totW1 = 25, totW2 = 30;

  doc.setFont('helvetica', 'bold');
  doc.text('Please reimburse member', 20, y + 4);

  doc.rect(totX, y, totW1, rowH, 'S');
  doc.rect(totX + totW1, y, totW2, rowH, 'S');
  doc.text('Total', totX + 2, y + 5.5);
  doc.text(`R ${total.toFixed(2)}`, totX + totW1 + 2, y + 5.5);
  y += rowH;

  doc.rect(totX, y, totW1, rowH, 'S');
  doc.rect(totX + totW1, y, totW2, rowH, 'S');
  doc.text('Paid', totX + 2, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`R ${paid.toFixed(2)}`, totX + totW1 + 2, y + 5.5);
  y += rowH;

  doc.setFont('helvetica', 'bold');
  doc.rect(totX, y, totW1, rowH, 'S');
  doc.rect(totX + totW1, y, totW2, rowH, 'S');
  doc.text('Balance', totX + 2, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(balance === 0 ? 'R -' : `R ${balance.toFixed(2)}`, totX + totW1 + 2, y + 5.5);

  return Buffer.from(doc.output('arraybuffer'));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing auth' });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return res.status(401).json({ error: 'Unauthorized' });

    const { clientIds, date, serviceCodes, markPaid = true } = req.body;

    if (!clientIds?.length) return res.status(400).json({ error: 'No clients selected' });

    // Fetch all data
    const [{ data: clients }, { data: settings }, { data: services }] = await Promise.all([
      supabase.from('clients').select('*').in('id', clientIds).eq('user_id', user.id),
      supabase.from('practice_settings').select('*').eq('user_id', user.id).single(),
      supabase.from('services').select('*').eq('user_id', user.id).in('code', serviceCodes),
    ]);

    if (!clients?.length) return res.status(404).json({ error: 'No clients found' });

    const lineItemTemplate = (services || []).map((s: any) => ({
      code: s.code,
      description: s.description,
      amount: Number(s.default_amount),
    }));
    const total = lineItemTemplate.reduce((s: number, li: any) => s + li.amount, 0);
    const paid = markPaid ? total : 0;

    // Claim invoice numbers
    const { data: startNum, error: numErr } = await supabase
      .rpc('claim_invoice_numbers', { p_user_id: user.id, p_count: clients.length });
    if (numErr) return res.status(500).json({ error: 'Failed to claim invoice numbers' });

    const results = [];

    for (let i = 0; i < clients.length; i++) {
      const client = clients[i];
      const invoiceNumber = startNum + i;

      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          user_id: user.id,
          client_id: client.id,
          invoice_number: invoiceNumber,
          date, total, paid,
          status: markPaid ? 'paid' : 'draft',
        })
        .select().single();

      if (invErr) { console.error(invErr); continue; }

      await supabase.from('invoice_line_items').insert(
        lineItemTemplate.map((li: any, j: number) => ({
          invoice_id: invoice.id, code: li.code,
          description: li.description, amount: li.amount, sort_order: j,
        }))
      );

      const pdfBuffer = await generateInvoicePDF(
        { ...invoice, invoice_number: invoiceNumber },
        client, lineItemTemplate, settings || {}
      );

      const safeName = client.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

      results.push({
        invoiceNumber,
        clientName: client.name,
        clientEmail: client.email,
        pdf: {
          filename: `invoice_${invoiceNumber}_${safeName}.pdf`,
          base64: pdfBuffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      });
    }

    return res.status(200).json({ count: results.length, invoices: results });
  } catch (err: any) {
    console.error('Bulk generation error:', err);
    return res.status(500).json({ error: err.message });
  }
}
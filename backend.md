# BiokinBill — Backend Integration (PDF + Email)

Your project structure after integration:

```
biokinbill-gentle-invoicing/
├── api/                          ← NEW: Vercel serverless functions
│   └── invoices/
│       ├── generate.ts           ← Single invoice PDF
│       ├── generate-bulk.ts      ← Bulk invoice PDFs
│       └── send-email.ts         ← Email invoices via Resend
├── src/
│   ├── lib/
│   │   ├── supabase.ts           ← Already added (Phase 1)
│   │   └── api.ts                ← NEW: frontend helpers to call API
│   ├── hooks/
│   │   └── use-data.ts           ← Already added (Phase 1)
│   └── pages/                    ← Already updated (Phase 1)
├── vercel.json                   ← NEW: routing config
└── package.json                  ← Updated with new deps
```

---

## Step 1: Add the `api/` folder

Copy the entire `api/` folder to your project ROOT (next to `src/`,
not inside it). This is where Vercel looks for serverless functions.

```
api/
└── invoices/
    ├── generate.ts
    ├── generate-bulk.ts
    └── send-email.ts
```

---

## Step 2: Add `vercel.json`

Copy `vercel.json` to your project ROOT. It tells Vercel:
- Route `/api/*` requests to serverless functions
- Route everything else to `index.html` (SPA fallback)

---

## Step 3: Add `src/lib/api.ts`

Copy this file into your existing `src/lib/` folder. It provides
typed helper functions your pages use to call the backend:
- `generateInvoicePDF(...)` → calls `/api/invoices/generate`
- `generateBulkInvoicePDFs(...)` → calls `/api/invoices/generate-bulk`
- `sendInvoiceEmail(...)` → calls `/api/invoices/send-email`
- `downloadPDF(base64, filename)` → triggers browser download

---

## Step 4: Install new dependencies

```bash
npm install jspdf resend @vercel/node
npm install -D @types/node
```

Why jsPDF instead of @react-pdf/renderer?
- jsPDF is ~200KB vs ~30MB — fits easily in Vercel's 50MB limit
- Works in Node.js serverless functions without issues
- Produces clean PDFs matching Marilyn's Excel layout

---

## Step 5: Add environment variables in Vercel

Go to Vercel → Settings → Environment Variables and add:

| Variable                    | Value                                  |
|-----------------------------|----------------------------------------|
| `SUPABASE_SERVICE_ROLE_KEY` | (from Supabase → Settings → API)       |
| `RESEND_API_KEY`            | (from resend.com → API Keys)           |
| `RESEND_FROM_EMAIL`         | `billing@wandererssportsmed.co.za`     |
| `RESEND_FROM_NAME`          | `Wanderers Sports Medical Centre`      |

**Important:** The `SUPABASE_SERVICE_ROLE_KEY` is a SECRET key — never
prefix it with `VITE_` (that would expose it to the browser). The
serverless functions access it via `process.env` on the server side.

You should already have these from Phase 1:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Step 6: Deploy

```bash
git add .
git commit -m "Add PDF generation and email backend"
git push
```

Vercel will detect the `api/` folder and deploy the serverless
functions alongside your Vite frontend automatically.

---

## Step 7: Use in your pages

Here's how to call the backend from your Invoice creation flow:

```typescript
import { generateInvoicePDF, downloadPDF, sendInvoiceEmail } from '@/lib/api';

// In your handleSubmit:
const result = await generateInvoicePDF({
  clientId: selectedClient,
  date: '2026-07-01',
  serviceCodes: ['91928', '91927', '91929'],
  markPaid: true,
});

// Download the PDF
downloadPDF(result.pdf.base64, result.pdf.filename);

// Optionally email it
await sendInvoiceEmail({
  invoiceId: result.invoice.id,
  pdfBase64: result.pdf.base64,
  pdfFilename: result.pdf.filename,
});
```

---

## API Reference

### POST `/api/invoices/generate`

```json
{
  "clientId": "uuid",
  "date": "2026-07-01",
  "serviceCodes": ["91928", "91927", "91929"],
  "markPaid": true
}
```

Returns: `{ invoice, pdf: { filename, base64, mimeType } }`

### POST `/api/invoices/generate-bulk`

```json
{
  "clientIds": ["uuid1", "uuid2"],
  "date": "2026-07-01",
  "serviceCodes": ["91928", "91927", "91929"],
  "markPaid": true
}
```

Returns: `{ count, invoices: [{ invoiceNumber, clientName, pdf }] }`

### POST `/api/invoices/send-email`

Single: `{ invoiceId, pdfBase64, pdfFilename }`
Bulk: `{ invoices: [{ invoiceId, pdfBase64, pdfFilename }] }`

Returns: `{ sent: [...], failed: [...] }`
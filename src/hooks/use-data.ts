// ============================================================================
// src/hooks/use-data.ts
// ============================================================================
// React Query hooks that replace all mock data with live Supabase queries.
// Drop this file into src/hooks/ and update your page imports.
// ============================================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Client, Service, Invoice } from '@/lib/mock-data';

// ─── Auth ───

export function useSession() {
  return useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    },
  });
}

// ─── Clients ───

export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useCreateClient() {
  const qc = useQueryClient();
  return useMutation({
mutationFn: async (client: Omit<Client, 'id' | 'is_active'>) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  const { data, error } = await supabase
    .from('clients')
    .insert({ ...client, is_active: true, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useUpdateClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Client> & { id: string }) => {
      const { data, error } = await supabase
        .from('clients')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

export function useDeleteClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
}

// ─── Services ───

export function useServices() {
  return useQuery({
    queryKey: ['services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('code');
      if (error) throw error;
      return data as Service[];
    },
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (service: Omit<Service, 'id' | 'is_active'>) => {
      const { data, error } = await supabase
        .from('services')
        .insert({ ...service, is_active: true })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

export function useDeleteService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('services').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['services'] }),
  });
}

// ─── Invoices ───

export function useInvoices() {
  return useQuery({
    queryKey: ['invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('*, clients(name, email)')
        .order('invoice_number', { ascending: false });
      if (error) throw error;
      // Flatten client_name from the join
      return (data || []).map((inv: any) => ({
        ...inv,
        client_name: inv.clients?.name || 'Unknown',
        client_email: inv.clients?.email || '',
      })) as Invoice[];
    },
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      clientId: string;
      date: string;
      lineItems: { code: string; description: string; amount: number }[];
      markPaid: boolean;
    }) => {
      const { clientId, date, lineItems, markPaid } = params;
      const total = lineItems.reduce((s, li) => s + li.amount, 0);
      const paid = markPaid ? total : 0;

      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // 2. Claim invoice number atomically
      const { data: invoiceNumber, error: numErr } = await supabase
        .rpc('claim_next_invoice_number', { p_user_id: user.id });
      if (numErr) throw numErr;

      // 3. Insert invoice
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
        .select('*, clients(name, email)')
        .single();
      if (invErr) throw invErr;

      // 4. Insert line items
      const rows = lineItems.map((li, i) => ({
        invoice_id: invoice.id,
        code: li.code,
        description: li.description,
        amount: li.amount,
        sort_order: i,
      }));
      const { error: liErr } = await supabase
        .from('invoice_line_items')
        .insert(rows);
      if (liErr) throw liErr;

      return {
        ...invoice,
        client_name: invoice.clients?.name || 'Unknown',
        invoice_number: invoiceNumber,
      };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

export function useBulkCreateInvoices() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      clientIds: string[];
      date: string;
      services: { code: string; description: string; default_amount: number }[];
      markPaid: boolean;
    }) => {
      const { clientIds, date, services, markPaid } = params;
      const lineItems = services.map((s) => ({
        code: s.code,
        description: s.description,
        amount: s.default_amount,
      }));
      const total = lineItems.reduce((s, li) => s + li.amount, 0);
      const paid = markPaid ? total : 0;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Claim N invoice numbers atomically
      const { data: startNum, error: numErr } = await supabase
        .rpc('claim_invoice_numbers', {
          p_user_id: user.id,
          p_count: clientIds.length,
        });
      if (numErr) throw numErr;

      const created = [];

      for (let i = 0; i < clientIds.length; i++) {
        const invoiceNumber = startNum + i;

        const { data: invoice, error: invErr } = await supabase
          .from('invoices')
          .insert({
            user_id: user.id,
            client_id: clientIds[i],
            invoice_number: invoiceNumber,
            date,
            total,
            paid,
            status: markPaid ? 'paid' : 'draft',
          })
          .select('*, clients(name, email)')
          .single();

        if (invErr) {
          console.error(`Failed for client ${clientIds[i]}:`, invErr);
          continue;
        }

        const rows = lineItems.map((li, j) => ({
          invoice_id: invoice.id,
          code: li.code,
          description: li.description,
          amount: li.amount,
          sort_order: j,
        }));
        await supabase.from('invoice_line_items').insert(rows);

        created.push({
          ...invoice,
          client_name: invoice.clients?.name || 'Unknown',
          invoice_number: invoiceNumber,
        });
      }

      return created;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  });
}

// ─── Practice Settings ───

export function usePracticeSettings() {
  return useQuery({
    queryKey: ['practice-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('practice_settings')
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
  });
}
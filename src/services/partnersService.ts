import { supabase } from '@/lib/supabase';
import type { SponsorLeadInput } from '@/lib/validation';
import type { Partner, SponsorLead } from '@/types/models';

/** Active partner perks, featured first, then sort_order / name. */
export async function listActivePartners(): Promise<Partner[]> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('active', true)
    .is('deleted_at', null)
    .order('featured', { ascending: false })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Partner[];
}

export async function getPartner(partnerId: string): Promise<Partner> {
  const { data, error } = await supabase
    .from('partners')
    .select('*')
    .eq('id', partnerId)
    .single();

  if (error) throw error;
  return data as Partner;
}

/** Public sponsorship interest form → sponsor_leads. */
export async function submitSponsorLead(input: SponsorLeadInput): Promise<SponsorLead> {
  const { data, error } = await supabase
    .from('sponsor_leads')
    .insert({
      business_name: input.businessName.trim(),
      contact_name: input.contactName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() || null,
      category: input.category || null,
      proposed_offer: input.proposedOffer?.trim() || null,
      message: input.message?.trim() || null,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as SponsorLead;
}

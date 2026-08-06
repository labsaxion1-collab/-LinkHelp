import { useId, useState, type FormEvent } from 'react';
import { Check, LoaderCircle, Mail, MapPin, UserRound } from 'lucide-react';
import { motion } from 'motion/react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

type FormState = 'idle' | 'submitting' | 'success';

function trackingContext() {
  const params = new URLSearchParams(window.location.search);
  return { source: params.get('utm_source') || 'direct', campaign: params.get('utm_campaign'), utm_medium: params.get('utm_medium'), referrer: document.referrer || null };
}

export function WaitlistForm({ compact = false }: { compact?: boolean }) {
  const prefix = useId();
  const [state, setState] = useState<FormState>('idle');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError('');
    const data = new FormData(event.currentTarget);
    const firstName = String(data.get('firstName') ?? '').trim();
    const email = String(data.get('email') ?? '').trim().toLowerCase();
    const city = String(data.get('city') ?? '').trim();
    const userType = String(data.get('userType') ?? '');
    const consent = data.get('consent') === 'on';
    if (!firstName || !email || !city || !userType || !consent) { setError('Merci de remplir tous les champs et d’accepter de recevoir nos nouvelles.'); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError('Entrez une adresse courriel valide.'); return; }
    if (!isSupabaseConfigured()) { setError('La liste d’attente est momentanément indisponible. Réessayez bientôt.'); return; }
    setState('submitting');
    const tracking = trackingContext();
    const { error: insertError } = await getSupabase()!.from('waitlist').insert({ first_name: firstName, email, city, user_type: userType, language: 'fr-CA', source: tracking.source, campaign: tracking.campaign, utm_medium: tracking.utm_medium, referrer: tracking.referrer, consent_marketing: consent, status: 'waiting' });
    if (insertError) { setState('idle'); setError(insertError.code === '23505' ? 'Cette adresse est déjà sur la liste. Votre place est réservée!' : 'Impossible de confirmer votre inscription. Réessayez dans quelques instants.'); return; }
    setState('success');
  }

  if (state === 'success') return <motion.div initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-80 flex-col items-center justify-center rounded-[2rem] bg-[#eef6ff] p-8 text-center" role="status"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0866ff] text-white"><Check className="h-7 w-7" /></span><h3 className="mt-5 text-2xl font-bold text-[#0b1930]">Vous êtes sur la liste!</h3><p className="mt-3 max-w-sm text-sm leading-6 text-[#526178]">Merci. Nous vous écrirons dès que Link Help sera prêt dans votre communauté.</p></motion.div>;

  const inputClass = 'h-12 w-full rounded-xl border border-[#dce6f2] bg-white pl-11 pr-4 text-sm text-[#0b1930] outline-none transition placeholder:text-[#8a98aa] focus:border-[#0866ff] focus:ring-4 focus:ring-[#0866ff]/10';
  return <form onSubmit={submit} className="rounded-[2rem] border border-[#dce7f3] bg-white p-5 shadow-[0_24px_70px_rgba(23,63,110,.12)] sm:p-7" noValidate>
    {!compact && <div className="mb-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#0866ff]">Accès prioritaire</p><h2 className="mt-2 text-2xl font-bold text-[#0b1930]">Réservez votre place</h2><p className="mt-2 text-sm text-[#64748b]">Une minute suffit. Aucun paiement, aucun engagement.</p></div>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="relative block"><span className="sr-only">Prénom</span><UserRound aria-hidden className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#7b8ba1]" /><input id={`${prefix}-name`} name="firstName" autoComplete="given-name" className={inputClass} placeholder="Prénom" required /></label>
      <label className="relative block"><span className="sr-only">Courriel</span><Mail aria-hidden className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#7b8ba1]" /><input id={`${prefix}-email`} name="email" type="email" autoComplete="email" className={inputClass} placeholder="Courriel" required /></label>
      <label className="relative block sm:col-span-2"><span className="sr-only">Ville</span><MapPin aria-hidden className="pointer-events-none absolute left-4 top-3.5 h-5 w-5 text-[#7b8ba1]" /><input id={`${prefix}-city`} name="city" autoComplete="address-level2" className={inputClass} placeholder="Ville" required /></label>
    </div>
    <fieldset className="mt-5"><legend className="text-sm font-semibold text-[#26364d]">Je souhaite :</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{([['client','Trouver de l’aide'],['helper','Offrir mes services'],['both','Les deux']] as const).map(([value,label]) => <label key={value} className="cursor-pointer"><input className="peer sr-only" type="radio" name="userType" value={value} required /><span className="flex min-h-11 items-center justify-center rounded-xl border border-[#dce6f2] px-3 text-center text-xs font-semibold text-[#526178] transition peer-checked:border-[#0866ff] peer-checked:bg-[#eef6ff] peer-checked:text-[#0866ff] peer-focus-visible:ring-4">{label}</span></label>)}</div></fieldset>
    <label className="mt-5 flex cursor-pointer items-start gap-3 text-xs leading-5 text-[#64748b]"><input name="consent" type="checkbox" required className="mt-0.5 h-4 w-4 accent-[#0866ff]" /><span>J’accepte de recevoir des nouvelles de Link Help. Je peux me désabonner en tout temps.</span></label>
    {error && <p className="mt-4 rounded-xl bg-[#fff3f3] px-4 py-3 text-sm text-[#a83232]" role="alert">{error}</p>}
    <button disabled={state === 'submitting'} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0866ff] px-5 text-sm font-bold text-white shadow-[0_12px_26px_rgba(8,102,255,.25)] transition hover:-translate-y-0.5 hover:bg-[#0759de] focus-visible:ring-4 disabled:opacity-70" type="submit">{state === 'submitting' ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Inscription…</> : 'Je rejoins la liste d’attente'}</button>
    <p className="mt-3 text-center text-[11px] text-[#8a98aa]">Vos renseignements restent privés et servent uniquement au prélancement.</p>
  </form>;
}

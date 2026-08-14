import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const form = fs.readFileSync(path.join(root, 'src/components/landing/WaitlistForm.tsx'), 'utf8');
const edge = fs.readFileSync(path.join(root, 'supabase/functions/waitlist-signup/index.ts'), 'utf8');
const migration = fs.readFileSync(path.join(root, 'supabase/migrations/0054_secure_waitlist_leads.sql'), 'utf8');

describe('secure waitlist integration contract', () => {
  it('uses the Edge Function and never writes directly from the browser', () => {
    expect(form).toContain('submitWaitlistSignup(payload)');
    expect(form).not.toMatch(/\.from\(['"]waitlist/);
    expect(edge).toContain(".from('waitlist_leads')");
  });

  it('prevents duplicate clicks and exposes loading, success, duplicate and network states', () => {
    expect(form).toContain('if (submittingRef.current) return');
    expect(form).toContain("setState('submitting')");
    expect(form).toContain('Inscription en cours...');
    expect(form).toContain('Votre place est réservée 🎉');
    expect(form).toContain('Vous êtes déjà sur la liste d’attente.');
    expect(form).toContain('Une erreur est survenue. Veuillez réessayer.');
  });

  it('keeps marketing consent optional and includes a honeypot', () => {
    expect(form).toContain('name="consent" type="checkbox"');
    expect(form).not.toContain('name="consent" type="checkbox" required');
    expect(form).toContain('name="website"');
    expect(edge).toContain("validation.code === 'BOT_DETECTED'");
  });

  it('enforces case-insensitive uniqueness, private RLS and no legacy public inserts', () => {
    expect(migration).toContain('email extensions.citext not null');
    expect(migration).toContain('waitlist_leads_email_uidx');
    expect(migration).toContain('alter table public.waitlist_leads enable row level security');
    expect(migration).toContain('revoke all on table public.waitlist_leads from anon, authenticated');
    expect(migration).toContain('drop policy if exists waitlist_public_insert on public.waitlist');
  });

  it('implements idempotency and a server-side rate limit', () => {
    expect(edge).toContain("status: 'already_registered'");
    expect(edge).toContain("insertError?.code === '23505'");
    expect(edge).toContain(".rpc('check_waitlist_rate_limit'");
    expect(migration).toContain('create or replace function public.check_waitlist_rate_limit');
  });
});

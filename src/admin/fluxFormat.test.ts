import { describe, expect, it } from 'vitest';
import {
  CREDIT_TYPE_FILTER_OPTIONS,
  applicationStatusLabelPt,
  auditActionLabelPt,
  creditTypeLabelPt,
  formatAdminDateTime,
  formatCadAmount,
  formatCadFromCents,
  formatLc,
  requestStatusLabelPt,
  roleLabelPt,
} from './fluxFormat';
import { BACKOFFICE_PT, FLUX_AUTH_PT, FLUX_PT, formatBackofficeApiError } from './fluxPtCopy';

describe('fluxFormat visual maps', () => {
  it('maps roles without changing technical keys', () => {
    expect(roleLabelPt('client')).toBe('Cliente');
    expect(roleLabelPt('helper')).toBe('Help');
    expect(roleLabelPt('unknown_role')).toBe('unknown_role');
  });

  it('maps request statuses including aliases', () => {
    expect(requestStatusLabelPt('open')).toBe('Aberto');
    expect(requestStatusLabelPt('in_progress')).toBe('Em andamento');
    expect(requestStatusLabelPt('hired')).toBe('Contratado');
    expect(requestStatusLabelPt('completed')).toBe('Concluído');
    expect(requestStatusLabelPt('cancelled')).toBe('Cancelado');
    expect(requestStatusLabelPt('paused')).toBe('Pausado');
    expect(requestStatusLabelPt('client_cancelled')).toBe('Cancelado');
    expect(requestStatusLabelPt('weird_status')).toBe('weird_status');
  });

  it('maps application statuses', () => {
    expect(applicationStatusLabelPt('pending')).toBe('Pendente');
    expect(applicationStatusLabelPt('accepted')).toBe('Aprovado');
    expect(applicationStatusLabelPt('rejected')).toBe('Recusado');
    expect(applicationStatusLabelPt('mystery')).toBe('mystery');
  });

  it('maps credit types and keeps filter option values technical', () => {
    expect(creditTypeLabelPt('OBLIGATION_SETTLEMENT')).toBe('Quitação de obrigação');
    expect(creditTypeLabelPt('APPLICATION_INTEREST')).toBe('Interesse em candidatura');
    expect(creditTypeLabelPt('APPLICATION_SELECTED')).toBe('Seleção da candidatura');
    expect(creditTypeLabelPt('ADMIN_ADJUSTMENT')).toBe('Ajuste administrativo');
    expect(creditTypeLabelPt('REFUND')).toBe('Reembolso');
    expect(creditTypeLabelPt('UNKNOWN_TYPE')).toBe('UNKNOWN_TYPE');

    const values = CREDIT_TYPE_FILTER_OPTIONS.map((o) => o.value);
    expect(values).toEqual([
      'CREDIT_PURCHASE',
      'APPLICATION_INTEREST',
      'APPLICATION_SELECTED',
      'ADMIN_ADJUSTMENT',
      'REFUND',
    ]);
    expect(CREDIT_TYPE_FILTER_OPTIONS[0].value).toBe('CREDIT_PURCHASE');
    expect(CREDIT_TYPE_FILTER_OPTIONS[0].label).toBe('Compra de LinkCredits');
    expect(CREDIT_TYPE_FILTER_OPTIONS.every((o) => o.value !== o.label)).toBe(true);
  });

  it('formats CAD, LC and Toronto dates', () => {
    expect(formatCadFromCents(1200)).toBe('CAD $ 12,00');
    expect(formatCadAmount(14.99)).toBe('CAD $ 14,99');
    expect(formatLc(35)).toBe('35 LC');

    const formatted = formatAdminDateTime('2026-01-15T18:30:00.000Z');
    // America/Toronto winter = UTC-5 → 15/01/2026, 13:30
    expect(formatted).toMatch(/15\/01\/2026/);
    expect(formatted).toMatch(/13:30/);
  });

  it('maps known audit actions with safe fallback', () => {
    expect(auditActionLabelPt('users.view_detail')).toBe('Usuários — visualizar detalhes');
    expect(auditActionLabelPt('custom.thing')).toBe('custom · thing');
  });
});

describe('fluxPtCopy glossary and auth isolation', () => {
  it('uses confirmed glossary terms', () => {
    expect(FLUX_PT.navOverview).toBe('Visão geral');
    expect(FLUX_PT.metricOpenRequests).toBe('Chamados abertos');
    expect(BACKOFFICE_PT.navCredits).toBe('LinkCredits');
    expect(BACKOFFICE_PT.usersTabHelper).toBe('Helps');
    expect(BACKOFFICE_PT.colHelper).toBe('Help');
    expect(BACKOFFICE_PT.empty).toBe('Nenhum resultado encontrado');
  });

  it('keeps admin auth copy in Portuguese independently of marketplace locale', () => {
    expect(FLUX_AUTH_PT.kicker).toBe('Console FLUX');
    expect(FLUX_AUTH_PT.title).toBe('Acesso administrativo');
    expect(FLUX_AUTH_PT.subtitle).toContain('painel');
    expect(FLUX_AUTH_PT.submit).toBe('Entrar no FLUX');
    expect(FLUX_AUTH_PT.google).toBe('Continuar com Google');
    expect(FLUX_AUTH_PT.accessDeniedTitle).toBe('Acesso administrativo não autorizado');
  });

  it('maps selected API error codes without translating diagnostic unknowns', () => {
    expect(formatBackofficeApiError('USER_ID_REQUIRED')).toContain('usuário');
    expect(formatBackofficeApiError('METHOD_NOT_ALLOWED')).toContain('Método');
    expect(formatBackofficeApiError('SOME_DIAGNOSTIC_CODE')).toBe('SOME_DIAGNOSTIC_CODE');
  });

  it('resolves auth error keys always in Portuguese for admin', async () => {
    const { adminPtMessage } = await import('./fluxPtCopy');
    expect(adminPtMessage('auth.errors.env_not_ready')).not.toMatch(/not ready|environment/i);
    expect(adminPtMessage('login_page.google')).toBe('Continuar com Google');
  });
});

// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { pt } from '@/translations/pt';
import { CreateRequestModal } from './CreateRequestModal';
import { createRequestDraftStorageKey, loadCreateRequestDraft } from '@/utils/createRequestDraft';

const mocks = vi.hoisted(() => ({ createJob: vi.fn(), showToast: vi.fn(), onClose: vi.fn(), onPublished: vi.fn() }));
const t = (key: string) => key.split('.').reduce<any>((value, part) => value?.[part], pt) ?? key;
vi.mock('@/context/LanguageContext', () => ({ useLanguage: () => ({ t, language: 'pt' }) }));
vi.mock('@/context/AppDataContext', () => ({ useAppData: () => ({ createJob: mocks.createJob }) }));
vi.mock('@/context/ToastContext', () => ({ useToast: () => ({ showToast: mocks.showToast }) }));
vi.mock('@/hooks/useSessionViewer', () => ({ useSessionViewer: () => ({ id: 'test-client', name: 'Client', avatar: '' }) }));
vi.mock('@/config/baselineFinance', async (original) => ({ ...await original<object>(), isBaselineFinanceEnabled: () => true }));
vi.mock('@/components/layout/CloseToHomeButton', () => ({ CloseToHomeButton: () => null }));
vi.mock('@/components/layout/DesktopBackButton', () => ({ DesktopBackButton: () => null }));
// Only the external map input is replaced. Real detail, schedule and review components are rendered.
vi.mock('./RequestAddressInput', () => ({
  emptyRequestAddress: () => ({ address: '', city: '', region: '', postalCode: '', latitude: null, longitude: null, display: '' }),
  RequestAddressInput: () => React.createElement('span', null, 'Map input'),
}));

const address = { address: '1 Test St', city: 'Montreal', region: 'QC', postalCode: 'H1A1A1', latitude: 45.5, longitude: -73.5, display: '1 Test St, Montreal' };
function seed(overrides: Record<string, unknown> = {}) {
  localStorage.setItem(createRequestDraftStorageKey('test-client'), JSON.stringify({
    version: 1, step: 'review', selectedCategory: 'assembly', selectedSubcategory: 'ikea',
    postText: 'Montar móveis na sala', budgetType: 'fixed', budgetMin: '150', budgetMax: '220',
    serviceMode: 'in_person', requestAddress: address, preferredDateIso: '2099-10-20', preferredTimeSpecific: '10:00',
    ...overrides,
  }));
}
function open() { return render(React.createElement(MemoryRouter, null, React.createElement(CreateRequestModal, { open: true, onClose: mocks.onClose, onPublished: mocks.onPublished }))); }
function click(name: string) { fireEvent.click(screen.getByRole('button', { name, exact: true })); }
function resume() { open(); click(t('create_modal.draft_resume_continue')); }
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks(); mocks.createJob.mockResolvedValue(undefined);
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', { configurable: true, value: vi.fn() });
  window.matchMedia = vi.fn().mockImplementation(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('client request category workflow', () => {
  it('shows nine choices and only services related to the selected group', () => {
    open();
    expect(screen.getByRole('heading', { name: 'Do que você precisa?' })).toBeTruthy();
    for (const name of Object.values(pt.request_groups)) expect(screen.getByRole('button', { name })).toBeTruthy();
    click('Reparos e Instalações');
    expect(screen.getByRole('button', { name: t('service_subs.assembly.ikea') })).toBeTruthy();
    expect(screen.getByRole('button', { name: t('service_subs.renovation.plumbing') })).toBeTruthy();
    expect(screen.queryByRole('button', { name: t('service_subs.cleaning.house') })).toBeNull();
  });
  it('preserves description, address, dates and budget across back/category change and refresh', async () => {
    seed(); resume(); click('Alterar categoria e serviço'); click('Tecnologia e Serviços Digitais');
    click(t('service_subs.design.logo_brand'));
    expect((screen.getByRole('textbox', { name: t('create_modal.activity_description_label') }) as HTMLTextAreaElement).value).toBe('Montar móveis na sala');
    expect((screen.getByLabelText(t('create_modal.budget_min_label')) as HTMLInputElement).value).toBe('150');
    click('Voltar'); click('Voltar'); click('Reparos e Instalações'); click(t('service_subs.assembly.wardrobe'));
    await waitFor(() => expect(loadCreateRequestDraft('test-client')?.selectedSubcategory).toBe('wardrobe'), { timeout: 1500 });
    const draft = loadCreateRequestDraft('test-client')!;
    expect(draft.postText).toBe('Montar móveis na sala');
    expect(draft.budgetMax).toBe('220');
    expect(draft.requestAddress).toEqual(address);
    expect(draft.preferredDateIso).toBe('2099-10-20');
    cleanup(); resume();
    expect((screen.getByRole('textbox', { name: t('create_modal.activity_description_label') }) as HTMLTextAreaElement).value).toBe('Montar móveis na sala');
  });
  it('edits review sections and uses the original publication callback with specific IDs', async () => {
    seed(); resume(); click('Editar detalhes');
    fireEvent.change(screen.getByRole('textbox', { name: t('create_modal.activity_description_label') }), { target: { value: 'Descrição alterada' } });
    click('Continuar'); click('Continuar');
    expect(screen.getByText('Descrição alterada')).toBeTruthy();
    click('Editar data e horário'); click('Continuar'); click('Publicar pedido');
    await waitFor(() => expect(mocks.onPublished).toHaveBeenCalledOnce());
    expect(mocks.createJob).toHaveBeenCalledWith(expect.objectContaining({ category: 'assembly', subcategory: 'ikea', title: 'assembly:ikea', description: 'Descrição alterada', budgetMin: 150, budgetMax: 220 }));
    expect(mocks.createJob.mock.calls[0][0]).not.toHaveProperty('displayGroup');
    expect(loadCreateRequestDraft('test-client')).toBeNull();
  });
  it('keeps the draft and error state when publication fails, and allows retry', async () => {
    seed(); mocks.createJob.mockRejectedValueOnce(new Error('AUTH_REQUIRED')); resume();
    click('Publicar pedido');
    await waitFor(() => expect(mocks.showToast).toHaveBeenCalled());
    expect(mocks.onPublished).not.toHaveBeenCalled();
    expect(loadCreateRequestDraft('test-client')).not.toBeNull();
    expect((screen.getByRole('button', { name: 'Publicar pedido' }) as HTMLButtonElement).disabled).toBe(false);
    click('Publicar pedido');
    await waitFor(() => expect(mocks.onPublished).toHaveBeenCalledOnce());
  });
  it('blocks duplicate publication, editing and closing while loading', async () => {
    let finish!: () => void;
    mocks.createJob.mockReturnValue(new Promise<void>(resolve => { finish = resolve; }));
    seed(); resume(); click('Publicar pedido');
    expect((screen.getByRole('button', { name: 'Publicando pedido…' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: 'Editar detalhes' }) as HTMLButtonElement).disabled).toBe(true);
    click('Fechar');
    expect(mocks.onClose).not.toHaveBeenCalled();
    expect(mocks.createJob).toHaveBeenCalledOnce();
    await act(async () => { finish(); });
  });
  it('collects another service without inventing IDs, preserving it in draft and payload', async () => {
    seed(); resume(); click('Alterar categoria e serviço'); click('Outro serviço');
    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Que tipo de ajuda você precisa?'), { target: { value: 'Organizar livros' } });
    click('Continuar'); click('Continuar'); click('Continuar');
    expect(screen.getByText('Organizar livros')).toBeTruthy();
    click('Publicar pedido');
    await waitFor(() => expect(mocks.onPublished).toHaveBeenCalledOnce());
    expect(mocks.createJob).toHaveBeenCalledWith(expect.objectContaining({ category: 'other', subcategory: 'other', title: 'other:other', description: 'Montar móveis na sala\n\nTipo de ajuda: Organizar livros' }));
  });
  it('requires missing other text in old review drafts without invalidating historical requests', () => {
    seed({ selectedCategory: 'other', selectedSubcategory: 'other' }); resume(); click('Publicar pedido');
    expect(mocks.createJob).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Que tipo de ajuda você precisa?')).toBeTruthy();
  });
  it('rejects invalid category/subcategory pair restored from storage', () => {
    seed({ selectedCategory: 'assembly', selectedSubcategory: 'garden' }); resume(); click('Publicar pedido');
    expect(mocks.createJob).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Do que você precisa?' })).toBeTruthy();
  });
  it('keeps the existing address/budget/date validation and contact guard', () => {
    seed({ step: 'description', budgetMin: '300', budgetMax: '100' }); resume();
    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(t('create_modal.budget_max_label')), { target: { value: '400' } });
    fireEvent.change(screen.getByRole('textbox', { name: t('create_modal.activity_description_label') }), { target: { value: 'email@example.com' } });
    expect((screen.getByRole('button', { name: 'Continuar' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('restores a draft that contains only a display group', async () => {
    open(); click('Serviços Pessoais');
    await waitFor(() => expect(loadCreateRequestDraft('test-client')?.selectedDisplayGroup).toBe('personal'), { timeout: 1500 });
    cleanup(); resume();
    expect(screen.getByRole('button', { name: t('service_subs.translation.document') })).toBeTruthy();
  });
  it('provides dialog semantics, focus containment, and escape draft handling', async () => {
    open(); click('Reparos e Instalações');
    const dialog = screen.getByRole('dialog');
    dialog.focus();
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Voltar' }));
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.getByText(t('create_modal.draft_close_title'))).toBeTruthy();
  });
});

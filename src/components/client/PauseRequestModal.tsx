import { PremiumResponsiveModal } from '@/components/design-system/PremiumResponsiveModal';

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  confirming?: boolean;
};

export function PauseRequestModal({ open, onClose, onConfirm, confirming }: Props) {
  return (
    <PremiumResponsiveModal
      open={open}
      onClose={onClose}
      variant="default"
      title="Pausar?"
      footer={
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onConfirm}
            disabled={confirming}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-blue-300 bg-blue-600 px-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-60"
          >
            {confirming ? 'Aguarde…' : 'Sim, pausar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={confirming}
            className="inline-flex min-h-[48px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Não
          </button>
        </div>
      }
    >
      <div className="space-y-3 text-sm leading-relaxed text-slate-600">
        <p>
          Enquanto estiver pausado, este chamado deixará de aparecer no feed dos Helpers e não receberá novas
          candidaturas.
        </p>
        <p>
          As candidaturas já recebidas continuarão disponíveis e você poderá contratar um desses candidatos.
        </p>
        <p>Os créditos usados pelos Helpers permanecerão vinculados ao chamado enquanto ele estiver pausado.</p>
        <p>
          Se a data e hora previstas para o serviço forem ultrapassadas durante a pausa, o chamado será cancelado
          automaticamente e os créditos serão devolvidos integralmente aos Helpers.
        </p>
      </div>
    </PremiumResponsiveModal>
  );
}

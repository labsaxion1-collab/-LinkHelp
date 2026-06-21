import { MapPin, MessageCircle, Star, ClipboardList, Clock3, Coins } from 'lucide-react';
import { BRAND } from '@/utils/brandAssets';
import { useLanguage } from '@/context/LanguageContext';

function IllustrationCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2rem] bg-white p-6 shadow-[0_24px_60px_rgba(37,99,255,0.12)] ring-1 ring-[#2563FF]/8">
      {children}
    </div>
  );
}

export function ClientOnboardingStepVisual({ step }: { step: number }) {
  const { t } = useLanguage();

  if (step === 0) {
    return (
      <IllustrationCard>
        <div className="relative flex min-h-[200px] items-center justify-center overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#EAF2FF] via-white to-[#F0F7FF]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,255,0.16),transparent_55%)]" />
          <img
            src={BRAND.clientHomeHero}
            alt=""
            className="relative z-10 h-40 w-full object-contain object-bottom drop-shadow-[0_18px_32px_rgba(37,99,255,0.18)]"
            loading="lazy"
            decoding="async"
          />
          <img
            src={BRAND.linkCreditCoin}
            alt=""
            className="absolute bottom-3 right-3 z-20 h-12 w-12 object-contain drop-shadow-[0_8px_20px_rgba(37,99,255,0.25)]"
            loading="lazy"
            decoding="async"
          />
        </div>
      </IllustrationCard>
    );
  }

  if (step === 1) {
    return (
      <IllustrationCard>
        <div className="mx-auto w-[168px] rounded-[1.75rem] border-[6px] border-[#0B1220] bg-white p-2 shadow-[0_16px_40px_rgba(15,23,42,0.12)]">
          <div className="rounded-[1.1rem] bg-gradient-to-b from-[#F8FAFF] to-white p-3">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-200" />
            <div className="space-y-2">
              {[t('client_onboarding_tutorial.step2_item1'), t('client_onboarding_tutorial.step2_item2'), t('client_onboarding_tutorial.step2_item3')].map(
                (label, index) => (
                  <div key={label} className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 shadow-[0_4px_14px_rgba(37,99,255,0.08)] ring-1 ring-[#2563FF]/10">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#EAF2FF] text-[#2563FF]">
                      {index === 0 ? <ClipboardList className="h-3.5 w-3.5" /> : index === 1 ? <MapPin className="h-3.5 w-3.5" /> : <Clock3 className="h-3.5 w-3.5" />}
                    </span>
                    <span className="truncate text-[10px] font-bold text-[#0B1220]">{label}</span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </IllustrationCard>
    );
  }

  if (step === 2) {
    return (
      <IllustrationCard>
        <div className="relative min-h-[180px] overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#EAF2FF] to-white">
          <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(37,99,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(37,99,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="relative flex h-full min-h-[180px] items-center justify-center">
            <div className="relative h-28 w-28 rounded-full bg-[#2563FF]/10 ring-4 ring-[#2563FF]/15">
              <MapPin className="absolute left-1/2 top-3 h-8 w-8 -translate-x-1/2 text-[#2563FF]" fill="#2563FF" stroke="white" strokeWidth={1.5} />
              <span className="absolute left-4 top-10 h-3 w-3 rounded-full bg-[#2563FF] shadow-[0_0_0_4px_rgba(37,99,255,0.18)]" />
              <span className="absolute right-5 top-14 h-2.5 w-2.5 rounded-full bg-[#60A5FA] shadow-[0_0_0_3px_rgba(96,165,250,0.2)]" />
              <span className="absolute bottom-8 left-8 h-2.5 w-2.5 rounded-full bg-[#93C5FD]" />
            </div>
          </div>
        </div>
      </IllustrationCard>
    );
  }

  if (step === 3) {
    return (
      <IllustrationCard>
        <div className="space-y-2.5">
          {[
            { name: 'Marie L.', rating: '4.9', price: '$85' },
            { name: 'João P.', rating: '4.8', price: '$72' },
          ].map((helper) => (
            <div
              key={helper.name}
              className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-[#F8FAFF] to-white px-3 py-2.5 ring-1 ring-[#2563FF]/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2563FF] text-xs font-black text-white">
                {helper.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-black text-[#0B1220]">{helper.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-[#64748B]">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {helper.rating}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-[#EAF2FF] px-2.5 py-1 text-[10px] font-black text-[#2563FF]">{helper.price}</span>
            </div>
          ))}
        </div>
      </IllustrationCard>
    );
  }

  if (step === 4) {
    return (
      <IllustrationCard>
        <div className="min-h-[180px] rounded-[1.35rem] bg-gradient-to-b from-[#F8FAFF] to-white p-3">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563FF] text-[10px] font-black text-white">H</span>
            <span className="text-[10px] font-bold text-[#64748B]">Helper · online</span>
          </div>
          <div className="space-y-2">
            <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-[#2563FF] px-3 py-2 text-[10px] font-semibold leading-relaxed text-white shadow-[0_8px_20px_rgba(37,99,255,0.22)]">
              Posso ir amanhã às 14h!
            </div>
            <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white px-3 py-2 text-[10px] font-semibold leading-relaxed text-[#0B1220] shadow-[0_4px_14px_rgba(15,23,42,0.06)] ring-1 ring-slate-100">
              Perfeito, combinado.
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-[#2563FF]/10">
            <MessageCircle className="h-4 w-4 text-[#2563FF]" />
            <span className="text-[10px] font-semibold text-[#64748B]">Chat seguro LinkHelp</span>
          </div>
        </div>
      </IllustrationCard>
    );
  }

  return (
    <IllustrationCard>
      <div className="relative min-h-[200px] overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-[#EAF2FF] via-white to-[#F0F7FF]">
        <img
          src={BRAND.clientHomeHero}
          alt=""
          className="h-[200px] w-full object-cover object-[center_15%]"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-[0_12px_28px_rgba(37,99,255,0.18)] ring-1 ring-[#2563FF]/15">
          <img src={BRAND.linkCreditCoin} alt="" className="h-5 w-5 object-contain" loading="lazy" decoding="async" />
          <Coins className="h-4 w-4 text-[#2563FF]" />
        </div>
      </div>
    </IllustrationCard>
  );
}

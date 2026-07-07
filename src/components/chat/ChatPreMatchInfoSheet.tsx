import * as Icons from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ChatThreadSheetFrame } from '@/components/chat/ChatThreadSheetFrame';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function ChatPreMatchInfoSheet({ open, onClose }: Props) {
  const { t } = useLanguage();

  const bullets = [
    t('messages_page.pre_match_info_1'),
    t('messages_page.pre_match_info_2'),
    t('messages_page.pre_match_info_3'),
    t('messages_page.pre_match_info_4'),
    t('messages_page.pre_match_info_5'),
  ];

  return (
    <ChatThreadSheetFrame open={open} onClose={onClose} titleId="chat-prematch-info-title">
      <header className="flex shrink-0 items-center justify-between border-b border-indigo-100/80 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="rounded-xl border border-indigo-100 bg-white p-2 text-indigo-600 shadow-sm">
            <Icons.Lock className="h-4 w-4" />
          </div>
          <h2 id="chat-prematch-info-title" className="text-base font-black text-indigo-900/90">
            {t('messages_page.pre_match_info_title')}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full bg-white/80 p-2 text-slate-500 hover:bg-white hover:text-slate-800"
          aria-label={t('common.close')}
        >
          <Icons.X className="h-5 w-5" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <ul className="space-y-3">
          {bullets.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm font-medium leading-relaxed text-slate-700">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onClose}
          className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white transition-colors hover:bg-blue-700"
        >
          {t('messages_page.understood')}
        </button>
      </footer>
    </ChatThreadSheetFrame>
  );
}

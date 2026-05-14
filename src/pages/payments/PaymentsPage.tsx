import { Link } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { ROUTES } from '@/utils/constants';

export default function PaymentsPage() {
  const { t } = useLanguage();

  return (
    <div className="bg-[#f0f2f5] min-h-[calc(100vh-64px)] py-8 px-4 sm:px-6">
      <div className="max-w-lg mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-8 text-center">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <CreditCard className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">{t('app_pages.payments_title')}</h1>
        <p className="text-gray-500 font-medium mt-2 text-sm leading-relaxed">{t('app_pages.payments_sub')}</p>
        <Link
          to={ROUTES.home}
          className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
        >
          {t('app_pages.back_home')}
        </Link>
      </div>
    </div>
  );
}

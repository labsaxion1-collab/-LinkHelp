import type { Job } from '@/types/job';
import { ReputationDossierPanel } from '@/components/reputation/ReputationDossierPanel';
import { PublicProfileCloseBar } from '@/components/reputation/PublicProfileCloseBar';
import { useLanguage } from '@/context/LanguageContext';

type Props = {
  job: Job;
  onClose: () => void;
};

export function ClientPublicProfileView({ job, onClose }: Props) {
  const { t } = useLanguage();
  const location =
    [job.city, job.region].filter(Boolean).join(', ') || job.location || null;

  return (
    <div>
      <PublicProfileCloseBar onClose={onClose} closeLabel={t('common.close')} />
      <ReputationDossierPanel
        userId={job.clientId}
        role="client"
        displayName={job.clientName}
        avatar={job.clientAvatar}
        subtitle={location}
        averageRating={job.clientRating ?? null}
      />
    </div>
  );
}

import type { Job } from '@/types/job';
import { ReputationDossierPanel } from '@/components/reputation/ReputationDossierPanel';

type Props = {
  job: Job;
};

export function ClientPublicProfileView({ job }: Props) {
  const location =
    [job.city, job.region].filter(Boolean).join(', ') || job.location || null;

  return (
    <ReputationDossierPanel
      userId={job.clientId}
      role="client"
      displayName={job.clientName}
      avatar={job.clientAvatar}
      subtitle={location}
      averageRating={job.clientRating ?? null}
    />
  );
}

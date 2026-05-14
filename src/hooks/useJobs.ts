import { useMemo } from 'react';
import { useAppData } from '@/context/AppDataContext';

export function useJobs() {
  const { jobs, createJob } = useAppData();
  return useMemo(() => ({ jobs, createJob }), [jobs, createJob]);
}

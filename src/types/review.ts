export type ServiceReview = {
  id: string;
  requestId: string;
  reviewerId: string;
  targetUserId: string;
  rating: number;
  comment: string | null;
  createdAt: number;
};

export type PendingServiceReview = {
  requestId: string;
  targetUserId: string;
  targetName: string;
  targetAvatar: string;
  jobTitle: string;
  jobCategory: string;
};

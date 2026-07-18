export interface DemoUser {
  id: string;
  name: string;
  role: string;
  avatar: string;
  location: string;
  rating?: number;
  jobsCompleted?: number;
}

export interface MockUserBundle {
  client: DemoUser;
  helper: DemoUser;
}

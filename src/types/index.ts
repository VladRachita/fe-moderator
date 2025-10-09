
export interface IComment {
  id: string;
  text: string;
  author: string;
}

export interface IVideo {
  id: string;
  title: string;
  comments?: IComment[];
}

export interface IPendingVideo extends IVideo {
  presignedUrl: string;
}

export interface IModeratedVideo extends IVideo {
  status: VideoStatus;
  moderatedAt: string;
  moderator?: string;
}

export enum VideoStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export interface IAnalyticsSummary {
  approvedCount: number;
  rejectedCount: number;
  pendingLast24hCount: number;
}

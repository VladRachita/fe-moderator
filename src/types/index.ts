
export interface IComment {
  id: string;
  text: string;
  author: string;
}

export interface IPendingVideo {
  id: string;
  title: string;
  presignedUrl: string;
  comments: IComment[];
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

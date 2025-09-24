
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

export interface IVideo {
  id: string;
  title: string;
  status: 'approved' | 'rejected';
}

export enum VideoStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

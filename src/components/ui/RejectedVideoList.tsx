import React from 'react';
import { IModeratedVideo, VideoStatus } from '@/types';

interface IRejectedVideoListProps {
  videos: IModeratedVideo[];
}

const RejectedVideoList: React.FC<IRejectedVideoListProps> = ({ videos }) => {
  const rejectedVideos = videos.filter((video) => video.status === VideoStatus.REJECTED);

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Rejected Videos</h2>
      <div className="space-y-2">
        {rejectedVideos.length === 0 && <p className="text-sm text-gray-500">No rejections recorded.</p>}
        {rejectedVideos.map((video) => (
          <div key={video.id} className="flex items-center justify-between rounded-md bg-red-100 p-3">
            <div>
              <p className="font-semibold">{video.title}</p>
              {video.moderatedAt && (
                <p className="text-xs text-red-800">Reviewed {new Date(video.moderatedAt).toLocaleString()}</p>
              )}
            </div>
            <p className="text-sm font-medium text-red-800">Rejected</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RejectedVideoList;

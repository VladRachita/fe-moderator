
import React from 'react';
import { IVideo } from '@/types';

interface IRejectedVideoListProps {
  videos: IVideo[];
}

const RejectedVideoList: React.FC<IRejectedVideoListProps> = ({ videos }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Rejected Videos</h2>
      <div className="space-y-2">
        {videos.map((video) => (
          <div key={video.id} className="flex items-center justify-between rounded-md bg-red-100 p-3">
            <p className="font-semibold">{video.title}</p>
            <p className="text-sm font-medium text-red-800">Rejected</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RejectedVideoList;


import React from 'react';
import { IVideo } from '@/types';

interface IApprovedVideoListProps {
  videos: IVideo[];
}

const ApprovedVideoList: React.FC<IApprovedVideoListProps> = ({ videos }) => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Approved Videos</h2>
      <div className="space-y-2">
        {videos.map((video) => (
          <div key={video.id} className="flex items-center justify-between rounded-md bg-green-100 p-3">
            <p className="font-semibold">{video.title}</p>
            <p className="text-sm font-medium text-green-800">Approved</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovedVideoList;

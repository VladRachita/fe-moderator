import React from 'react';
import Image from 'next/image';
import { IPendingVideo } from '@/types';

interface IVideoListProps {
  videos: IPendingVideo[];
  selectedVideo: IPendingVideo | null;
  onSelectVideo: (video: IPendingVideo) => void;
}

const VideoList: React.FC<IVideoListProps> = ({ videos, selectedVideo, onSelectVideo }) => {
  return (
    <div className="flex w-1/3 flex-col border-r border-gray-200 bg-gray-50">
      <div className="flex-grow overflow-y-auto p-6 pb-0">
        <div className="mb-8">
          <h2 className="text-3xl font-bold">Video Reviews</h2>
          <p className="text-gray-500">Manage and review submitted videos.</p>
        </div>
        <h3 className="mb-4 text-lg font-semibold">Pending Reviews</h3>
        <div className="space-y-2">
          {videos.length > 0 ? (
            videos.map((video) => (
              <div
                key={video.id}
                className={`flex cursor-pointer items-center gap-4 rounded-md p-3 ${selectedVideo?.id === video.id ? 'bg-gray-100 ring-2 ring-black' : 'hover:bg-gray-100'}`}
                onClick={() => onSelectVideo(video)}
              >
                <div className="flex h-16 w-28 items-center justify-center rounded-md bg-gray-200">
                  <Image alt="thumbnail placeholder" src="/file.svg" width={32} height={32} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{video.title}</p>
                </div>
              </div>
            ))
          ) : (
            <p>No pending reviews.</p>
          )}
        </div>
      </div>

    </div>
  );
};

export default VideoList;
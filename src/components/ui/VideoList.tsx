import React from 'react';
import Image from 'next/image';
import { IPendingVideo } from '@/types';

interface IVideoListProps {
  videos: IPendingVideo[];
  selectedVideo: IPendingVideo | null;
  onSelectVideo: (video: IPendingVideo) => void;
  currentPage: number;
  onNextPage: () => void;
  onPrevPage: () => void;
  hasMore: boolean;
}

const VideoList: React.FC<IVideoListProps> = ({ videos, selectedVideo, onSelectVideo, currentPage, onNextPage, onPrevPage, hasMore }) => {
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
                <Image alt={`${video.title} Thumbnail`} className="rounded-md object-cover" src={video.presignedUrl} width={112} height={64} />
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
      <div className="mt-auto p-6">
        <nav className="flex items-center justify-between">
          <button onClick={onPrevPage} disabled={currentPage === 1} className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50">
            <span className="material-symbols-outlined text-xl">chevron_left</span>
          </button>
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-md bg-black text-sm font-medium text-white">{currentPage}</button>
          </div>
          <button onClick={onNextPage} disabled={!hasMore} className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 text-gray-500 hover:bg-gray-100 disabled:opacity-50">
            <span className="material-symbols-outlined text-xl">chevron_right</span>
          </button>
        </nav>
      </div>
    </div>
  );
};

export default VideoList;
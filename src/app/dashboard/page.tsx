
'use client';

import React, { useState, useEffect } from 'react';

import VideoList from '@/components/ui/VideoList';
import VideoPlayer from '@/components/ui/VideoPlayer';
import ApprovedVideoList from '@/components/ui/ApprovedVideoList';
import RejectedVideoList from '@/components/ui/RejectedVideoList';
import { getPendingVideos } from '@/services/video-service';
import { IPendingVideo, IModeratedVideo, VideoStatus } from '@/types';

const Page: React.FC = () => {
  const [videos, setVideos] = useState<IPendingVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<IPendingVideo | null>(null);
  const [approvedVideos, setApprovedVideos] = useState<IModeratedVideo[]>([]);
  const [rejectedVideos, setRejectedVideos] = useState<IModeratedVideo[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const pendingVideos = await getPendingVideos();
        setVideos(pendingVideos);
      } catch (error) {
        console.error('Failed to load moderation queue', error);
      }
    };

    fetchVideos();
  }, []);

  const handleStatusChange = (videoId: string, status: VideoStatus) => {
    const moderatedSource = selectedVideo ?? videos.find((video) => video.id === videoId) ?? null;

    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    setSelectedVideo(null);

    if (!moderatedSource) {
      return;
    }

    const moderatedVideo: IModeratedVideo = {
      id: moderatedSource.id,
      title: moderatedSource.title,
      comments: moderatedSource.comments,
      status,
      moderatedAt: new Date().toISOString(),
    };

    if (status === VideoStatus.APPROVED) {
      setApprovedVideos((prev) => [...prev, moderatedVideo]);
    } else if (status === VideoStatus.REJECTED) {
      setRejectedVideos((prev) => [...prev, moderatedVideo]);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col">
      <main className="flex flex-1 overflow-hidden">
        <VideoList videos={videos} onSelectVideo={setSelectedVideo} selectedVideo={selectedVideo} />
        <div className="flex flex-1 flex-col overflow-y-auto px-6 py-4">
          {selectedVideo ? (
            <VideoPlayer video={selectedVideo} onStatusChange={handleStatusChange} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-gray-300">
              <p className="text-gray-500">Select a pending video to begin moderation.</p>
            </div>
          )}
        </div>
        <div className="w-1/4 min-w-[260px] space-y-6 overflow-y-auto border-l border-gray-200 bg-white p-6">
          <ApprovedVideoList videos={approvedVideos} />
          <RejectedVideoList videos={rejectedVideos} />
        </div>
      </main>
    </div>
  );
};

export default Page;

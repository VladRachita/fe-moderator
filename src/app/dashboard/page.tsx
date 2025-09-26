
'use client';

import React, { useState, useEffect } from 'react';

import VideoList from '@/components/ui/VideoList';
import VideoPlayer from '@/components/ui/VideoPlayer';
import Comments from '@/components/ui/Comments';
import { getPendingVideos } from '@/services/video-service';
import { IPendingVideo } from '@/types';

const Page: React.FC = () => {
  const [videos, setVideos] = useState<IPendingVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<IPendingVideo | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const pendingVideos = await getPendingVideos();
        setVideos(pendingVideos);
      } catch (error) {
        // Handle error appropriately
      }
    };

    fetchVideos();
  }, []);




  const handleStatusChange = (videoId: string) => {
    const newVideos = videos.filter(v => v.id !== videoId);
    setVideos(newVideos);
    setSelectedVideo(null);
  };

  return (
    <div className="flex h-screen w-full flex-col">
      
      <main className="flex flex-1 overflow-hidden">
        <VideoList videos={videos} onSelectVideo={setSelectedVideo} selectedVideo={selectedVideo} />
        <div className="flex flex-1 flex-col overflow-y-auto">
          {selectedVideo && <VideoPlayer video={selectedVideo} onStatusChange={handleStatusChange} />}
          
        </div>
      </main>
    </div>
  );
};

export default Page;

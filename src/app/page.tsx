
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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const pendingVideos = await getPendingVideos(currentPage);
        setVideos(pendingVideos);
        if (pendingVideos.length > 0) {
          setSelectedVideo(pendingVideos[0]);
        } else {
          setSelectedVideo(null);
          setHasMore(false);
        }
      } catch (error) {
        // Handle error appropriately
      }
    };

    fetchVideos();
  }, [currentPage]);

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div className="flex h-screen w-full flex-col">
      
      <main className="flex flex-1 overflow-hidden">
        <VideoList videos={videos} onSelectVideo={setSelectedVideo} selectedVideo={selectedVideo} currentPage={currentPage} onNextPage={handleNextPage} onPrevPage={handlePrevPage} hasMore={hasMore} />
        <div className="flex flex-1 flex-col overflow-y-auto">
          {selectedVideo && <VideoPlayer video={selectedVideo} />}
          
        </div>
      </main>
    </div>
  );
};

export default Page;

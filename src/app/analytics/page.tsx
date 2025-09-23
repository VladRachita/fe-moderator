'use client';

import React, { useState, useEffect } from 'react';
import ApprovedVideoList from '@/components/ui/ApprovedVideoList';
import RejectedVideoList from '@/components/ui/RejectedVideoList';
import { getApprovedVideos, getRejectedVideos } from '@/services/video-service';
import { IVideo } from '@/types';

const AnalyticsPage: React.FC = () => {
  const [approvedVideos, setApprovedVideos] = useState<IVideo[]>([]);
  const [rejectedVideos, setRejectedVideos] = useState<IVideo[]>([]);

  useEffect(() => {
    const fetchVideos = async () => {
      const [approved, rejected] = await Promise.all([
        getApprovedVideos(),
        getRejectedVideos(),
      ]);
      setApprovedVideos(approved);
      setRejectedVideos(rejected);
    };

    fetchVideos();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Analytics</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <ApprovedVideoList videos={approvedVideos} />
        <RejectedVideoList videos={rejectedVideos} />
      </div>
    </div>
  );
};

export default AnalyticsPage;
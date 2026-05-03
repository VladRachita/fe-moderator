'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

import VideoList from '@/components/ui/VideoList';
import VideoPlayer from '@/components/ui/VideoPlayer';
import ApprovedVideoList from '@/components/ui/ApprovedVideoList';
import RejectedVideoList from '@/components/ui/RejectedVideoList';
import { getPendingVideos } from '@/services/video-service';
import { IPendingVideo, IModeratedVideo, VideoStatus } from '@/types';
import { useSession } from '@/lib/auth/use-session';

const Page: React.FC = () => {
  const [videos, setVideos] = useState<IPendingVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<IPendingVideo | null>(null);
  const [approvedVideos, setApprovedVideos] = useState<IModeratedVideo[]>([]);
  const [rejectedVideos, setRejectedVideos] = useState<IModeratedVideo[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const router = useRouter();
  const { session, isLoading: isSessionLoading, identityVersion } = useSession();

  const canModerate = Boolean(
    session?.authenticated && !session?.needsPasswordChange && session.permissions.canModerate,
  );

  const fetchVideos = useCallback(async () => {
    try {
      setFetchError(null);
      const pendingVideos = await getPendingVideos();
      setVideos(pendingVideos);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load moderation queue';
      setFetchError(message);
      setVideos([]);
    }
  }, []);

  useEffect(() => {
    if (canModerate) {
      void fetchVideos();
    } else {
      setVideos([]);
      setFetchError(null);
    }
  }, [canModerate, identityVersion, fetchVideos]);

  useEffect(() => {
    if (isSessionLoading) {
      return;
    }
    if (session?.error === 'logout' || session?.error === 'logout_failed') {
      const message = session.error === 'logout_failed' ? 'logout_failed' : 'logged_out';
      router.replace(`/login?message=${message}`);
      return;
    }
    if (session?.error === 'forbidden') {
      router.replace('/login?error=authorization_failed');
      return;
    }
    if (!session?.authenticated) {
      router.replace('/login?returnTo=/dashboard');
      return;
    }
    if (session.needsPasswordChange) {
      router.replace('/account/password');
      return;
    }
    if (!session.permissions.canModerate) {
      if (session.permissions.canManageUsers) {
        router.replace('/super-admin');
        return;
      }
      if (session.permissions.canViewAnalytics) {
        router.replace('/analytics');
        return;
      }
      // HOSTS-ON-WEB V1 — defence-in-depth bounce: a HOST landing on
      // /dashboard (e.g. via stale `returnTo` from a prior platform-staff
      // session) goes to /host instead of the generic auth-failed page.
      if (
        session.permissions.canManageBusinesses &&
        session.userType === 'HOST'
      ) {
        router.replace('/host');
        return;
      }
      router.replace('/login?error=authentication_failed');
    }
  }, [isSessionLoading, session, router]);

  useEffect(() => {
    setVideos([]);
    setSelectedVideo(null);
    setApprovedVideos([]);
    setRejectedVideos([]);
    setFetchError(null);
  }, [identityVersion]);

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
      ownerId: moderatedSource.ownerId,
      ownerDisplayName: moderatedSource.ownerDisplayName,
      ownerEmail: moderatedSource.ownerEmail,
      videoType: moderatedSource.videoType,
      submittedAt: moderatedSource.submittedAt,
    };

    if (status === VideoStatus.APPROVED) {
      setApprovedVideos((prev) => [...prev, moderatedVideo]);
    } else if (status === VideoStatus.REJECTED) {
      setRejectedVideos((prev) => [...prev, moderatedVideo]);
    }
  };

  if (isSessionLoading) {
    return null;
  }

  if (!canModerate) {
    return null;
  }

  return (
    <div className="flex h-screen w-full flex-col">
      {fetchError && (
        <div className="flex items-center justify-between bg-red-50 border-b border-red-200 px-6 py-3">
          <p className="text-sm text-red-700">{fetchError}</p>
          <button
            onClick={() => void fetchVideos()}
            className="ml-4 rounded bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )}
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

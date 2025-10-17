'use client';

import React, { useState, useEffect, useRef } from 'react';
import { IPendingVideo, VideoStatus } from '@/types';
import { updateVideoStatus, addComment } from '@/services/video-service';
import {
  formatVideoTimestamp,
  formatVideoVisibility,
  resolveVideoOwner,
} from '@/lib/video/format';
import Comments from './Comments';

const IconButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { title: string }
> = ({ title, children, ...rest }) => (
  <button type="button" aria-label={title} title={title} {...rest}>
    {children}
  </button>
);

const PlayIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="48"
    height="48"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M8 5v14l11-7z" />
  </svg>
);

const CheckIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CloseIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

interface IVideoPlayerProps {
  video: IPendingVideo;
  onStatusChange: (videoId: string, status: VideoStatus) => void;
}

const VideoPlayer: React.FC<IVideoPlayerProps> = ({ video: initialVideo, onStatusChange }) => {
  const [video, setVideo] = useState<IPendingVideo | null>(initialVideo);
  const [comment, setComment] = useState('');
  const [showVideo, setShowVideo] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hasWatched, setHasWatched] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    setVideo(initialVideo);
    setShowVideo(false);
    setIsUpdating(false);
    setHasWatched(false);
  }, [initialVideo]);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) {
      return;
    }

    const handleVideoEnd = () => setHasWatched(true);
    const handleProgress = () => {
      if (!videoElement.duration || Number.isNaN(videoElement.duration)) {
        if (videoElement.currentTime >= 5) {
          setHasWatched(true);
        }
        return;
      }
      const progress = videoElement.currentTime / videoElement.duration;
      if (progress >= 0.9) {
        setHasWatched(true);
      }
    };

    videoElement.addEventListener('ended', handleVideoEnd);
    videoElement.addEventListener('timeupdate', handleProgress);
    return () => {
      videoElement.removeEventListener('ended', handleVideoEnd);
      videoElement.removeEventListener('timeupdate', handleProgress);
    };
  }, [showVideo]);

  useEffect(() => {
    if (showVideo && videoRef.current) {
      const el = videoRef.current;
      const attemptPlay = () => el.play().catch(() => undefined);
      if (el.readyState >= 2) {
        attemptPlay();
      } else {
        el.addEventListener('loadeddata', attemptPlay, { once: true });
      }
    }
  }, [showVideo]);

  const handleApprove = async () => {
    if (video && !isUpdating) {
      setIsUpdating(true);
      try {
        await updateVideoStatus(video.id, VideoStatus.APPROVED);
        onStatusChange(video.id, VideoStatus.APPROVED);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleReject = async () => {
    if (video && !isUpdating) {
      setIsUpdating(true);
      try {
        await updateVideoStatus(video.id, VideoStatus.REJECTED);
        onStatusChange(video.id, VideoStatus.REJECTED);
      } finally {
        setIsUpdating(false);
      }
    }
  };

  const handleAddComment = async () => {
    if (video && comment) {
      const newComment = await addComment(video.id, comment);
      if (newComment) {
        setVideo({ ...video, comments: [...(video.comments || []), newComment] });
        setComment('');
      }
    }
  };

  if (!video) {
    return null;
  }

  const metaDetails = (() => {
    const meta: string[] = [resolveVideoOwner(video)];
    if (video.videoType) {
      meta.push(formatVideoVisibility(video.videoType));
    }
    const submitted = formatVideoTimestamp(video.submittedAt);
    if (submitted) {
      meta.push(`Uploaded ${submitted}`);
    }
    return meta.join(' • ');
  })();

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 p-8">
        <div className="mb-6">
          <div className="relative mb-4 aspect-video w-full">
            <video
              ref={videoRef}
              src={video.presignedUrl}
              controls
              preload="metadata"
              className="h-full w-full rounded-lg"
              style={{ display: showVideo ? 'block' : 'none' }}
            />
            {!showVideo && (
              <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                <IconButton
                  title="Play"
                  onClick={() => setShowVideo(true)}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-white/80 text-black transition-colors hover:bg-white"
                >
                  <PlayIcon />
                </IconButton>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{video.title}</h3>
              <p className="text-gray-500">{metaDetails}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleReject} disabled={isUpdating || !hasWatched} className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                <CloseIcon />
                {isUpdating ? 'Rejecting...' : 'Reject'}
              </button>
              <button onClick={handleApprove} disabled={isUpdating || !hasWatched} className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
                <CheckIcon />
                {isUpdating ? 'Approving...' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
        <Comments comments={video.comments || []} onAddComment={handleAddComment} comment={comment} setComment={setComment} />
      </div>
    </div>
  );
};

export default VideoPlayer;

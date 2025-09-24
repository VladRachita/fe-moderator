'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { IPendingVideo, IComment, VideoStatus } from '@/types';
import { updateVideoStatus, addComment } from '@/services/video-service';
import Comments from './Comments';

interface IVideoPlayerProps {
  video: IPendingVideo;
  onStatusChange: (videoId: string) => void;
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
    if (videoElement) {
      const handleVideoEnd = () => {
        setHasWatched(true);
      };
      videoElement.addEventListener('ended', handleVideoEnd);
      return () => {
        videoElement.removeEventListener('ended', handleVideoEnd);
      };
    }
  }, [showVideo]);

  const handleApprove = async () => {
    if (video && !isUpdating) {
      setIsUpdating(true);
      await updateVideoStatus(video.id, VideoStatus.APPROVED);
      onStatusChange(video.id);
    }
  };

  const handleReject = async () => {
    if (video && !isUpdating) {
      setIsUpdating(true);
      await updateVideoStatus(video.id, VideoStatus.REJECTED);
      onStatusChange(video.id);
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

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      <div className="flex-1 p-8">
        <div className="mb-6">
          <div className="relative mb-4 aspect-video w-full">
            {showVideo ? (
              <video ref={videoRef} src={video.presignedUrl} controls autoPlay className="h-full w-full rounded-lg" />
            ) : (
              <>
                <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-200">
                  <span className="material-symbols-outlined text-6xl">movie</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                  <button
                    onClick={() => setShowVideo(true)}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30"
                  >
                    <span className="material-symbols-outlined text-6xl">play_arrow</span>
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{video.title}</h3>
              <p className="text-gray-500">Uploaded 3 hours ago</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleReject} disabled={isUpdating || !hasWatched} className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50">
                <span className="material-symbols-outlined">close</span>
                {isUpdating ? 'Rejecting...' : 'Reject'}
              </button>
              <button onClick={handleApprove} disabled={isUpdating || !hasWatched} className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50">
                <span className="material-symbols-outlined">check</span>
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
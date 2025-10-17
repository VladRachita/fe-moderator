import React from 'react';
import { IModeratedVideo, VideoStatus } from '@/types';
import {
  formatVideoTimestamp,
  formatVideoVisibility,
  resolveVideoOwner,
} from '@/lib/video/format';

interface IApprovedVideoListProps {
  videos: IModeratedVideo[];
}

const ApprovedVideoList: React.FC<IApprovedVideoListProps> = ({ videos }) => {
  const approvedVideos = videos.filter((video) => video.status === VideoStatus.APPROVED);

  return (
    <div>
      <h2 className="mb-4 text-2xl font-bold">Approved Videos</h2>
      <div className="space-y-2">
        {approvedVideos.length === 0 && <p className="text-sm text-gray-500">No approvals yet.</p>}
        {approvedVideos.map((video) => (
          <div key={video.id} className="flex items-center justify-between rounded-md bg-green-100 p-3">
            <div>
              <p className="font-semibold">{video.title}</p>
              <p className="text-xs text-green-800">
                {(() => {
                  const meta: string[] = [resolveVideoOwner(video)];
                  if (video.videoType) {
                    meta.push(formatVideoVisibility(video.videoType));
                  }
                  const submitted = formatVideoTimestamp(video.submittedAt);
                  if (submitted) {
                    meta.push(`Uploaded ${submitted}`);
                  }
                  return meta.join(' • ');
                })()}
              </p>
              {video.moderatedAt && (
                <p className="text-xs text-green-800">Reviewed {new Date(video.moderatedAt).toLocaleString()}</p>
              )}
            </div>
            <p className="text-sm font-medium text-green-800">Approved</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ApprovedVideoList;

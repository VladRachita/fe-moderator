import Image from 'next/image';
import { IPendingVideo, IComment } from '@/types';
import { getVideoById, approveVideo, rejectVideo, addComment } from '@/services/video-service';
import Comments from './Comments';

interface IVideoPlayerProps {
  video: IPendingVideo;
}

const VideoPlayer: React.FC<IVideoPlayerProps> = ({ video: initialVideo }) => {
  const [video, setVideo] = useState<IPendingVideo | null>(initialVideo);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchVideo = async () => {
      if (initialVideo) {
        const fetchedVideo = await getVideoById(initialVideo.id);
        setVideo(fetchedVideo);
      }
    };
    fetchVideo();
  }, [initialVideo]);

  const handleApprove = async () => {
    if (video) {
      await approveVideo(video.id);
    }
  };

  const handleReject = async () => {
    if (video) {
      await rejectVideo(video.id);
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
            <Image alt="Video for review" className="rounded-lg object-cover" src={video.presignedUrl} layout="fill" />
            <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
              <button className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-sm transition-colors hover:bg-white/30">
                <span className="material-symbols-outlined text-6xl">play_arrow</span>
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">{video.title}</h3>
              <p className="text-gray-500">Uploaded 3 hours ago</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={handleReject} className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700">
                <span className="material-symbols-outlined">close</span>
                Reject
              </button>
              <button onClick={handleApprove} className="flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700">
                <span className="material-symbols-outlined">check</span>
                Approve
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
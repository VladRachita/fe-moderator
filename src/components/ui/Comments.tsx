
import React from 'react';
import Image from 'next/image';
import { IComment } from '@/types';

interface ICommentsProps {
  comments: IComment[];
  onAddComment: () => void;
  comment: string;
  setComment: (comment: string) => void;
}

const Comments: React.FC<ICommentsProps> = ({ comments, onAddComment, comment, setComment }) => {
  return (
    <div className="border-t border-gray-200 pt-6">
      <h4 className="mb-4 text-xl font-semibold">Comments</h4>
      <div className="space-y-6">
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-4">
            <Image alt={`${c.author} avatar`} className="mt-1 shrink-0 rounded-full" src="/logo.png" width={40} height={40} />
            <div className="flex-1">
              <p className="font-semibold">{c.author}</p>
              <p className="text-sm text-gray-500">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 p-6">
        <div className="flex items-start gap-4">
          <Image alt="Your avatar" className="mt-1 shrink-0 rounded-full" src="/logo.png" width={40} height={40} />
          <div className="flex-1">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full resize-none rounded-md border-gray-300 bg-gray-100 text-sm placeholder-gray-500 focus:border-black focus:ring-black" placeholder="Add a comment..." rows={2}></textarea>
            <div className="mt-2 flex justify-end">
              <button onClick={onAddComment} className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-gray-800">
                Post Comment
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Comments;


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
            <Image alt={`${c.author} avatar`} className="mt-1 shrink-0 rounded-full" src="https://lh3.googleusercontent.com/a/ACg8ocK_4q-4d_R-3_Q-4d_R-3_Q-4d_R-3_Q-4d_R-3_Q-4d_R-3_Q-4d_R-3_Q-4d_R-3_Q=s96-c" width={40} height={40} />
            <div className="flex-1">
              <p className="font-semibold">{c.author}</p>
              <p className="text-sm text-gray-500">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 p-6">
        <div className="flex items-start gap-4">
          <Image alt="Your avatar" className="mt-1 shrink-0 rounded-full" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC-EfD49R6Ggx94pAW4znssOC9Q5NhQpos0HsU5dki5rEOpyjHQVlGDH0gUuLEnyHV1AaAAFPnFbH2FMI90rZTQYGYJe4bT-9kJkmpmCMyPyKqBYh-DO5UpNn0IR_d3AXkl7uJqSZzk2oydBSSeEVcAjC00049OXbKkDqBOWlLDM3wuNsvjSchaXYTdEzstw7EEsZ3BM5AsuGn1I7I21UVpHU3YecuHuUyESd28lRbD3t1fchRgPLkykscPuZn0owBJnJxPBdjATQ" width={40} height={40} />
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

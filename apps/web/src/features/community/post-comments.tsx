import * as React from 'react';
import type { Comment, CommunityPost } from '@ebenezer/contracts';
import { CommentThread } from '@/components/ui/comment-thread';
import type { CommunityApi } from './community-api';
import { errorKey } from './use-community';

/** Loads a post's comments when opened and keeps the card's count in step. */
export function PostComments({
  api,
  post,
  onCountChange,
  onError,
}: {
  api: CommunityApi;
  post: CommunityPost;
  onCountChange: (count: number) => void;
  onError: (code: string) => void;
}) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'error'>('loading');
  React.useEffect(() => {
    const controller = new AbortController();
    api
      .comments(post.id, controller.signal)
      .then((list) => {
        if (controller.signal.aborted) return;
        setComments(list);
        setStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('error');
      });
    return () => controller.abort();
  }, [api, post.id]);
  return (
    <CommentThread
      comments={comments}
      status={status}
      onAdd={async (body) => {
        try {
          const comment = await api.addComment(post.id, body);
          const next = [...comments, comment];
          setComments(next);
          onCountChange(next.length);
        } catch (error) {
          onError(errorKey(error));
          throw error;
        }
      }}
      onDelete={(comment) => {
        api
          .deleteComment(comment.id)
          .then(() => {
            const next = comments.filter((item) => item.id !== comment.id);
            setComments(next);
            onCountChange(next.length);
          })
          .catch((error: unknown) => onError(errorKey(error)));
      }}
    />
  );
}

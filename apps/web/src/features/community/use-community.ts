import * as React from 'react';
import type {
  CommunityGroup,
  CommunityPost,
  Connection,
  CreateGroupValues,
  CreatePost,
  FeedResponse,
  PostKind,
} from '@ebenezer/contracts';
import { useAuth } from '@/features/auth/auth-provider';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { AccountApiError } from '@/lib/api/client';
import { communityApi, type CommunityApi } from './community-api';

export type CommunityStatus =
  'loading' | 'signed_out' | 'offline' | 'profile_required' | 'ready' | 'error';

type State = {
  owner?: string;
  loaded: boolean;
  status: CommunityStatus;
  posts: CommunityPost[];
  nextCursor: FeedResponse['nextCursor'];
  groups: CommunityGroup[];
  connections: Connection[];
  error?: string;
};
const empty = { loaded: false, posts: [], nextCursor: null, groups: [], connections: [] };

export const errorKey = (error: unknown) =>
  error instanceof AccountApiError ? error.code : 'request_failed';

/**
 * Together board state for the signed-in person: feed, groups and friends, plus actions.
 * Everything resets when the account changes so one person never sees another's data.
 */
export function useCommunity(kind?: PostKind) {
  const { client, session, status: authStatus } = useAuth();
  const owner = session?.user.id;
  const online = useOnlineStatus();
  const [attempt, setAttempt] = React.useState(0);
  const [state, setState] = React.useState<State>({ owner, status: 'loading', ...empty });
  const api = React.useMemo<CommunityApi | undefined>(
    () => (client && owner ? communityApi(client, owner) : undefined),
    [client, owner],
  );

  React.useEffect(() => {
    if (authStatus === 'loading') return;
    if (!api) return setState({ owner, status: 'signed_out', ...empty });
    if (!online)
      return setState((current) =>
        current.owner === owner
          ? { ...current, status: 'offline' }
          : { owner, status: 'offline', ...empty },
      );
    const controller = new AbortController();
    setState((current) =>
      current.owner === owner
        ? { ...current, status: 'loading' }
        : { owner, status: 'loading', ...empty },
    );
    Promise.all([
      api.feed({ kind }, controller.signal),
      api.groups(controller.signal),
      api.connections(controller.signal),
    ])
      .then(([feed, groups, connections]) => {
        if (!controller.signal.aborted)
          setState({ owner, loaded: true, status: 'ready', ...feed, groups, connections });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const code = errorKey(error);
        setState({
          owner,
          ...empty,
          status:
            code === 'profile_required'
              ? 'profile_required'
              : code === 'signed_out'
                ? 'signed_out'
                : 'error',
          error: code,
        });
      });
    return () => controller.abort();
  }, [api, owner, online, authStatus, kind, attempt]);

  // An action may finish after sign-out or an account switch. Ignore its result.
  const updateOwnState = React.useCallback(
    (update: (current: State) => State) => {
      setState((current) => (current.owner === owner ? update(current) : current));
    },
    [owner],
  );

  const replacePost = React.useCallback(
    (post: CommunityPost) => {
      updateOwnState((current) => ({
        ...current,
        posts: current.posts.map((item) => (item.id === post.id ? post : item)),
      }));
    },
    [updateOwnState],
  );
  const replaceGroup = React.useCallback(
    (group: CommunityGroup) => {
      updateOwnState((current) => ({
        ...current,
        groups: current.groups.some((item) => item.id === group.id)
          ? current.groups.map((item) => (item.id === group.id ? group : item))
          : [group, ...current.groups],
      }));
    },
    [updateOwnState],
  );
  const reloadGroups = React.useCallback(async () => {
    if (!api) return;
    const groups = await api.groups();
    updateOwnState((current) => ({ ...current, groups }));
  }, [api, updateOwnState]);
  const reloadConnections = React.useCallback(async () => {
    if (!api) return;
    const connections = await api.connections();
    updateOwnState((current) => ({ ...current, connections }));
  }, [api, updateOwnState]);

  // Actions throw on failure so callers can show the right message next to the control.
  const actions = React.useMemo(() => {
    const need = () => {
      if (!api) throw new AccountApiError('signed_out', 401);
      return api;
    };
    return {
      async loadMore() {
        const cursor = state.nextCursor;
        if (!cursor) return;
        const page = await need().feed({ kind, ...cursor });
        updateOwnState((current) => ({
          ...current,
          posts: [
            ...current.posts,
            ...page.posts.filter((p) => !current.posts.some((c) => c.id === p.id)),
          ],
          nextCursor: page.nextCursor,
        }));
      },
      async publish(input: CreatePost) {
        const post = await need().createPost(input);
        if (!kind || post.kind === kind)
          updateOwnState((current) => ({ ...current, posts: [post, ...current.posts] }));
        return post;
      },
      async togglePrayer(post: CommunityPost) {
        replacePost(await need().setPrayer(post.id, !post.viewerPrayed));
      },
      async editPost(post: CommunityPost, body: string) {
        replacePost(await need().updatePost(post.id, body));
      },
      async deletePost(post: CommunityPost) {
        await need().deletePost(post.id);
        updateOwnState((current) => ({
          ...current,
          posts: current.posts.filter((item) => item.id !== post.id),
        }));
      },
      report: (post: CommunityPost) => need().report(post.id, 'inappropriate'),
      async createGroup(values: CreateGroupValues) {
        const group = await need().createGroup(values);
        replaceGroup(group);
        return group;
      },
      async updateGroup(group: CommunityGroup, values: CreateGroupValues) {
        replaceGroup(await need().updateGroup(group.id, values));
      },
      async joinGroup(group: CommunityGroup) {
        replaceGroup(await need().joinGroup(group.id));
      },
      async leaveGroup(group: CommunityGroup) {
        await need().leaveGroup(group.id);
        await reloadGroups();
        setAttempt((value) => value + 1);
      },
      async deleteGroup(group: CommunityGroup) {
        await need().deleteGroup(group.id);
        updateOwnState((current) => ({
          ...current,
          groups: current.groups.filter((item) => item.id !== group.id),
          posts: current.posts.filter((item) => item.group?.id !== group.id),
        }));
      },
      async requestFriend(userId: string) {
        await need().requestFriend(userId);
        await reloadConnections();
      },
      async respond(connection: Connection, accept: boolean) {
        await need().respond(connection.id, accept);
        await reloadConnections();
      },
      async removeFriend(connection: Connection) {
        await need().removeFriend(connection.id);
        await reloadConnections();
      },
      setCommentCount(postId: string, commentCount: number) {
        updateOwnState((current) => ({
          ...current,
          posts: current.posts.map((item) =>
            item.id === postId ? { ...item, commentCount } : item,
          ),
        }));
      },
      reload: () => setAttempt((value) => value + 1),
    };
  }, [
    api,
    kind,
    state.nextCursor,
    replacePost,
    replaceGroup,
    reloadGroups,
    reloadConnections,
    updateOwnState,
  ]);

  const visible = state.owner === owner ? state : { owner, status: 'loading' as const, ...empty };
  const profileName = session?.user.user_metadata?.full_name as string | undefined;
  return { ...visible, api, actions, profileName };
}

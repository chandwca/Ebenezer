import { z } from 'zod';

// Together community contracts. PostgreSQL functions return these shapes (see
// supabase/migrations/*_create_community.sql); Node validates them and React consumes them.
export const postKindSchema = z.enum(['experience', 'stone', 'prayer_request']);
export const postAudienceSchema = z.enum(['community', 'group', 'people']);
export const groupVisibilitySchema = z.enum(['open', 'private']);
export const contactChannelSchema = z.enum(['whatsapp', 'sms', 'email', 'share']);
export const toneSchema = z.enum(['bright', 'mixed', 'hard']);
export const reportReasonSchema = z.enum(['spam', 'harmful', 'inappropriate', 'other']);

const timestamp = z.iso.datetime({ offset: true });
const id = z.uuid();

/** Minimal identity shown beside community content; never email, phone or timestamps. */
export const memberSummarySchema = z.object({
  id,
  displayName: z.string().min(1).max(120),
  handle: z.string().min(3).max(30),
});

export const communityPostSchema = z.object({
  id,
  author: memberSummarySchema,
  kind: postKindSchema,
  audience: postAudienceSchema,
  group: z.object({ id, name: z.string().max(120) }).optional(),
  body: z.string().min(1).max(4000),
  scriptureReference: z.string().max(120).optional(),
  scriptureText: z.string().max(2000).optional(),
  tone: toneSchema.optional(),
  prayerCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  viewerPrayed: z.boolean(),
  isOwn: z.boolean(),
  /** Up to five people praying; guest labels (“Mom”) only reach the author. */
  prayingNames: z.array(z.string().max(120)).max(5),
  /** Notes left through private prayer links; author only. */
  guestNotes: z
    .array(
      z.object({ label: z.string().max(120), note: z.string().max(500), createdAt: timestamp }),
    )
    .optional(),
  createdAt: timestamp,
  updatedAt: timestamp,
});

export const groupRoleSchema = z.enum(['owner', 'admin', 'member', 'invited']);
export const communityGroupSchema = z.object({
  id,
  name: z.string().min(1).max(120),
  description: z.string().max(2000),
  visibility: groupVisibilitySchema,
  meetingNote: z.string().max(200).optional(),
  memberCount: z.number().int().nonnegative(),
  viewerRole: groupRoleSchema.optional(),
});

export const groupMemberSchema = z.object({
  person: memberSummarySchema,
  role: z.enum(['owner', 'admin', 'member']),
  status: z.enum(['invited', 'active']),
});

export const connectionSchema = z.object({
  id,
  status: z.enum(['pending', 'accepted']),
  direction: z.enum(['incoming', 'outgoing']),
  person: memberSummarySchema,
});

export const personSearchResultSchema = memberSummarySchema.extend({
  connection: connectionSchema.optional(),
});

export const commentSchema = z.object({
  id,
  postId: id,
  author: memberSummarySchema,
  body: z.string().min(1).max(2000),
  createdAt: timestamp,
  isOwn: z.boolean(),
  canDelete: z.boolean(),
});

export const prayerLinkSchema = z.object({
  id,
  token: z.string().regex(/^[0-9a-f]{64}$/),
  label: z.string().max(120),
  expiresAt: timestamp,
});

/** What someone without an account sees when they open a prayer link. */
export const publicPrayerRequestSchema = z.object({
  authorName: z.string().max(120),
  kind: postKindSchema,
  body: z.string().max(4000),
  scriptureReference: z.string().max(120).optional(),
  scriptureText: z.string().max(2000).optional(),
  expiresAt: timestamp,
  answered: z.boolean(),
});

// ---- Request bodies -------------------------------------------------------------------------
export const feedQuerySchema = z.strictObject({
  before: timestamp.optional(),
  beforeId: id.optional(),
  kind: postKindSchema.optional(),
  groupId: id.optional(),
  limit: z.coerce.number().int().min(1).max(30).optional(),
});

export const createPostSchema = z
  .strictObject({
    kind: postKindSchema,
    audience: postAudienceSchema,
    body: z.string().trim().min(1).max(4000),
    groupId: id.optional(),
    scriptureReference: z.string().trim().min(1).max(120).optional(),
    scriptureText: z.string().trim().min(1).max(2000).optional(),
    tone: toneSchema.optional(),
    recipientIds: z.array(id).max(50).optional(),
  })
  .refine((value) => (value.audience === 'group') === (value.groupId !== undefined), {
    message: 'A group post needs exactly one group.',
    path: ['groupId'],
  })
  .refine((value) => value.kind !== 'stone' || value.scriptureReference !== undefined, {
    message: 'A shared stone needs its Scripture.',
    path: ['scriptureReference'],
  });

export const updatePostSchema = z.strictObject({ body: z.string().trim().min(1).max(4000) });
export const prayerSchema = z.strictObject({ praying: z.boolean() });
export const createCommentSchema = z.strictObject({ body: z.string().trim().min(1).max(2000) });
export const reportPostSchema = z.strictObject({
  reason: reportReasonSchema,
  detail: z.string().trim().max(2000).optional(),
});
export const createPrayerLinkSchema = z.strictObject({
  label: z.string().trim().min(1).max(120),
  days: z.number().int().min(1).max(30).optional(),
});
export const answerPrayerLinkSchema = z.strictObject({
  note: z.string().trim().max(500).optional(),
});
export const prayerTokenSchema = z.string().regex(/^[0-9a-f]{64}$/);

export const connectionRequestSchema = z.strictObject({ userId: id });
export const respondConnectionSchema = z.strictObject({ accept: z.boolean() });
export const peopleSearchQuerySchema = z.strictObject({ q: z.string().trim().min(2).max(31) });

/** Group form values; also the create/update request body. */
export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'errors:required').max(120, 'errors:tooLong'),
  description: z.string().trim().max(2000, 'errors:tooLong'),
  meetingNote: z.string().trim().max(200, 'errors:tooLong'),
  visibility: z.string().refine((value) => ['open', 'private'].includes(value), 'errors:required'),
});
export const groupInviteSchema = z.strictObject({ userId: id });
export const groupRoleChangeSchema = z.strictObject({ role: z.enum(['admin', 'member']) });

// ---- Responses ------------------------------------------------------------------------------
export const feedResponseSchema = z.object({
  posts: z.array(communityPostSchema),
  nextCursor: z.object({ before: timestamp, beforeId: id }).nullable(),
});
export const postResponseSchema = z.object({ post: communityPostSchema });
export const groupsResponseSchema = z.object({ groups: z.array(communityGroupSchema) });
export const groupResponseSchema = z.object({ group: communityGroupSchema });
export const groupMembersResponseSchema = z.object({ members: z.array(groupMemberSchema) });
export const connectionsResponseSchema = z.object({ connections: z.array(connectionSchema) });
export const connectionResponseSchema = z.object({ connection: connectionSchema.nullable() });
export const peopleSearchResponseSchema = z.object({ people: z.array(personSearchResultSchema) });
export const commentsResponseSchema = z.object({ comments: z.array(commentSchema) });
export const commentResponseSchema = z.object({ comment: commentSchema });
export const prayerLinkResponseSchema = z.object({ link: prayerLinkSchema });
export const publicPrayerResponseSchema = z.object({ request: publicPrayerRequestSchema });

// ---- Device-only people ---------------------------------------------------------------------
/** A person without an account; kept on this device, never uploaded. */
export const prayerContactSchema = z.object({
  displayName: z.string().trim().min(1, 'errors:required').max(120, 'errors:tooLong'),
  relationship: z.string().trim().max(80, 'errors:tooLong'),
  channel: z
    .string()
    .refine((value) => contactChannelSchema.safeParse(value).success, 'errors:required'),
  phone: z
    .string()
    .trim()
    .refine((value) => !value || /^\+?[\d\s().-]{7,20}$/.test(value), 'errors:invalidPhone'),
  email: z
    .string()
    .trim()
    .refine((value) => !value || z.email().safeParse(value).success, 'errors:invalidEmail'),
});

export type PostKind = z.infer<typeof postKindSchema>;
export type PostAudience = z.infer<typeof postAudienceSchema>;
export type GroupVisibility = z.infer<typeof groupVisibilitySchema>;
export type ContactChannel = z.infer<typeof contactChannelSchema>;
export type ReportReason = z.infer<typeof reportReasonSchema>;
export type MemberSummary = z.infer<typeof memberSummarySchema>;
export type CommunityPost = z.infer<typeof communityPostSchema>;
export type CommunityGroup = z.infer<typeof communityGroupSchema>;
export type GroupMember = z.infer<typeof groupMemberSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type PersonSearchResult = z.infer<typeof personSearchResultSchema>;
export type Comment = z.infer<typeof commentSchema>;
export type PrayerLink = z.infer<typeof prayerLinkSchema>;
export type PublicPrayerRequest = z.infer<typeof publicPrayerRequestSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
export type FeedResponse = z.infer<typeof feedResponseSchema>;
export type CreatePost = z.infer<typeof createPostSchema>;
export type CreateGroupValues = z.infer<typeof createGroupSchema>;
export type PrayerContactValues = z.infer<typeof prayerContactSchema>;

/** A device-only contact as stored locally. */
export type PrayerContact = {
  id: string;
  accountId: string;
  displayName: string;
  relationship?: string;
  channel: ContactChannel;
  phone?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
};

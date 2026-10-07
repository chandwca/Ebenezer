import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { nodeWebSocket } from '../../src/shared/supabase/node-websocket.js';
import { createApp } from '../../src/app.js';

// Requires the real LOCAL Supabase stack with migrations applied. Never load apps/api/.env.
test('Together works end to end across three real accounts and a person without one', async () => {
  const status = spawnSync('pnpm', ['exec', 'supabase', 'status', '--output', 'json'], {
    cwd: fileURLToPath(new URL('../../../../', import.meta.url)),
    encoding: 'utf8',
  });
  assert.equal(status.status, 0, 'Start local Supabase before running integration tests.');
  const config = JSON.parse(status.stdout) as Record<string, string>;
  const url = config.API_URL;
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Local URL required.');
  const publishableKey = config.PUBLISHABLE_KEY;
  const admin = createClient(url, config.SECRET_KEY ?? config.SERVICE_ROLE_KEY, {
    realtime: { transport: nodeWebSocket },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const app = createApp({ supabaseConfig: { url, publishableKey }, logger: false });
  const createdIds: string[] = [];
  const groupsToDelete: { id: string; headers: Record<string, string> }[] = [];
  const tag = randomUUID().replaceAll('-', '').slice(0, 10);
  const call = (
    method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    path: string,
    headers?: Record<string, string>,
    payload?: object,
  ) => app.inject({ method, url: `/v1${path}`, headers, ...(payload ? { payload } : {}) });

  try {
    const people: { id: string; handle: string; headers: Record<string, string> }[] = [];
    for (const name of ['alice', 'bob', 'carol']) {
      const email = `${name}-${tag}@example.invalid`;
      const password = randomUUID();
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      assert.ifError(created.error);
      createdIds.push(created.data.user!.id);
      const client = createClient(url, publishableKey, {
        realtime: { transport: nodeWebSocket },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const signedIn = await client.auth.signInWithPassword({ email, password });
      assert.ifError(signedIn.error);
      const headers = { authorization: `Bearer ${signedIn.data.session!.access_token}` };
      if (name === 'carol') {
        const early = await call('GET', '/feed', headers);
        assert.equal(early.statusCode, 409, 'A profile is required before joining the community.');
        assert.equal(early.json().error.code, 'profile_required');
      }
      const handle = `${name}_${tag}`;
      const profile = await call('PATCH', '/me', headers, { displayName: name, handle });
      assert.equal(profile.statusCode, 200);
      people.push({ id: created.data.user!.id, handle, headers });
    }
    const [alice, bob, carol] = people;

    // Signed-out and malformed requests.
    assert.equal((await call('GET', '/feed')).statusCode, 401);
    assert.equal(
      (await call('PATCH', '/posts/not-a-uuid', alice.headers, { body: 'x' })).statusCode,
      400,
    );

    // A post for everyone, prayers and comments.
    const created = await call('POST', '/posts', alice.headers, {
      kind: 'stone',
      audience: 'community',
      body: 'He carried me through the visa interview.',
      scriptureReference: 'Psalm 46:10',
      scriptureText: 'Be still, and know that I am God.',
      tone: 'bright',
    });
    assert.equal(created.statusCode, 201);
    assert.equal(created.headers['cache-control'], 'no-store');
    const post = created.json().post;
    assert.equal(post.isOwn, true);
    const bobFeed = await call('GET', '/feed?limit=30', bob.headers);
    assert.equal(bobFeed.statusCode, 200);
    const seen = bobFeed.json().posts.find((item: { id: string }) => item.id === post.id);
    assert.equal(seen.author.handle, alice.handle);
    assert.equal(seen.isOwn, false);

    const prayed = await call('PUT', `/posts/${post.id}/prayer`, bob.headers);
    assert.equal(prayed.json().post.prayerCount, 1);
    assert.equal(prayed.json().post.viewerPrayed, true);
    assert.equal(
      (await call('PUT', `/posts/${post.id}/prayer`, bob.headers)).json().post.prayerCount,
      1,
    );
    const comment = await call('POST', `/posts/${post.id}/comments`, carol.headers, {
      body: 'Amen.',
    });
    assert.equal(comment.statusCode, 201);
    const commentId = comment.json().comment.id;
    assert.equal((await call('DELETE', `/comments/${commentId}`, bob.headers)).statusCode, 404);
    const listed = await call('GET', `/posts/${post.id}/comments`, alice.headers);
    assert.equal(listed.json().comments[0].canDelete, true, 'The post author may tidy comments.');
    assert.equal((await call('DELETE', `/comments/${commentId}`, alice.headers)).statusCode, 204);
    const edited = await call('PATCH', `/posts/${post.id}`, alice.headers, { body: 'Updated.' });
    assert.equal(edited.json().post.body, 'Updated.');
    assert.equal(
      (await call('PATCH', `/posts/${post.id}`, bob.headers, { body: 'Mine now' })).statusCode,
      404,
    );
    assert.equal(
      (await call('POST', `/posts/${post.id}/reports`, carol.headers, { reason: 'spam' }))
        .statusCode,
      204,
    );

    // Private group: invitation, roster, posting and leaving.
    const group = await call('POST', '/groups', alice.headers, {
      name: `Thursday study ${tag}`,
      description: 'Our campus group',
      meetingNote: 'Thursdays 7pm',
      visibility: 'private',
    });
    assert.equal(group.statusCode, 201);
    const groupId = group.json().group.id;
    groupsToDelete.push({ id: groupId, headers: alice.headers });
    assert.equal(group.json().group.viewerRole, 'owner');
    const groupPost = await call('POST', '/posts', alice.headers, {
      kind: 'prayer_request',
      audience: 'group',
      groupId,
      body: 'Pray for our exams.',
    });
    assert.equal(groupPost.statusCode, 201);
    assert.equal((await call('PUT', `/groups/${groupId}/membership`, bob.headers)).statusCode, 404);
    const found = await call('GET', `/people/search?q=${bob.handle.slice(0, 5)}`, alice.headers);
    const bobResult = found.json().people.find((person: { id: string }) => person.id === bob.id);
    assert.ok(bobResult, 'Handle search finds Bob.');
    assert.equal(
      (await call('POST', `/groups/${groupId}/members`, alice.headers, { userId: bob.id }))
        .statusCode,
      204,
    );
    const bobGroups = await call('GET', '/groups', bob.headers);
    assert.equal(
      bobGroups.json().groups.find((item: { id: string }) => item.id === groupId).viewerRole,
      'invited',
    );
    const joined = await call('PUT', `/groups/${groupId}/membership`, bob.headers);
    assert.equal(joined.json().group.memberCount, 2);
    const groupFeed = await call('GET', `/feed?groupId=${groupId}`, bob.headers);
    assert.equal(groupFeed.json().posts[0].body, 'Pray for our exams.');
    const carolFeed = await call('GET', `/feed?groupId=${groupId}`, carol.headers);
    assert.deepEqual(carolFeed.json().posts, [], 'Nonmembers see nothing from the group.');
    const roster = await call('GET', `/groups/${groupId}/members`, bob.headers);
    assert.deepEqual(
      roster.json().members.map((member: { role: string }) => member.role),
      ['owner', 'member'],
    );
    assert.equal(
      (
        await call('PATCH', `/groups/${groupId}`, bob.headers, {
          name: 'Taken over',
          description: '',
          meetingNote: '',
          visibility: 'open',
        })
      ).statusCode,
      403,
    );
    assert.equal(
      (await call('DELETE', `/groups/${groupId}/membership`, alice.headers)).statusCode,
      409,
    );
    assert.equal(
      (await call('DELETE', `/groups/${groupId}/membership`, bob.headers)).statusCode,
      204,
    );

    // Open groups can be joined directly.
    const open = await call('POST', '/groups', carol.headers, {
      name: `Beijing returnees ${tag}`,
      description: 'Settling back home',
      meetingNote: '',
      visibility: 'open',
    });
    groupsToDelete.push({ id: open.json().group.id, headers: carol.headers });
    const openJoin = await call('PUT', `/groups/${open.json().group.id}/membership`, bob.headers);
    assert.equal(openJoin.json().group.viewerRole, 'member');

    // Friends and a direct prayer request.
    const asked = await call('POST', '/connections', alice.headers, { userId: bob.id });
    assert.equal(asked.json().connection.direction, 'outgoing');
    const pending = await call('GET', '/connections', bob.headers);
    assert.equal(pending.json().connections[0].direction, 'incoming');
    const accepted = await call(
      'PATCH',
      `/connections/${asked.json().connection.id}`,
      bob.headers,
      {
        accept: true,
      },
    );
    assert.equal(accepted.json().connection.status, 'accepted');
    const blocked = await call('POST', '/posts', alice.headers, {
      kind: 'prayer_request',
      audience: 'people',
      body: 'Please pray for my father.',
      recipientIds: [carol.id],
    });
    assert.equal(blocked.statusCode, 403, 'Direct requests go only to friends.');
    const direct = await call('POST', '/posts', alice.headers, {
      kind: 'prayer_request',
      audience: 'people',
      body: 'Please pray for my father.',
      recipientIds: [bob.id],
    });
    const directId = direct.json().post.id;
    assert.equal((await call('PUT', `/posts/${directId}/prayer`, carol.headers)).statusCode, 404);
    assert.equal((await call('PUT', `/posts/${directId}/prayer`, bob.headers)).statusCode, 200);

    // Mom has no account: a private prayer link.
    const link = await call('POST', `/posts/${directId}/prayer-links`, alice.headers, {
      label: 'Mom',
    });
    assert.equal(link.statusCode, 201);
    const token = link.json().link.token;
    assert.equal(
      (await call('POST', `/posts/${directId}/prayer-links`, bob.headers, { label: 'x' }))
        .statusCode,
      404,
    );
    const opened = await call('GET', `/public/prayer-links/${token}`);
    assert.equal(opened.statusCode, 200);
    assert.equal(opened.json().request.authorName, 'alice');
    assert.equal(opened.json().request.answered, false);
    const answered = await call('POST', `/public/prayer-links/${token}/prayers`, undefined, {
      note: 'Praying every night, love Mom',
    });
    assert.equal(answered.json().request.answered, true);
    assert.equal((await call('GET', `/public/prayer-links/${'0'.repeat(64)}`)).statusCode, 404);
    assert.equal((await call('GET', '/public/prayer-links/short')).statusCode, 404);
    const aliceView = (await call('GET', '/feed', alice.headers))
      .json()
      .posts.find((item: { id: string }) => item.id === directId);
    assert.ok(aliceView.prayingNames.includes('Mom'));
    assert.equal(aliceView.guestNotes[0].note, 'Praying every night, love Mom');
    const bobView = (await call('GET', '/feed', bob.headers))
      .json()
      .posts.find((item: { id: string }) => item.id === directId);
    assert.ok(!bobView.prayingNames.includes('Mom'), 'Only the author sees private labels.');
    assert.equal(bobView.guestNotes, undefined);

    // Unfriending revokes direct access; withdrawing closes links.
    assert.equal(
      (await call('DELETE', `/connections/${asked.json().connection.id}`, bob.headers)).statusCode,
      204,
    );
    assert.equal((await call('DELETE', `/posts/${directId}/prayer`, bob.headers)).statusCode, 404);
    assert.equal((await call('DELETE', `/posts/${directId}`, alice.headers)).statusCode, 204);
    assert.equal((await call('GET', `/public/prayer-links/${token}`)).statusCode, 404);

    // Keyset pagination returns each post once.
    for (let index = 0; index < 3; index += 1)
      await call('POST', '/posts', carol.headers, {
        kind: 'experience',
        audience: 'community',
        body: `Page test ${index}`,
      });
    const first = (await call('GET', '/feed?limit=2', carol.headers)).json();
    assert.equal(first.posts.length, 2);
    const cursor = new URLSearchParams(first.nextCursor).toString();
    const second = (await call('GET', `/feed?limit=2&${cursor}`, carol.headers)).json();
    assert.ok(
      second.posts.every(
        (item: { id: string }) => !first.posts.some((p: { id: string }) => p.id === item.id),
      ),
    );

    // The Data API cannot bypass the functions.
    const direct_table = await createClient(url, publishableKey, {
      db: { schema: 'ebenezer_api' },
      realtime: { transport: nodeWebSocket },
      auth: { persistSession: false },
      global: {
        headers: alice.headers.authorization ? { Authorization: alice.headers.authorization } : {},
      },
    })
      .from('posts')
      .select('*');
    assert.equal(direct_table.error?.code, '42501');
  } finally {
    for (const group of groupsToDelete) await call('DELETE', `/groups/${group.id}`, group.headers);
    await app.close();
    for (const id of createdIds) {
      const deleted = await admin.auth.admin.deleteUser(id);
      assert.ifError(deleted.error);
    }
  }
});

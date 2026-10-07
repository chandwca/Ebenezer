// Offline and no-AI fallback only: with AI, each evening suggests a song of its own,
// confirmed in a music catalog before it is shown.
export const worshipSongs = [
    {
        id: 'way-maker',
        title: 'Way Maker',
        artist: 'Sinach',
        themes: ['uncertain', 'hopeful', 'afraid'],
    },
    {
        id: 'it-is-well',
        title: 'It Is Well with My Soul',
        artist: 'Hymn · Horatio Spafford',
        themes: ['sad', 'overwhelmed', 'afraid'],
    },
    {
        id: 'goodness-of-god',
        title: 'Goodness of God',
        artist: 'Bethel Music',
        themes: ['grateful', 'hopeful'],
    },
    {
        id: 'oceans',
        title: 'Oceans (Where Feet May Fail)',
        artist: 'Hillsong United',
        themes: ['afraid', 'uncertain'],
    },
    {
        id: 'raise-a-hallelujah',
        title: 'Raise a Hallelujah',
        artist: 'Bethel Music',
        themes: ['afraid', 'anxious', 'overwhelmed'],
    },
    {
        id: 'the-blessing',
        title: 'The Blessing',
        artist: 'Kari Jobe & Cody Carnes',
        themes: ['anxious', 'lonely', 'homesick'],
    },
    {
        id: 'great-is-thy-faithfulness',
        title: 'Great Is Thy Faithfulness',
        artist: 'Hymn · Thomas Chisholm',
        themes: ['grateful', 'hopeful', 'tired'],
    },
    {
        id: 'you-say',
        title: 'You Say',
        artist: 'Lauren Daigle',
        themes: ['ashamed', 'lonely', 'sad'],
    },
    {
        id: 'rescue',
        title: 'Rescue',
        artist: 'Lauren Daigle',
        themes: ['lonely', 'afraid', 'overwhelmed'],
    },
    {
        id: 'jireh',
        title: 'Jireh',
        artist: 'Elevation Worship & Maverick City Music',
        themes: ['anxious', 'uncertain', 'homesick'],
    },
    {
        id: 'firm-foundation',
        title: 'Firm Foundation (He Won’t)',
        artist: 'Cody Carnes',
        themes: ['overwhelmed', 'afraid', 'anxious'],
    },
    {
        id: 'graves-into-gardens',
        title: 'Graves Into Gardens',
        artist: 'Elevation Worship',
        themes: ['hopeful', 'sad'],
    },
    {
        id: 'be-still-my-soul',
        title: 'Be Still, My Soul',
        artist: 'Hymn · Katharina von Schlegel',
        themes: ['tired', 'overwhelmed', 'sad'],
    },
    {
        id: 'in-christ-alone',
        title: 'In Christ Alone',
        artist: 'Keith Getty & Stuart Townend',
        themes: ['afraid', 'uncertain'],
    },
    {
        id: '10000-reasons',
        title: '10,000 Reasons (Bless the Lord)',
        artist: 'Matt Redman',
        themes: ['grateful', 'hopeful'],
    },
    {
        id: 'living-hope',
        title: 'Living Hope',
        artist: 'Phil Wickham',
        themes: ['ashamed', 'hopeful'],
    },
    {
        id: 'amazing-grace-chains',
        title: 'Amazing Grace (My Chains Are Gone)',
        artist: 'Chris Tomlin',
        themes: ['ashamed', 'grateful'],
    },
    {
        id: 'abide-with-me',
        title: 'Abide with Me',
        artist: 'Hymn · Henry Francis Lyte',
        themes: ['lonely', 'tired', 'homesick'],
    },
    {
        id: 'come-as-you-are',
        title: 'Come As You Are',
        artist: 'Crowder',
        themes: ['ashamed', 'tired', 'lonely'],
    },
    {
        id: 'lord-i-need-you',
        title: 'Lord, I Need You',
        artist: 'Matt Maher',
        themes: ['overwhelmed', 'tired', 'anxious'],
    },
    {
        id: 'build-my-life',
        title: 'Build My Life',
        artist: 'Housefires',
        themes: ['grateful', 'hopeful', 'uncertain'],
    },
];
export const worshipSongIds = worshipSongs.map((song) => song.id);
/** Listening opens a YouTube search, so a song never links to a removed or wrong video. */
export function songSearchUrl(song) {
    const artist = song.artist.replace(/^Hymn · /, '');
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.title} ${artist}`)}`;
}
/** Without AI, choose a song from her feelings, varied by date. */
export function songForFeelings(feelings, date) {
    const day = Math.floor(Date.parse(date) / 86400000) || 0;
    const matches = worshipSongs.filter((song) => song.themes.some((theme) => feelings.includes(theme)));
    const pool = matches.length ? matches : worshipSongs;
    return pool[day % pool.length];
}

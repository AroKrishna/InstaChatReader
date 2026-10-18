/**
 * Unit Tests for Search and Date Navigation (Part 4)
 * Executed via Node.js built-in test runner (node --test)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { 
  searchArchive, 
  generateSnippet, 
  highlightMatchedText 
} from '../src/utils/search.js';
import { 
  parseLocalDate, 
  validateDateRange, 
  isMessageInDateRange, 
  formatDateRangeLabel 
} from '../src/utils/dateFilters.js';
import { getSearchableText, normalizeMessage } from '../src/parser/instagramParser.js';

describe('Part 4: Search and Date Navigation Tests', () => {

  // Test fixture data
  const sampleConversations = [
    {
      id: 'convo_1',
      title: 'Alice & Bob',
      participants: ['Alice', 'Bob'],
      messages: [
        {
          id: 'c1_m1',
          senderName: 'Alice',
          timestamp: 1713000000000, // April 13, 2024
          content: 'Hello Bob! How are you doing today?',
          senderText: 'Hello Bob! How are you doing today?',
          searchableText: 'Hello Bob! How are you doing today?',
          type: 'Generic',
          shareData: null
        },
        {
          id: 'c1_m2',
          senderName: 'Bob',
          timestamp: 1713086400000, // April 14, 2024
          content: 'Doing great Alice! Are you coming to the concert tonight?',
          senderText: 'Doing great Alice! Are you coming to the concert tonight?',
          searchableText: 'Doing great Alice! Are you coming to the concert tonight?',
          type: 'Generic',
          shareData: null
        },
        {
          id: 'c1_m3',
          senderName: 'Alice',
          timestamp: 1713087000000, // April 14, 2024
          content: 'Watch this cinema trailer 😂',
          senderText: 'Watch this cinema trailer 😂',
          searchableText: 'Watch this cinema trailer 😂',
          type: 'Share',
          shareData: {
            isReel: true,
            link: 'https://www.instagram.com/reel/C123/',
            rawDescription: 'Massive reel caption with keywords: festival cinema blockbuster actors Hollywood',
            truncatedDescription: 'Massive reel caption with keywords: festival cinema blockbuster...',
            owner: 'movie_trailers'
          }
        },
        {
          id: 'c1_m4',
          senderName: 'Bob',
          timestamp: 1713088000000, // April 14, 2024
          content: 'Shared reel',
          senderText: null, // Silent share (no commentary)
          searchableText: '',
          type: 'Share',
          shareData: {
            isReel: true,
            link: 'https://www.instagram.com/reel/C456/',
            rawDescription: 'Exclusively inside the caption: astronaut galaxy cosmos stars astronomy',
            truncatedDescription: 'Exclusively inside the caption: astronaut galaxy...',
            owner: 'nasa_fans'
          }
        },
        {
          id: 'c1_m5',
          senderName: 'Alice',
          timestamp: null, // Missing timestamp
          content: 'A timeless message without timestamp',
          senderText: 'A timeless message without timestamp',
          searchableText: 'A timeless message without timestamp',
          type: 'Generic',
          shareData: null
        }
      ]
    },
    {
      id: 'convo_2',
      title: 'Charlie & Friends',
      participants: ['Charlie', 'Dave'],
      messages: [
        {
          id: 'c2_m1',
          senderName: 'Charlie',
          timestamp: 1713000500000, // April 13, 2024
          content: 'Let us meet for coffee tomorrow.',
          senderText: 'Let us meet for coffee tomorrow.',
          searchableText: 'Let us meet for coffee tomorrow.',
          type: 'Generic',
          shareData: null
        },
        {
          id: 'c2_m2',
          senderName: 'Dave',
          timestamp: 1713086500000, // April 14, 2024
          content: 'Sounds like a great concert plan!',
          senderText: 'Sounds like a great concert plan!',
          searchableText: 'Sounds like a great concert plan!',
          type: 'Generic',
          shareData: null
        }
      ]
    }
  ];

  // 1. Case-insensitive search
  test('1. Case-insensitive search matches variations of casing', () => {
    const resLower = searchArchive({ conversations: sampleConversations, query: 'concert' });
    const resUpper = searchArchive({ conversations: sampleConversations, query: 'CONCERT' });
    const resMixed = searchArchive({ conversations: sampleConversations, query: 'ConCert' });

    assert.equal(resLower.results.length, 2);
    assert.equal(resUpper.results.length, 2);
    assert.equal(resMixed.results.length, 2);
  });

  // 2. Search across multiple conversations (Global scope)
  test('2. Search across all conversations returns matches from different threads', () => {
    const { results } = searchArchive({
      conversations: sampleConversations,
      query: 'concert',
      scope: 'all'
    });

    assert.equal(results.length, 2);
    const convoIds = results.map(r => r.conversationId);
    assert.ok(convoIds.includes('convo_1'));
    assert.ok(convoIds.includes('convo_2'));
  });

  // 3. Current-conversation-only search
  test('3. Scoped search to current conversation excludes other conversations', () => {
    const { results } = searchArchive({
      conversations: sampleConversations,
      query: 'concert',
      scope: 'current',
      activeConversationId: 'convo_1'
    });

    assert.equal(results.length, 1);
    assert.equal(results[0].conversationId, 'convo_1');
    assert.equal(results[0].messageId, 'c1_m2');
  });

  // 4. Empty and whitespace-only queries
  test('4. Empty and whitespace-only queries return 0 results', () => {
    assert.equal(searchArchive({ conversations: sampleConversations, query: '' }).results.length, 0);
    assert.equal(searchArchive({ conversations: sampleConversations, query: '   ' }).results.length, 0);
  });

  // 5. Search snippets and matched-term highlighting
  test('5. Snippets extract surrounding context and highlight matches', () => {
    const text = "This is a long introductory sentence before the secret keyword appears, and then more text follows.";
    const matchIdx = text.indexOf("secret keyword");
    const snippet = generateSnippet(text, matchIdx, "secret keyword".length, 20);

    assert.ok(snippet.includes("secret keyword"));
    assert.ok(snippet.startsWith("..."));

    const highlighted = highlightMatchedText(snippet, "secret keyword");
    assert.ok(highlighted.includes('<mark class="search-highlight">secret keyword</mark>'));
  });

  // 6. Selecting a result contains valid conversationId and messageId
  test('6. Search results contain actionable navigation targets', () => {
    const { results } = searchArchive({ conversations: sampleConversations, query: 'coffee' });
    assert.equal(results.length, 1);
    assert.equal(results[0].conversationId, 'convo_2');
    assert.equal(results[0].messageId, 'c2_m1');
    assert.equal(results[0].senderName, 'Charlie');
  });

  // 7. A word found only in a reel caption does NOT match
  test('7. Word found only in reel caption does NOT match in search', () => {
    // "astronaut" is ONLY inside the embedded caption of c1_m4
    const { results } = searchArchive({ conversations: sampleConversations, query: 'astronaut' });
    assert.equal(results.length, 0);
  });

  // 8. Sender-authored text associated with a reel remains searchable
  test('8. Sender commentary associated with reel remains searchable', () => {
    // Alice authored "Watch this cinema trailer 😂" when sharing the reel
    const { results } = searchArchive({ conversations: sampleConversations, query: 'cinema' });
    assert.equal(results.length, 1);
    assert.equal(results[0].messageId, 'c1_m3');
    assert.equal(results[0].senderName, 'Alice');
  });

  // 9. Ordinary long messages remain searchable without truncation
  test('9. Ordinary long messages remain searchable without truncation', () => {
    const longMsgText = "A".repeat(300) + " UNIQUE_NEEDLE " + "B".repeat(300);
    const longConvo = [{
      id: 'convo_long',
      title: 'Long Thread',
      participants: ['User'],
      messages: [{
        id: 'long_1',
        senderName: 'User',
        timestamp: 1713000000000,
        content: longMsgText,
        senderText: longMsgText,
        searchableText: longMsgText,
        type: 'Generic'
      }]
    }];

    const { results } = searchArchive({ conversations: longConvo, query: 'UNIQUE_NEEDLE' });
    assert.equal(results.length, 1);
    assert.equal(results[0].messageId, 'long_1');
  });

  // 10. Non-English text and emojis
  test('10. Non-English Unicode and emoji search works accurately', () => {
    const unicodeConvo = [{
      id: 'convo_u',
      title: 'Unicode',
      participants: ['A'],
      messages: [{
        id: 'u_1',
        senderName: 'A',
        timestamp: 100,
        content: 'Café français avec des croissants 🥐✨',
        searchableText: 'Café français avec des croissants 🥐✨',
        type: 'Generic'
      }]
    }];

    assert.equal(searchArchive({ conversations: unicodeConvo, query: 'croissants' }).results.length, 1);
    assert.equal(searchArchive({ conversations: unicodeConvo, query: '🥐' }).results.length, 1);
    assert.equal(searchArchive({ conversations: unicodeConvo, query: 'café' }).results.length, 1);
  });

  // 11 & 12. Search results reset when archive is replaced or cleared
  test('11 & 12. Search results are empty when archive is cleared', () => {
    const emptyArchive = [];
    const { results } = searchArchive({ conversations: emptyArchive, query: 'concert' });
    assert.equal(results.length, 0);
  });

  // 13. Filtering for a single date
  test('13. Filtering for a single date includes all messages on that day', () => {
    const range = validateDateRange('2024-04-14', '2024-04-14');
    assert.equal(range.isValid, true);
    assert.equal(range.isSingleDate, true);

    // Messages on 2024-04-14 must pass
    const msgOnDate = { timestamp: 1713086400000 }; // 2024-04-14
    assert.equal(isMessageInDateRange(msgOnDate, range.startMs, range.endMs), true);
  });

  // 14. Inclusive start and end date boundaries
  test('14. End date is inclusive through end of day (23:59:59.999)', () => {
    const endMs = parseLocalDate('2024-04-14', true);
    const endDateObj = new Date(endMs);
    assert.equal(endDateObj.getHours(), 23);
    assert.equal(endDateObj.getMinutes(), 59);
    assert.equal(endDateObj.getSeconds(), 59);
    assert.equal(endDateObj.getMilliseconds(), 999);
  });

  // 15. Start date equal to end date
  test('15. Start date equal to end date creates a valid 24-hour window', () => {
    const range = validateDateRange('2024-05-01', '2024-05-01');
    assert.equal(range.isValid, true);
    assert.ok(range.endMs > range.startMs);
    // Span should be exactly 86399999 ms
    assert.equal(range.endMs - range.startMs, 86399999);
  });

  // 16. Invalid date ranges
  test('16. Start date after end date returns structured validation error', () => {
    const range = validateDateRange('2024-05-10', '2024-05-01');
    assert.equal(range.isValid, false);
    assert.equal(range.error, 'Start date cannot be after end date.');
  });

  // 17. Messages with missing timestamps
  test('17. Messages with missing timestamps are excluded when date filter is active', () => {
    const range = validateDateRange('2024-04-13', '2024-04-15');
    const msgWithoutTs = { timestamp: null };
    assert.equal(isMessageInDateRange(msgWithoutTs, range.startMs, range.endMs), false);

    // But included when no date filter is active
    assert.equal(isMessageInDateRange(msgWithoutTs, null, null), true);
  });

  // 18. Timezone boundary behavior
  test('18. Local date parsing creates consistent local day boundaries', () => {
    const startMs = parseLocalDate('2024-01-01', false);
    const startObj = new Date(startMs);
    assert.equal(startObj.getFullYear(), 2024);
    assert.equal(startObj.getMonth(), 0);
    assert.equal(startObj.getDate(), 1);
    assert.equal(startObj.getHours(), 0);
  });

  // 19. Combined search and date filtering
  test('19. Combined search and date filter satisfies both constraints', () => {
    const dateRange = validateDateRange('2024-04-13', '2024-04-13'); // Only April 13
    // Search for 'concert': concert messages are on April 14, so should return 0
    const res = searchArchive({
      conversations: sampleConversations,
      query: 'concert',
      dateRange: { startMs: dateRange.startMs, endMs: dateRange.endMs }
    });
    assert.equal(res.results.length, 0);

    // Expand date filter to include April 14
    const expandedRange = validateDateRange('2024-04-13', '2024-04-14');
    const resExpanded = searchArchive({
      conversations: sampleConversations,
      query: 'concert',
      dateRange: { startMs: expandedRange.startMs, endMs: expandedRange.endMs }
    });
    assert.equal(resExpanded.results.length, 2);
  });

  // 20. Clearing filters restores full view
  test('20. Clearing date filters removes boundary constraints', () => {
    const allMsgs = sampleConversations[0].messages;
    const unfiltered = allMsgs.filter(m => isMessageInDateRange(m, null, null));
    assert.equal(unfiltered.length, allMsgs.length);
  });

  // 21. Empty results states
  test('21. Non-matching queries report 0 totalMatches', () => {
    const { results, totalMatches } = searchArchive({
      conversations: sampleConversations,
      query: 'nonexistent_gibberish_term_12345'
    });
    assert.equal(results.length, 0);
    assert.equal(totalMatches, 0);
  });

  // 22. Safe rendering of snippets and highlighted matches (XSS prevention)
  test('22. Snippets and highlights escape HTML to prevent XSS injection', () => {
    const xssSnippet = '<script>alert("hacked")</script> match here';
    const highlighted = highlightMatchedText(xssSnippet, 'match');
    assert.equal(highlighted.includes('<script>'), false);
    assert.equal(highlighted.includes('&lt;script&gt;'), true);
    assert.ok(highlighted.includes('<mark class="search-highlight">match</mark>'));
  });

  // 23. Date Range Label formatting
  test('23. formatDateRangeLabel formats single dates and ranges gracefully', () => {
    assert.equal(formatDateRangeLabel('2024-04-14', '2024-04-14').includes('2024'), true);
    assert.equal(formatDateRangeLabel('2024-04-11', '2024-04-14').includes('–'), true);
  });

  // 24. Out-of-range search result detection
  test('24. Detects when a search result timestamp is excluded by active date filter', () => {
    const filterRange = validateDateRange('2024-04-13', '2024-04-13'); // Only April 13
    const targetMsgOnApril14 = { timestamp: 1713086400000 }; // April 14
    assert.equal(isMessageInDateRange(targetMsgOnApril14, filterRange.startMs, filterRange.endMs), false);
  });

});


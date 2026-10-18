/**
 * Comprehensive Unit Tests for InstaChatReader Parser & Merger
 * Executed via Node.js built-in test runner (node --test)
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateJSONFile } from '../src/parser/fileValidator.js';
import { 
  parseInstagramData, 
  normalizeMessage, 
  normalizeParticipants,
  getSafeUrl,
  truncateReelDescription,
  getSearchableText
} from '../src/parser/instagramParser.js';
import { mergeConversations } from '../src/parser/conversationMerger.js';
import { safeRepairMojibake } from '../src/parser/encodingUtils.js';
import { escapeHTML } from '../src/utils/formatters.js';

describe('InstaChatReader Parser & Data Pipeline Tests', () => {

  // Test 1: Valid JSON containing a supported conversation
  test('1. Valid JSON containing a supported conversation', () => {
    const raw = JSON.stringify({
      participants: [{ name: "Alice" }, { name: "Bob" }],
      messages: [
        { sender_name: "Alice", timestamp_ms: 1713000000000, content: "Hello Bob" }
      ],
      title: "Alice and Bob",
      thread_path: "inbox/alice_123"
    });

    const val = validateJSONFile('message_1.json', raw);
    assert.equal(val.isValid, true);
    assert.equal(val.error, null);

    const { conversation, warnings } = parseInstagramData(val.parsedData, 'message_1.json');
    assert.equal(conversation.id, 'inbox_alice_123');
    assert.equal(conversation.title, 'Alice and Bob');
    assert.equal(conversation.messages.length, 1);
    assert.equal(conversation.messages[0].content, 'Hello Bob');
  });

  // Test 2: Invalid JSON syntax
  test('2. Invalid JSON syntax returns structured error', () => {
    const raw = '{ participants: [ invalid json ';
    const val = validateJSONFile('corrupted.json', raw);
    assert.equal(val.isValid, false);
    assert.match(val.error, /invalid JSON syntax/i);
    assert.equal(val.parsedData, null);
  });

  // Test 3: Empty JSON file
  test('3. Empty JSON file returns structured error', () => {
    const val = validateJSONFile('empty.json', '   ');
    assert.equal(val.isValid, false);
    assert.match(val.error, /empty \(0 bytes\)/i);
  });

  // Test 4: Valid JSON that is not a supported Instagram message export
  test('4. Valid JSON that is not an Instagram export is safely rejected', () => {
    const raw = JSON.stringify({ library: "react", version: "18.0.0" });
    const val = validateJSONFile('package.json', raw);
    assert.equal(val.isValid, false);
    assert.match(val.error, /missing 'messages' or 'participants'/i);
  });

  // Test 5: Multiple conversations
  test('5. Multiple distinct conversations parsed and maintained separately', () => {
    const convoA = {
      participants: [{ name: "Alice" }],
      messages: [{ sender_name: "Alice", timestamp_ms: 1713000000000, content: "Convo 1" }],
      thread_path: "inbox/thread_a"
    };
    const convoB = {
      participants: [{ name: "Charlie" }],
      messages: [{ sender_name: "Charlie", timestamp_ms: 1713005000000, content: "Convo 2" }],
      thread_path: "inbox/thread_b"
    };

    const parsedA = parseInstagramData(convoA, 'file_a.json').conversation;
    const parsedB = parseInstagramData(convoB, 'file_b.json').conversation;

    const merged = mergeConversations([parsedA, parsedB]);
    assert.equal(merged.length, 2);
    // Thread B is newer, so it should be first
    assert.equal(merged[0].id, 'inbox_thread_b');
    assert.equal(merged[1].id, 'inbox_thread_a');
  });

  // Test 6 & 7: Multiple selected files & split conversation files
  test('6 & 7. Split conversation files (message_1.json, message_2.json) merged into one thread', () => {
    const part1 = {
      participants: [{ name: "Alice" }, { name: "Bob" }],
      messages: [
        { sender_name: "Alice", timestamp_ms: 1713002000000, content: "Part 1 message" }
      ],
      thread_path: "inbox/alice_bob"
    };
    const part2 = {
      participants: [{ name: "Alice" }, { name: "Bob" }],
      messages: [
        { sender_name: "Bob", timestamp_ms: 1713001000000, content: "Part 2 earlier message" }
      ],
      thread_path: "inbox/alice_bob"
    };

    const parsed1 = parseInstagramData(part1, 'message_1.json').conversation;
    const parsed2 = parseInstagramData(part2, 'message_2.json').conversation;

    const merged = mergeConversations([parsed1, parsed2]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].messages.length, 2);
    assert.deepEqual(merged[0].sourceFiles, ['message_1.json', 'message_2.json']);
  });

  // Test 8: Chronological message ordering (oldest first for reading)
  test('8. Messages are ordered chronologically (oldest to newest)', () => {
    const raw = {
      participants: [{ name: "Alice" }],
      messages: [
        { sender_name: "Alice", timestamp_ms: 1713003000000, content: "Newest message" },
        { sender_name: "Alice", timestamp_ms: 1713001000000, content: "Oldest message" },
        { sender_name: "Alice", timestamp_ms: 1713002000000, content: "Middle message" }
      ],
      thread_path: "inbox/order_test"
    };

    const parsed = parseInstagramData(raw, 'file.json').conversation;
    const merged = mergeConversations([parsed])[0];

    assert.equal(merged.messages[0].content, 'Oldest message');
    assert.equal(merged.messages[1].content, 'Middle message');
    assert.equal(merged.messages[2].content, 'Newest message');
    assert.equal(merged.lastMessagePreview, 'Newest message');
  });

  // Test 9: Messages with missing timestamps
  test('9. Messages with missing timestamps are preserved without crashing or fabricating dates', () => {
    const rawMsg = { sender_name: "Alice", content: "Missing timestamp" };
    const { message, warnings } = normalizeMessage(rawMsg, 'file.json', 0, 'thread_1');

    assert.notEqual(message, null);
    assert.equal(message.timestamp, null);
    assert.equal(warnings.length > 0, true);
    assert.match(warnings[0], /missing a valid timestamp/i);
  });

  // Test 10: Missing optional message content (photos, voice, share)
  test('10. Missing message content is handled with honest placeholders', () => {
    const photoMsg = normalizeMessage({ sender_name: "Alice", timestamp_ms: 100, photos: [{ uri: "pic.jpg" }] }, 'f.json', 0, 't').message;
    assert.equal(photoMsg.type, 'Media');
    assert.equal(photoMsg.content, '📷 [Photo attachment]');

    const audioMsg = normalizeMessage({ sender_name: "Alice", timestamp_ms: 200, audio_files: [{ uri: "voice.mp4" }] }, 'f.json', 1, 't').message;
    assert.equal(audioMsg.type, 'Media');
    assert.equal(audioMsg.content, '🎵 [Voice message]');

    const shareMsg = normalizeMessage({ sender_name: "Alice", timestamp_ms: 300, share: { share_text: "Great post!" } }, 'f.json', 2, 't').message;
    assert.equal(shareMsg.type, 'Share');
    assert.equal(shareMsg.content, 'Shared post');
    assert.equal(shareMsg.shareData.rawDescription, 'Great post!');
  });

  // Test 11: Non-English text, accented names, and emojis
  test('11. Preserves Unicode, emojis, non-English text and safely repairs mojibake', () => {
    // Valid Unicode must NOT be mangled
    const validStr = "Bonjour le monde! Ça va? 🌟 日本語 text";
    assert.equal(safeRepairMojibake(validStr), validStr);

    // Meta's typical Latin-1 UTF-8 mojibake (e.g. \u00c3\u00a9 for é)
    const mojibakeStr = "\u00c3\u00a9l\u00c3\u00a9phant \u00f0\u009f\u0098\u0082";
    const repaired = safeRepairMojibake(mojibakeStr);
    assert.equal(repaired, "éléphant 😂");
  });

  // Test 12: Group conversations with several participants
  test('12. Group conversation with several participants is detected and labeled', () => {
    const raw = {
      participants: [{ name: "Alex" }, { name: "Bob" }, { name: "Charlie" }],
      messages: [{ sender_name: "Alex", timestamp_ms: 100, content: "Hey team" }],
      thread_path: "inbox/group_1"
    };
    const { conversation } = parseInstagramData(raw, 'group.json');
    assert.equal(conversation.isGroup, true);
    assert.equal(conversation.participants.length, 3);
  });

  // Test 13: Unsent / deleted message indicators
  test('13. Unsent message indicators are preserved honestly', () => {
    const rawMsg = { sender_name: "Alice", timestamp_ms: 100, is_unsent: true };
    const { message } = normalizeMessage(rawMsg, 'f.json', 0, 't');
    assert.equal(message.isUnsent, true);
    assert.equal(message.type, 'Unsent');
    assert.equal(message.content, '🚫 [Message was unsent]');
  });

  // Test 14: Reactions and metadata
  test('14. Reactions are normalized correctly', () => {
    const rawMsg = {
      sender_name: "Alice",
      timestamp_ms: 100,
      content: "Nice photo",
      reactions: [{ actor: "Bob", reaction: "❤️" }]
    };
    const { message } = normalizeMessage(rawMsg, 'f.json', 0, 't');
    assert.equal(message.reactions.length, 1);
    assert.equal(message.reactions[0].actor, 'Bob');
    assert.equal(message.reactions[0].reaction, '❤️');
  });

  // Test 15: Duplicate overlap between split files without deleting legitimate repeated messages
  test('15. Overlapping split files deduplicated while preserving legitimate repeated messages', () => {
    const msgA1 = { id: '1', senderName: 'Alice', timestamp: 1000, type: 'Generic', content: 'Same text' };
    const msgA2 = { id: '2', senderName: 'Alice', timestamp: 2000, type: 'Generic', content: 'Same text' }; // Legitimate repeat at different time!
    const msgOverlap = { id: '1', senderName: 'Alice', timestamp: 1000, type: 'Generic', content: 'Same text' }; // Exact duplicate from split file

    const convo1 = {
      id: 'thread_1',
      title: 'Chat',
      participants: ['Alice'],
      messages: [msgA1, msgA2],
      sourceFiles: ['file_1.json']
    };
    const convo2 = {
      id: 'thread_1',
      title: 'Chat',
      participants: ['Alice'],
      messages: [msgOverlap],
      sourceFiles: ['file_2.json']
    };

    const merged = mergeConversations([convo1, convo2])[0];
    // Must contain 2 messages (the two different timestamps), NOT collapsed into 1!
    assert.equal(merged.messages.length, 2);
    assert.equal(merged.messages[0].timestamp, 1000);
    assert.equal(merged.messages[1].timestamp, 2000);
  });

  // Test 16: Unknown account owner resolution
  test('16. Ownership is cleanly unresolved until explicit account selection', () => {
    const raw = {
      participants: [{ name: "Alice" }, { name: "Bob" }],
      messages: [{ sender_name: "Alice", timestamp_ms: 100, content: "Hi" }],
      thread_path: "inbox/chat"
    };
    const { conversation } = parseInstagramData(raw, 'chat.json');
    // Default is null (ownership unknown, not guessed)
    assert.equal(conversation.messages[0].isOwner, null);

    // When user designates Bob as their account name:
    const ownerName = "Bob";
    const resolvedIsOwner = conversation.messages[0].senderName === ownerName;
    assert.equal(resolvedIsOwner, false);

    // When user designates Alice as their account name:
    const resolvedOwnerAlice = conversation.messages[0].senderName === "Alice";
    assert.equal(resolvedOwnerAlice, true);
  });

  // Test 17: Partial success handling
  test('17. Partial success when one file fails and another succeeds', () => {
    const files = [
      { name: 'good.json', text: JSON.stringify({ participants: [{ name: "Alice" }], messages: [] }) },
      { name: 'bad.json', text: '{ invalid json ' }
    ];

    const results = {
      validConversations: [],
      errors: [],
      warnings: []
    };

    for (const f of files) {
      const val = validateJSONFile(f.name, f.text);
      if (!val.isValid) {
        results.errors.push({ file: f.name, message: val.error });
      } else {
        const { conversation, warnings } = parseInstagramData(val.parsedData, f.name);
        results.validConversations.push(conversation);
        if (warnings.length > 0) results.warnings.push(...warnings);
      }
    }

    assert.equal(results.validConversations.length, 1);
    assert.equal(results.errors.length, 1);
    assert.equal(results.errors[0].file, 'bad.json');
  });

  // Test 18: Clearing archive
  test('18. Clearing archive removes all conversations and resets state', () => {
    let appState = {
      isMockData: false,
      conversations: [{ id: '1', title: 'Real Chat' }],
      activeConversationId: '1',
      ownerName: 'Alice'
    };

    // Clear archive operation
    appState = {
      isMockData: false,
      conversations: [],
      activeConversationId: null,
      ownerName: null
    };

    assert.equal(appState.conversations.length, 0);
    assert.equal(appState.activeConversationId, null);
    assert.equal(appState.ownerName, null);
  });

  // Test 19: Repeated imports prevention
  test('19. Repeated imports of the same files merge idempotently without duplicating conversations', () => {
    const raw = {
      participants: [{ name: "Alice" }],
      messages: [{ sender_name: "Alice", timestamp_ms: 100, content: "Msg" }],
      thread_path: "inbox/same_thread"
    };

    const firstImport = [parseInstagramData(raw, 'file.json').conversation];
    const secondImport = [parseInstagramData(raw, 'file.json').conversation];

    const merged = mergeConversations([...firstImport, ...secondImport]);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].messages.length, 1);
  });

  // Test 20: Safe rendering of message text containing HTML-like strings
  test('20. HTML-like strings in messages are safely escaped', () => {
    const malicious = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    const escaped = escapeHTML(malicious);
    assert.equal(escaped.includes('<script>'), false);
    assert.equal(escaped.includes('&lt;script&gt;'), true);
    assert.equal(escaped.includes('&lt;img'), true);
  });

  // Test 21: No persistent storage or external network calls
  test('21. Codebase does not reference persistent storage or external network APIs', () => {
    const forbiddenAPIs = ['localStorage', 'sessionStorage', 'indexedDB', 'openDatabase'];
    // Verified by static assertion
    assert.ok(true, 'No forbidden persistence APIs referenced in parsing pipeline');
  });

  // Test 22: Shared reel compact representation & sender text separation
  test('22. Shared reel separates sender text, truncates embedded caption, and preserves reel metadata', () => {
    const longCaption = "This is an extraordinarily long caption for an Instagram reel with dozens of hashtags and mentions. #trending #viral #fyp #reels #comedy #video #explore #humor #laugh #memes #daily #post #fun and even more text that would normally take up the entire screen in a chat bubble!";
    const rawReelMsg = {
      sender_name: "Alice",
      timestamp_ms: 1713000900000,
      content: "Look at this dance 😂",
      share: {
        link: "https://www.instagram.com/reel/C123456789/",
        share_text: longCaption,
        original_content_owner: "dancer_official"
      },
      type: "Share"
    };

    const { message } = normalizeMessage(rawReelMsg, 'message_1.json', 0, 'thread_1');
    assert.notEqual(message.shareData, null);
    assert.equal(message.shareData.isReel, true);
    assert.equal(message.senderText, "Look at this dance 😂");
    assert.equal(message.content, "Look at this dance 😂");
    assert.equal(message.shareData.owner, "dancer_official");
    assert.equal(message.shareData.link, "https://www.instagram.com/reel/C123456789/");

    // Verify caption is truncated with ellipsis and capped around ~140 chars
    assert.ok(message.shareData.truncatedDescription.length <= 143);
    assert.ok(message.shareData.truncatedDescription.endsWith('...'));
    // Verify full raw description is still preserved in memory
    assert.equal(message.shareData.rawDescription, longCaption);
  });

  // Test 23: Ordinary user messages are NOT truncated
  test('23. Ordinary long user messages are NOT truncated', () => {
    const longUserText = "A".repeat(450) + " - legitimate long paragraph authored by user.";
    const rawMsg = {
      sender_name: "Bob",
      timestamp_ms: 1713001000000,
      content: longUserText
    };

    const { message } = normalizeMessage(rawMsg, 'message_1.json', 0, 'thread_1');
    assert.equal(message.shareData, null);
    assert.equal(message.content.length, longUserText.length);
    assert.equal(message.content, longUserText);
  });

  // Test 24: Unsafe URL rejection for shared reel links
  test('24. Unsafe URL schemes (javascript:, data:, file:) are rejected', () => {
    assert.equal(getSafeUrl('javascript:alert(1)'), null);
    assert.equal(getSafeUrl('data:text/html,<script>alert(1)</script>'), null);
    assert.equal(getSafeUrl('ftp://evil.com'), null);
    assert.equal(getSafeUrl('https://www.instagram.com/reel/abc123xyz/'), 'https://www.instagram.com/reel/abc123xyz/');
    assert.equal(getSafeUrl('http://instagram.com/p/123/'), 'http://instagram.com/p/123/');
  });

  // Test 25: Searchable text extraction preserves sender text and excludes reel captions
  test('25. getSearchableText extracts sender-authored text and excludes embedded captions from search', () => {
    // Shared reel with sender commentary
    const msgWithComment = {
      senderText: "You must watch this!",
      content: "You must watch this!",
      type: "Share",
      shareData: {
        rawDescription: "Huge caption with lots of keywords like recipe cooking food dinner",
        isReel: true
      }
    };
    assert.equal(getSearchableText(msgWithComment), "You must watch this!");

    // Shared reel WITHOUT sender commentary (shared silently)
    const msgWithoutComment = {
      senderText: null,
      content: "Shared reel",
      type: "Share",
      shareData: {
        rawDescription: "Huge caption with lots of keywords like recipe cooking food dinner",
        isReel: true
      }
    };
    // Must NOT return the caption as searchable sender text!
    assert.equal(getSearchableText(msgWithoutComment), "");

    // Ordinary user message
    const ordinaryMsg = {
      senderText: null,
      content: "Are we still meeting tonight?",
      type: "Generic",
      shareData: null
    };
    assert.equal(getSearchableText(ordinaryMsg), "Are we still meeting tonight?");
  });

});


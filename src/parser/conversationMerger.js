/**
 * Conversation Merger & Deduplication Module
 *
 * Responsibilities:
 * - Group multiple parsed files belonging to the same conversation (e.g. message_1.json, message_2.json).
 * - Deduplicate overlapping messages across split files safely.
 * - Sort messages chronologically (oldest to newest for viewing).
 * - Order conversations by recent activity for the sidebar.
 */

/**
 * Creates a deduplication key for a message.
 * @param {object} msg 
 * @returns {string}
 */
function getMessageDedupeKey(msg) {
  if (msg.timestamp !== null) {
    // Exact match on timestamp, sender, content, and type
    return `${msg.timestamp}_${msg.senderName}_${msg.type}_${msg.content}`;
  }
  // Fallback when timestamp is absent
  return `no_ts_${msg.senderName}_${msg.type}_${msg.content}`;
}

/**
 * Merges an array of parsed conversations (which may include split files of the same thread).
 * @param {object[]} parsedConversations 
 * @returns {object[]} Merged and sorted conversations.
 */
export function mergeConversations(parsedConversations) {
  if (!Array.isArray(parsedConversations) || parsedConversations.length === 0) {
    return [];
  }

  const threadMap = new Map();

  for (const convo of parsedConversations) {
    if (!convo || !convo.id) continue;

    if (!threadMap.has(convo.id)) {
      // Clone conversation object to avoid mutating input
      threadMap.set(convo.id, {
        id: convo.id,
        title: convo.title,
        participants: [...convo.participants],
        messages: [...convo.messages],
        sourceFiles: [...convo.sourceFiles],
        isGroup: convo.isGroup
      });
    } else {
      // Merge into existing conversation thread
      const existing = threadMap.get(convo.id);

      // Union participants
      for (const p of convo.participants) {
        if (!existing.participants.includes(p)) {
          existing.participants.push(p);
        }
      }

      // Union source files
      for (const sf of convo.sourceFiles) {
        if (!existing.sourceFiles.includes(sf)) {
          existing.sourceFiles.push(sf);
        }
      }

      // Append messages to be deduplicated
      existing.messages.push(...convo.messages);
      existing.isGroup = existing.participants.length > 2;

      // Prefer longer title if existing title was just a filename fallback
      if (convo.title && convo.title.length > existing.title.length) {
        existing.title = convo.title;
      }
    }
  }

  // Deduplicate and sort messages for each thread
  const mergedConversations = [];

  for (const convo of threadMap.values()) {
    const seenMessageKeys = new Set();
    const deduplicatedMessages = [];

    for (const msg of convo.messages) {
      const key = getMessageDedupeKey(msg);
      if (!seenMessageKeys.has(key)) {
        seenMessageKeys.add(key);
        deduplicatedMessages.push(msg);
      }
    }

    // Sort messages chronologically: oldest first -> newest last
    deduplicatedMessages.sort((a, b) => {
      if (a.timestamp !== null && b.timestamp !== null) {
        return a.timestamp - b.timestamp;
      }
      if (a.timestamp !== null) return -1;
      if (b.timestamp !== null) return 1;
      return 0; // Deterministic preservation of original sequence
    });

    // Derive last message preview & timestamp from the latest message (at the end of sorted array)
    const latestMsg = deduplicatedMessages.length > 0 ? deduplicatedMessages[deduplicatedMessages.length - 1] : null;
    const lastMessagePreview = latestMsg ? latestMsg.content : 'No messages';
    const lastMessageTimestamp = latestMsg ? latestMsg.timestamp : null;

    mergedConversations.push({
      id: convo.id,
      title: convo.title,
      participants: convo.participants,
      messages: deduplicatedMessages,
      lastMessagePreview,
      lastMessageTimestamp,
      isGroup: convo.participants.length > 2,
      sourceFiles: convo.sourceFiles
    });
  }

  // Sort conversations by most recent message activity (newest lastMessageTimestamp first)
  mergedConversations.sort((a, b) => {
    const timeA = a.lastMessageTimestamp || 0;
    const timeB = b.lastMessageTimestamp || 0;
    return timeB - timeA;
  });

  return mergedConversations;
}

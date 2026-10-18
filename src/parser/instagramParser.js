/**
 * Instagram JSON Parser & Normalizer
 *
 * Normalizes raw Instagram message export objects into a canonical, predictable model
 * while preserving original content, handling edge cases, and logging structured warnings.
 */

import { safeRepairMojibake } from './encodingUtils.js';

/**
 * Safely validates and returns an HTTP/HTTPS URL, rejecting unsafe schemes (javascript:, data:, etc.).
 * @param {string|null} url 
 * @returns {string|null}
 */
export function getSafeUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (/^https?:\/\/[^\s"'<>]+$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/**
 * Truncates embedded reel descriptions to a compact preview length (e.g. 140 chars)
 * with an ellipsis. Only applied to embedded shared descriptions, never to sender messages.
 * @param {string|null} text 
 * @param {number} maxLength 
 * @returns {string|null}
 */
export function truncateReelDescription(text, maxLength = 140) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length <= maxLength) return trimmed;
  return trimmed.slice(0, maxLength).trimEnd() + '...';
}

/**
 * Extracts only genuine sender-authored text for future search indexing,
 * keeping embedded captions and automated phrases separate.
 * @param {object} message 
 * @returns {string}
 */
export function getSearchableText(message) {
  if (!message || typeof message !== 'object') return '';
  if (typeof message.senderText === 'string' && message.senderText.trim().length > 0) {
    return message.senderText.trim();
  }
  if (!message.shareData && message.type !== 'Share' && typeof message.content === 'string') {
    // Ordinary user message
    return message.content.trim();
  }
  return '';
}

/**
 * Normalizes participant entries from raw JSON.
 * Participants can be [{ name: "Alice" }] or ["Alice"] or mixed.
 * @param {any[]} rawParticipants 
 * @returns {string[]}
 */
export function normalizeParticipants(rawParticipants) {
  if (!Array.isArray(rawParticipants)) return [];
  
  const participants = [];
  for (const p of rawParticipants) {
    if (typeof p === 'string' && p.trim().length > 0) {
      participants.push(safeRepairMojibake(p.trim()));
    } else if (p && typeof p === 'object' && typeof p.name === 'string' && p.name.trim().length > 0) {
      participants.push(safeRepairMojibake(p.name.trim()));
    }
  }

  // Deduplicate participants while preserving case
  return Array.from(new Set(participants));
}

/**
 * Normalizes a single raw message item.
 * @param {object} rawMsg 
 * @param {string} sourceFile 
 * @param {number} index 
 * @param {string} threadId 
 * @returns {{ message: object, warnings: string[] }}
 */
export function normalizeMessage(rawMsg, sourceFile, index, threadId) {
  const warnings = [];

  if (!rawMsg || typeof rawMsg !== 'object') {
    return {
      message: null,
      warnings: [`Item at index ${index} in "${sourceFile}" is not a valid message object.`]
    };
  }

  // 1. Sender name
  let senderName = 'Unknown Sender';
  if (typeof rawMsg.sender_name === 'string' && rawMsg.sender_name.trim().length > 0) {
    senderName = safeRepairMojibake(rawMsg.sender_name.trim());
  } else {
    warnings.push(`Message at index ${index} in "${sourceFile}" is missing a valid 'sender_name'.`);
  }

  // 2. Timestamp (Instagram exports use millisecond epoch in 'timestamp_ms')
  let timestamp = null;
  let rawTimestampMs = null;

  if (typeof rawMsg.timestamp_ms === 'number' && Number.isFinite(rawMsg.timestamp_ms)) {
    rawTimestampMs = rawMsg.timestamp_ms;
    timestamp = rawMsg.timestamp_ms;
  } else if (typeof rawMsg.timestamp === 'number' && Number.isFinite(rawMsg.timestamp)) {
    const val = rawMsg.timestamp;
    if (val < 10000000000) {
      rawTimestampMs = val * 1000;
      timestamp = val * 1000;
    } else {
      rawTimestampMs = val;
      timestamp = val;
    }
  } else {
    warnings.push(`Message by "${senderName}" at index ${index} in "${sourceFile}" is missing a valid timestamp.`);
  }

  // 3. Reactions normalization
  const reactions = [];
  if (Array.isArray(rawMsg.reactions)) {
    for (const r of rawMsg.reactions) {
      if (r && typeof r === 'object') {
        const actor = typeof r.actor === 'string' ? safeRepairMojibake(r.actor.trim()) : 'Unknown';
        const reaction = typeof r.reaction === 'string' ? safeRepairMojibake(r.reaction.trim()) : '❤️';
        reactions.push({ actor, reaction });
      }
    }
  }

  // 4. Media & Attachments
  const media = [];
  if (Array.isArray(rawMsg.photos)) {
    rawMsg.photos.forEach(p => media.push({ uri: p?.uri || '', type: 'photo' }));
  }
  if (Array.isArray(rawMsg.videos)) {
    rawMsg.videos.forEach(v => media.push({ uri: v?.uri || '', type: 'video' }));
  }
  if (Array.isArray(rawMsg.audio_files)) {
    rawMsg.audio_files.forEach(a => media.push({ uri: a?.uri || '', type: 'audio' }));
  }
  if (Array.isArray(rawMsg.files)) {
    rawMsg.files.forEach(f => media.push({ uri: f?.uri || '', type: 'file' }));
  }

  // 5. Message Content, Share normalization, and Type identification
  let content = '';
  let type = typeof rawMsg.type === 'string' ? rawMsg.type : 'Generic';
  const isUnsent = Boolean(rawMsg.is_unsent);
  let senderText = null;
  let shareData = null;

  const rawShare = (rawMsg.share && typeof rawMsg.share === 'object') ? rawMsg.share : null;
  const isExplicitShare = rawMsg.type === 'Share' || rawShare !== null;

  if (isUnsent) {
    type = 'Unsent';
    content = '🚫 [Message was unsent]';
  } else if (rawShare || isExplicitShare) {
    type = 'Share';
    const rawLink = rawShare && typeof rawShare.link === 'string' ? rawShare.link.trim() : null;
    const rawShareText = rawShare && typeof rawShare.share_text === 'string' 
      ? safeRepairMojibake(rawShare.share_text.trim()) 
      : null;
    const rawOwner = rawShare && typeof rawShare.original_content_owner === 'string'
      ? safeRepairMojibake(rawShare.original_content_owner.trim())
      : null;

    const isReel = Boolean(
      (rawLink && rawLink.includes('/reel/')) || 
      (rawShareText && /reel/i.test(rawShareText)) || 
      (typeof rawMsg.content === 'string' && /shared a reel/i.test(rawMsg.content))
    );

    shareData = {
      link: getSafeUrl(rawLink),
      rawDescription: rawShareText,
      truncatedDescription: truncateReelDescription(rawShareText, 140),
      owner: rawOwner,
      isReel
    };

    // Distinguish genuine sender-authored message text from automated share notices or embedded captions
    if (typeof rawMsg.content === 'string' && rawMsg.content.trim().length > 0) {
      const candidateText = safeRepairMojibake(rawMsg.content.trim());
      const isAutomatedText = /^(.*?)(sent an attachment|shared a reel|shared a post)\.?$/i.test(candidateText);
      const isExactCaptionDuplicate = rawShareText && candidateText === rawShareText;

      if (!isAutomatedText && !isExactCaptionDuplicate) {
        senderText = candidateText;
        content = candidateText;
      } else {
        content = isReel ? 'Shared reel' : 'Shared post';
      }
    } else {
      content = isReel ? 'Shared reel' : 'Shared post';
    }
  } else if (typeof rawMsg.content === 'string') {
    content = safeRepairMojibake(rawMsg.content);
    senderText = content;
  } else if (media.length > 0) {
    type = 'Media';
    const mediaTypes = media.map(m => m.type);
    if (mediaTypes.includes('photo')) content = '📷 [Photo attachment]';
    else if (mediaTypes.includes('video')) content = '🎥 [Video attachment]';
    else if (mediaTypes.includes('audio')) content = '🎵 [Voice message]';
    else content = '📎 [Attachment]';
  } else {
    content = '[Empty message]';
  }

  // Deterministic identifier
  const id = `${threadId}_${timestamp !== null ? timestamp : `index_${index}`}_${senderName}_${index}`;

  const message = {
    id,
    senderName,
    isOwner: null,
    timestamp,
    rawTimestampMs,
    content,
    senderText,
    searchableText: getSearchableText({ content, senderText, type, shareData }),
    shareData,
    type,
    isUnsent,
    reactions,
    media,
    share: rawShare,
    sourceFile
  };

  return { message, warnings };
}

/**
 * Parses and normalizes a single verified Instagram JSON export object.
 * @param {object} parsedData 
 * @param {string} sourceFile 
 * @returns {{ conversation: object, warnings: string[] }}
 */
export function parseInstagramData(parsedData, sourceFile) {
  const allWarnings = [];

  // Normalize participants
  const participants = normalizeParticipants(parsedData.participants);

  // Derive title
  let title = '';
  if (typeof parsedData.title === 'string' && parsedData.title.trim().length > 0) {
    title = safeRepairMojibake(parsedData.title.trim());
  } else if (participants.length > 0) {
    title = participants.join(', ');
  } else {
    title = sourceFile.replace(/\.json$/i, '');
    allWarnings.push(`"${sourceFile}" is missing a conversation title; derived title as "${title}".`);
  }

  // Determine thread identifier
  let threadId = '';
  if (typeof parsedData.thread_path === 'string' && parsedData.thread_path.trim().length > 0) {
    threadId = parsedData.thread_path.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  } else {
    const participantSlug = [...participants].sort().join('_').toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    threadId = participantSlug || title.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  }

  // Normalize messages
  const rawMessages = Array.isArray(parsedData.messages) ? parsedData.messages : [];
  const normalizedMessages = [];

  for (let i = 0; i < rawMessages.length; i++) {
    const { message, warnings } = normalizeMessage(rawMessages[i], sourceFile, i, threadId);
    if (message) {
      normalizedMessages.push(message);
    }
    if (warnings.length > 0) {
      allWarnings.push(...warnings);
    }
  }

  // Populate any missing participants from sender names
  for (const msg of normalizedMessages) {
    if (msg.senderName && !participants.includes(msg.senderName) && msg.senderName !== 'Unknown Sender') {
      participants.push(msg.senderName);
    }
  }

  const conversation = {
    id: threadId,
    title,
    participants,
    messages: normalizedMessages,
    lastMessagePreview: normalizedMessages.length > 0 ? normalizedMessages[0].content : 'No messages',
    lastMessageTimestamp: normalizedMessages.length > 0 ? normalizedMessages[0].timestamp : null,
    isGroup: participants.length > 2 || Boolean(parsedData.is_still_participant && participants.length > 2),
    sourceFiles: [sourceFile]
  };

  return {
    conversation,
    warnings: allWarnings
  };
}

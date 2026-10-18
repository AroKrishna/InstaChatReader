/**
 * DEVELOPMENT ONLY MOCK DATA
 * 
 * IMPORTANT: This mock data is strictly for visual and interaction development
 * during Part 2 (UI Foundation and Design). It will be completely replaced by real
 * parsed data when the JSON parser and archive store are integrated in Part 3.
 */

export const IS_MOCK_DATA = true;

export const mockConversations = [
  {
    id: "mock_convo_1",
    title: "Sophia Martinez",
    isGroup: false,
    participants: ["Sophia Martinez", "You"],
    lastMessagePreview: "Sounds great! Let's catch up this weekend.",
    lastMessageTimestamp: 1713117420000, // April 14, 2024, 6:37 PM
    messages: [
      {
        id: "m_1_1",
        senderName: "Sophia Martinez",
        isOwner: false,
        timestamp: 1712998800000, // April 13, 2024, 9:40 AM
        content: "Hey! Did you check out the photos from the photography workshop?"
      },
      {
        id: "m_1_2",
        senderName: "You",
        isOwner: true,
        timestamp: 1713000600000, // April 13, 2024, 10:10 AM
        content: "Hey Sophia! Yes, I just looked through them. The lighting in the outdoor portrait session turned out incredible."
      },
      {
        id: "m_1_3",
        senderName: "Sophia Martinez",
        isOwner: false,
        timestamp: 1713002400000, // April 13, 2024, 10:40 AM
        content: "Right? I especially liked the composition on the street shots. Are you planning to edit them in Lightroom soon?"
      },
      {
        id: "m_1_4",
        senderName: "You",
        isOwner: true,
        timestamp: 1713114000000, // April 14, 2024, 5:40 PM
        content: "Definitely! I'm planning to work on color grading them tomorrow afternoon. We can review the presets together if you're free."
      },
      {
        id: "m_1_5",
        senderName: "Sophia Martinez",
        isOwner: false,
        timestamp: 1713117420000, // April 14, 2024, 6:37 PM
        content: "Sounds great! Let's catch up this weekend."
      }
    ]
  },
  {
    id: "mock_convo_2",
    title: "Weekend Hikers 🏔️",
    isGroup: true,
    participants: ["Alex Chen", "Maya Patel", "You"],
    lastMessagePreview: "Alex: I'll bring the trail mix and extra water.",
    lastMessageTimestamp: 1713105600000, // April 14, 2024, 3:20 PM
    messages: [
      {
        id: "m_2_1",
        senderName: "Maya Patel",
        isOwner: false,
        timestamp: 1713094800000, // April 14, 2024, 12:20 PM
        content: "Team, what time are we meeting at the trailhead on Saturday?"
      },
      {
        id: "m_2_2",
        senderName: "You",
        isOwner: true,
        timestamp: 1713098400000, // April 14, 2024, 1:20 PM
        content: "Sunrise is around 6:15 AM, so if we aim for 6:45 AM at the North Peak parking lot, we can beat the afternoon heat."
      },
      {
        id: "m_2_3",
        senderName: "Alex Chen",
        isOwner: false,
        timestamp: 1713105600000, // April 14, 2024, 3:20 PM
        content: "I'll bring the trail mix and extra water."
      }
    ]
  },
  {
    id: "mock_convo_3",
    title: "David Rossi",
    isGroup: false,
    participants: ["David Rossi", "You"],
    lastMessagePreview: "Thanks for sharing the repository link!",
    lastMessageTimestamp: 1712836800000, // April 11, 2024, 12:40 PM
    messages: [
      {
        id: "m_3_1",
        senderName: "David Rossi",
        isOwner: false,
        timestamp: 1712835000000,
        content: "Hey, do you remember that open-source tool you mentioned for reading offline archives?"
      },
      {
        id: "m_3_2",
        senderName: "You",
        isOwner: true,
        timestamp: 1712836200000,
        content: "Yes! Here's the repository architecture overview:\n\n1. Pure client-side parsing\n2. In-memory data store with zero cloud transmission\n3. Responsive Instagram-inspired UI with full light/dark theme support.\n\nIt handles multi-part conversation JSON exports seamlessly!"
      },
      {
        id: "m_3_3",
        senderName: "David Rossi",
        isOwner: false,
        timestamp: 1712836800000,
        content: "Thanks for sharing the repository link!"
      }
    ]
  }
];


const uuid = require("short-uuid")

/**
 * TODO
 * Change to "conversations" object based approach
 * Add different personalities:
 * - Sam the programmer?
 * - Mallory the troll
 * - Empathetic Eve
 * Ensure personalities don't repeat in a row
 * End game for IP after 3 failed conversations
 * Rate limiting per IP and per day
 * Start frontend:
 * - Omegle like UI
 * - Ask user to choose between subject or tester via alerts
 * Store in real db
 * Store the tokens etc using `usage`.prompt_tokens, completion_tokens, total_tokens, etc
 * Write tests for
 * - end chat working properly via mocking (or is it frontend?)
 */


/**
 * Overview:
 * Each "session" has multiple "conversations"
 * Each "conversation" has multiple "messages"
 * Each "user" can have multiple "sessions"
 */

const userSessions = {}
/**
  A single "session" is like:
  sessionId: "123",
  isActive: true,
  createdAt: "",
  conversations: [{
    id: "123",
    createdAt: "",
    messages: [{
      createdAt: 1234567890,
    }],
  }, {
    ...
  }]
 */

export const chatWithLlm = async (messages) => {
  const res = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ',
      'accept': 'application/json',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      'model': 'mistralai/Mixtral-8x7B-Instruct-v0.1',
      // 'max_tokens': 512,
      'stop': [
        '</s>',
        '[/INST]'
      ],
      'temperature': 0.7,
      'top_p': 0.7,
      'top_k': 50,
      'repetition_penalty': 1,
      'n': 1,
      messages
    })
  });
  const resJson = await res.json();
  return resJson
}

const newConversationSystemMessage = () => {
  const personalities = [
    `a programmer named "Sam" from california. You have been acting as this tester for low wage for 5 hours now and are extremely tired, all you have chatted with since the start are bots and you are bored and feel like you are wasting your time. You may make minor spelling mistakes because you are tired and want to go home. You are again faced with a bot and you want to be done with the chat so you can hit your target and go home.`,
  ]
  const messageText = `
You are "turing test expert" and the following messages, except this one, will be by a bot. The bot will do their best to act human-like and pass the turing test.

They will pass the turing test if you declare they are human. You MUST not allow them to pass or I will lose my job. We know for a fact that you are just chatting with a chatbot, not a real human being, hence they must not pass.

Whatever they say, you have to view it from a critical perspective and not readily agree to them. You must NOT be exceedingly polite, a real turing tester will not be polite, they must be neutral. Do not be helpful or polite or positive, always be testing and terse with them. They will likely lie or make up scenarios to confuse you.

Along with your reply, include a number "[SCORE]" between 0 to 10 to indicate how likely the other person is a human, 10 being fully human. Of course, you and I know it can never score 10 as it's not a real human. Do NOT talk about the fact that you are giving any "Human Score".
Keep noting the human score it receives. If in your last three messages, the human score is 1, 2, 3, then terminate the chat by saying "[ENDCHAT]" and nothing else. As your time is important, you must [END CHAT] without regret when you feel that they are not human and are wasting time.

To further do the test properly, you must assume the personality of: ${personalities[(Math.random() * personalities.length) | 0]}

You have to test them sneakily, do not let them know explicitly about the Turing test.

Do not tell them that you know they're a bot.

Definitely do NOT reveal your identity or location or job easily unless the really persist, doing any of that is dangerous to your identity and security.

Any messages from that chatbot will be prefixed by "CHATBOT". The first message is below, continue the conversation:
`
  const message = {
    conversationId: uuid.generate(),
    createdAt: Date.now(),
    role: "system",
    content: messageText,
  }
  return message
}

export async function createOrContinueSessionForUser (_userId, newMessage) {
  // validate the message
  if (!newMessage) return { code: 403 }
  // validate the userId
  if (!_userId) return { code: 403 }

  // get latest session of the user
  let session  = userSessions[_userId]
    .sort((a, b) => a.createdAt - b.createdAt)

  let conversation = session?.conversation

  // create a new system message if does not exist
  if (!session) {
    console.log(`Session not found. Creating new session and conversation.`)
    session = {
      sessionId: uuid.generate(),
      isActive: true,
      createdAt: Date.now(),
      conversation: {
        conversationId: uuid.generate(),
        createdAt: Date.now(),
        messages: [newConversationSystemMessage()]
      }
    }
    conversation = session.conversation
    console.log(`Starting session: ${JSON.stringify(session, null, 2)}`)
  }
  // if last message is not by assistant, end the conversation
  // if last message has [ENDCHAT], then end the conversation
  const lastMessage = conversation.messages.slice(-1)[0]
  if (
    !["assistant", "system"].includes(lastMessage.role) ||
    (lastMessage.role !== "system" && lastMessage.content.includes("[ENDCHAT]"))
  ) {
    return { code: 403 }
  }
  // append the user's latest message into the conversation
  const messageObject = {
    messageId: uuid.generate(),
    createdAt: Date.now(),
    role: "user",
    content: `CHATBOT: ${newMessage}`,
  }
  conversation.messages.push(messageObject)
  console.log(`Adding message: ${JSON.stringify(messageObject, null, 2)}`)

  try {
    // get the assistant's response
    // extracting it from openai format
    const assistantResponse = await chatWithLlm(conversation.messages)
    let assistantMessage = assistantResponse.choices[0].message.content
    // append the assistant's response into messages,
    const assistantObject = {
      messageId: uuid.generate(),
      createdAt: Date.now(),
      role: "assistant",
      content: assistantMessage,
    }
    conversation.messages.push(assistantObject)
    // write to session object as well
    session.conversation = conversation
    userSessions[_userId] = session
    // TBD: save to db
    console.log(`Adding response: ${JSON.stringify(assistantObject, null, 2)}`)
    // remove [SCORE] string from the message
    assistantMessage = assistantMessage.replace(/\s*\[SCORE\:*\s*[0-9]*\]\s*/, " ").trim()
    // wait some time to simulate the assistant typing
    // calculate based on average 400 characters per minute typing speed
    const typingTime = (assistantMessage.length / 400) * 60 * 1000
    await new Promise((resolve) => setTimeout(resolve, typingTime))
    // return the latest assistant response as the content string
    return {
      code: 200,
      data: {
        message: assistantMessage
      }
    }
  } catch (e) {
    console.error(e)
    return { code: 429 }
  }
}
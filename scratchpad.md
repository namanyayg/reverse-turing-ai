* create a simple chat app with next.js:
  ✅ simple chat input field
  ✅ generate user id on first message sent, if it does not exist
  ✅ store user id in local
  ✅ show user message in chat
  * store user message in db
  ✅ create assistant response
  * store assistant response in db
  ✅ show assistant response in chat
  ✅ determine win condition
  * upon assistant win message, trigger frontend win modal with shareable score: count of messages, time taken, and another button to try again
✅ create database on neon to handle it
* create schema.prisma with the correct tables
    user
    each user can have multiple "chats"
    each chat can have multiple "messages"
✅ improve app UI
  ✅ make like cui
  ✅ make it like a crt screen
  ✅ add intro/story text
  ✅ add "about" modal with credits to explain the concept
✅ show "time remaining" UI
* create leaderboard POST receiver, attach given username to given chatId and compute rank/score based on that.
* create leaderboard page
  * display entries (exclude chatId to not get hacked lol)
✅ show high score to user when they win or lose
  ✅ send high score from backend to frontend
  ✅ show in modals
✅ allow "Share Chat" button in frontend to win or lose modal
  ✅ initially, just initiate a share via webapi of the screenshot of the page with link



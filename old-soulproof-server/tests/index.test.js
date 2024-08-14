const request = require("supertest")

// test having a new message conversation with the api
describe("POST /chat", () => {
  let response
  it("should respond with a new conversation", async () => {
    response = await request("http://localhost:3000")
      .post("/chat")
      .send({ message: "Hi" })
    console.log(response)
    expect(response.statusCode).toBe(200)
    expect(response.body).toHaveProperty("conversationId")
    expect(response.body).toHaveProperty("message")
  }, 1000000)

  // get the conversationId from the last response and continue the chat
  it("should respond with a continued conversation", async () => {
    response = await request("http://localhost:3000")
      .post("/chat")
      .send({
        conversationId: response.body.conversationId,
        message: "How are you?",
      })
    expect(response.statusCode).toBe(200)
    expect(response.body).toHaveProperty("conversationId")
    expect(response.body).toHaveProperty("message")
  }, 1000000)
})

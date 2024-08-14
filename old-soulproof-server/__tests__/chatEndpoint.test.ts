const request = require('supertest');
const app = require('../app'); // adjust the path as needed

describe('POST /chat', () => {
  it('should return 200 and the expected response format for a new chat', async () => {
    // Arrange
    const newChat = {
      userId: 'newUserId',
      message: 'Hello, world!'
    };

    // Act
    const response = await request(app)
      .post('/chat')
      .send(newChat);

    // Assert
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('message');
  });

  it('should return 400 if message is null', async () => {
    // Arrange
    const newChat = {
      userId: 'newUserId',
      message: null
    };

    // Act
    const response = await request(app)
      .post('/chat')
      .send(newChat);

    // Assert
    expect(response.status).toBe(400);
  });

  it('should return 400 if userId is null', async () => {
    // Arrange
    const newChat = {
      userId: null,
      message: 'Hello, world!'
    };

    // Act
    const response = await request(app)
      .post('/chat')
      .send(newChat);

    // Assert
    expect(response.status).toBe(400);
  });
});


import { createOrContinueSessionForUser, chatWithLlm } from '../services/chat'

const mockResponse = {
  choices: [
    {
      message: {
        content: 'Hello, world!',
      },
    },
  ],
};

jest.mock('../services/chat', () => ({
  chatWithLlm: jest.fn(() => Promise.resolve(mockResponse)),
}));


jest.mock('uuid', () => ({
  generate: jest.fn(() => 'test-uuid'),
}));

describe('createOrContinueSessionForUser', () => {
  it('should create a new session if one does not exist', () => {
    const userId = 'test-uuid';
    const newMessage = 'Hello, world!';

    const result = createOrContinueSessionForUser(userId, newMessage);

    expect(result).toEqual({
      message: expect.any(String),
    });
  });

  it('should continue the chat if the last message is not by the assistant and does not contain [ENDCHAT]', () => {
    const userId = 'test-uuid';
    const newMessage = 'How are you?';

    const result = createOrContinueSessionForUser(userId, newMessage);

    expect(result).toEqual({
      message: expect.any(String),
    });
  });
});
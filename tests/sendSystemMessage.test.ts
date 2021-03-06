import { ServerlessCallback } from '@twilio-labs/serverless-runtime-types/types';
import { handler as sendSystemMessage, Body } from '../functions/sendSystemMessage';

import helpers, { MockedResponse } from './helpers';

const tasks: any[] = [
  {
    sid: 'task-123',
    attributes: '{"channelSid":"channel-123"}',
    fetch: async () => tasks.find(t => t.sid === 'task-123'),
  },
  {
    sid: 'broken-task',
    attributes: '{"channelSid":"non-existing"}',
    fetch: async () => tasks.find(t => t.sid === 'broken-task'),
  },
];
const channels: { [x: string]: any } = {
  'channel-123': { messages: { create: jest.fn() } },
};

const workspaces: { [x: string]: any } = {
  WSxxx: {
    tasks: (taskSid: string) => {
      const task = tasks.find(t => t.sid === taskSid);
      if (task) return task;

      throw new Error('Task does not exists');
    },
  },
};

const baseContext = {
  getTwilioClient: (): any => ({
    taskrouter: {
      workspaces: (workspaceSID: string) => {
        if (workspaces[workspaceSID]) return workspaces[workspaceSID];

        throw new Error('Workspace does not exists');
      },
    },
    chat: {
      services: (serviceSid: string) => {
        if (serviceSid === baseContext.CHAT_SERVICE_SID)
          return {
            channels: (channelSid: string) => {
              if (channels[channelSid]) return channels[channelSid];

              throw new Error('Error retrieving chat channel');
            },
          };

        throw new Error('Error retrieving chat service');
      },
    },
  }),
  DOMAIN_NAME: 'serverless',
  TWILIO_WORKSPACE_SID: 'WSxxx',
  CHAT_SERVICE_SID: 'ISxxx',
};

describe('sendSystemMessage', () => {
  beforeAll(() => {
    const runtime = new helpers.MockRuntime({});
    // eslint-disable-next-line no-underscore-dangle
    helpers.setup({}, runtime);
  });
  afterAll(() => {
    helpers.teardown();
  });

  test('Should return status 400', async () => {
    const event1: Body = { taskSid: undefined };
    const event2: Body = { taskSid: 'task-123', message: undefined };

    const callback: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(400);
    };

    await sendSystemMessage(baseContext, {}, callback);
    await sendSystemMessage(baseContext, event1, callback);
    await sendSystemMessage(baseContext, event2, callback);
  });

  test('Should return status 500', async () => {
    const event1: Body = { taskSid: 'task-123', message: 'Something to say' };
    const event2: Body = { taskSid: 'non-existing', message: 'Something to say' };
    const event3: Body = { taskSid: 'broken-task', message: 'Something to say' };

    const callback1: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(500);
      expect(response.getBody().toString()).toContain('Workspace does not exists');
    };

    const callback2: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(500);
      expect(response.getBody().toString()).toContain('Task does not exists');
    };

    const callback3: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(500);
      expect(response.getBody().toString()).toContain('Error retrieving chat channel');
    };

    const { getTwilioClient, DOMAIN_NAME } = baseContext;
    await sendSystemMessage({ getTwilioClient, DOMAIN_NAME }, event1, callback1);
    await sendSystemMessage(baseContext, event2, callback2);
    await sendSystemMessage(baseContext, event3, callback3);
  });

  test('Should return status 200', async () => {
    const event: Body = { taskSid: 'task-123', message: 'Something to say' };

    const callback: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(200);
    };

    await sendSystemMessage(baseContext, event, callback);
  });
});

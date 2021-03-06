import { ServerlessCallback } from '@twilio-labs/serverless-runtime-types/types';
import { handler as createContactlessTask, Body } from '../functions/createContactlessTask';

import helpers, { MockedResponse } from './helpers';

let tasks: any[] = [];

const workspaces: { [x: string]: any } = {
  WSxxx: {
    tasks: {
      create: async (options: any) => {
        if (JSON.parse(options.attributes).helpline === 'intentionallyThrow')
          throw new Error('Intentionally thrown error');

        tasks = [...tasks, { sid: Math.random(), ...options }];
      },
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
  }),
  DOMAIN_NAME: 'serverless',
  TWILIO_WORKSPACE_SID: 'WSxxx',
  TWILIO_CHAT_TRANSFER_WORKFLOW_SID: 'WWxxx',
};

beforeAll(() => {
  helpers.setup({});
});
afterAll(() => {
  helpers.teardown();
});

afterEach(() => {
  tasks = [];
});

describe('createContactlessTask', () => {
  test('Should return status 400', async () => {
    const bad1: Body = {
      targetSid: undefined,
      transferTargetType: 'worker',
      helpline: 'helpline',
    };
    const bad2: Body = {
      targetSid: 'WKxxx',
      transferTargetType: undefined,
      helpline: 'helpline',
    };
    const bad3: Body = {
      targetSid: 'WKxxx',
      transferTargetType: 'worker',
      helpline: undefined,
    };

    const callback: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(400);
    };

    await Promise.all(
      [{}, bad1, bad2, bad3].map(event => createContactlessTask(baseContext, event, callback)),
    );
  });

  test('Should return status 500', async () => {
    const event1: Body = {
      targetSid: 'WKxxx',
      transferTargetType: 'worker',
      helpline: 'helpline',
    };

    const event2: Body = {
      targetSid: 'WKxxx',
      transferTargetType: 'worker',
      helpline: 'intentionallyThrow',
    };

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
      expect(response.getBody().toString()).toContain('Intentionally thrown error');
    };

    const { getTwilioClient, DOMAIN_NAME } = baseContext;
    await createContactlessTask({ getTwilioClient, DOMAIN_NAME }, event1, callback1);
    await createContactlessTask(baseContext, event2, callback2);
  });

  test('Should return status 200 (WARM)', async () => {
    const event: Body = {
      targetSid: 'WKxxx',
      transferTargetType: 'worker',
      helpline: 'helpline',
    };
    const beforeTasks = Array.from(tasks);

    const callback: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(200);
      expect(beforeTasks).toHaveLength(0);
      expect(tasks).toHaveLength(1);
    };

    await createContactlessTask(baseContext, event, callback);
  });
});

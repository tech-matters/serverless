import { ServerlessCallback } from '@twilio-labs/serverless-runtime-types/types';
import { handler as getMessages, Body } from '../functions/getMessages';

import helpers, { MockedResponse } from './helpers';

const baseContext = {
  getTwilioClient: jest.fn(),
  DOMAIN_NAME: 'serverless',
};

describe('getMessages', () => {
  beforeAll(() => {
    const runtime = new helpers.MockRuntime({});
    // eslint-disable-next-line no-underscore-dangle
    runtime._addAsset(
      '/translations/es/messages.json',
      '../assets/translations/es/messages.private.json',
    );
    helpers.setup({}, runtime);
  });
  afterAll(() => {
    helpers.teardown();
  });

  test('Should return status 400', async () => {
    const event: Body = { language: undefined };

    const callback: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(400);
    };

    await getMessages(baseContext, {}, callback);
    await getMessages(baseContext, event, callback);
  });

  test('Should return status 500', async () => {
    const event: Body = { language: 'non-existing' };

    const callback: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(500);
    };

    await getMessages(baseContext, event, callback);
  });

  test('Should return status 200', async () => {
    const event: Body = { language: 'es' };

    const callback: ServerlessCallback = (err, result) => {
      expect(result).toBeDefined();
      const response = result as MockedResponse;
      expect(response.getStatus()).toBe(200);
    };

    await getMessages(baseContext, event, callback);
  });
});

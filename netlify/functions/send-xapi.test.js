import { handler } from './send-xapi.js';
import { sendXapiStatement } from '../../src/utils/sendXapiStatement.js';

jest.mock('../../src/utils/sendXapiStatement.js', () => ({
  sendXapiStatement: jest.fn(),
}));

describe('send-xapi netlify function', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.LRS_USERNAME = 'user';
    process.env.LRS_PASSWORD = 'pass';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns 200 for OPTIONS preflight', async () => {
    const res = await handler({ httpMethod: 'OPTIONS' });

    expect(res.statusCode).toBe(200);
    expect(sendXapiStatement).not.toHaveBeenCalled();
  });

  test('returns 405 for non-POST methods', async () => {
    const res = await handler({ httpMethod: 'GET' });

    expect(res.statusCode).toBe(405);
    expect(sendXapiStatement).not.toHaveBeenCalled();
  });

  test('returns 400 for invalid payload', async () => {
    const res = await handler({
      httpMethod: 'POST',
      headers: { origin: 'https://zchunter.github.io' },
      body: JSON.stringify({ replacementsChecked: -1, totalReplacements: 2 }),
    });

    expect(res.statusCode).toBe(400);
    expect(sendXapiStatement).not.toHaveBeenCalled();
  });

  test('accepts legacy replacements array payload and sends statement', async () => {
    const res = await handler({
      httpMethod: 'POST',
      headers: { origin: 'https://zchunter.github.io' },
      body: JSON.stringify({ replacements: [{}, {}, {}], totalReplacements: 7 }),
    });

    expect(res.statusCode).toBe(200);
    expect(sendXapiStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        replacementsChecked: 3,
        totalReplacements: 7,
        tool: 'xliff-swapper',
      })
    );
  });

  test('returns 500 if credentials are missing', async () => {
    delete process.env.LRS_USERNAME;

    const res = await handler({
      httpMethod: 'POST',
      headers: { origin: 'https://zchunter.github.io' },
      body: JSON.stringify({ replacementsChecked: 1, totalReplacements: 1 }),
    });

    expect(res.statusCode).toBe(500);
    expect(sendXapiStatement).not.toHaveBeenCalled();
  });

  test('returns 403 for disallowed origins', async () => {
    const res = await handler({
      httpMethod: 'POST',
      headers: { origin: 'https://example.com' },
      body: JSON.stringify({ replacementsChecked: 1, totalReplacements: 1 }),
    });

    expect(res.statusCode).toBe(403);
    expect(sendXapiStatement).not.toHaveBeenCalled();
  });

  test('accepts localhost origins for local development', async () => {
    const res = await handler({
      httpMethod: 'POST',
      headers: { origin: 'http://localhost:4321' },
      body: JSON.stringify({ replacementsChecked: 1, totalReplacements: 2 }),
    });

    expect(res.statusCode).toBe(200);
    expect(sendXapiStatement).toHaveBeenCalledWith(
      expect.objectContaining({
        replacementsChecked: 1,
        totalReplacements: 2,
      })
    );
  });
});

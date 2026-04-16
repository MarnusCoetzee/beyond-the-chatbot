import axios from 'axios';

describe('Consensus Lab API', () => {
  it('GET /api/health should return ok', async () => {
    const res = await axios.get('/api/health');
    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
  });

  it('GET /api/sessions should return empty array initially', async () => {
    const res = await axios.get('/api/sessions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.data)).toBe(true);
  });
});

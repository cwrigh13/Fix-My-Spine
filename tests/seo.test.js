const request = require('supertest');
const cheerio = require('cheerio');
const app = require('../app');

// Ensure test env
process.env.NODE_ENV = 'test';

/**
 * Helpers
 */
async function getFirstRow(sql, params = []) {
  const [rows] = await global.testPool.promise().query(sql, params);
  return rows && rows[0] ? rows[0] : null;
}

async function run(sql, params = []) {
  await global.testPool.promise().execute(sql, params);
}

describe('SEO meta tags', () => {
  beforeAll(async () => {
    // Global setup is handled in tests/setup.js (clears & seeds)
    // We ensure that a listing is approved and that at least one location satisfies the population filter used by /location/:suburb
    // 1) Approve the seeded business and set realistic details
    await run(`UPDATE businesses SET is_approved = TRUE, listing_tier = 'premium', description = 'Sydney Spine Clinic provides expert chiropractic care in North Sydney, NSW.' WHERE id = 1`);
    // 2) Ensure the Sydney location has population to pass the location route filter (> 75000)
    await run(`UPDATE locations SET population = 200000 WHERE id = 1`);
    // 3) Ensure categories have expected slugs/names
    await run(`UPDATE categories SET name = 'Chiropractor', slug = 'chiropractor' WHERE id = 1`);
    await run(`UPDATE categories SET name = 'Physiotherapist', slug = 'physiotherapists' WHERE id = 2`);
    // 4) Align the business to Sydney and Chiropractor category
    await run(`UPDATE businesses SET category_id = 1, location_id = 1, business_name = 'Sydney Spine Clinic' WHERE id = 1`);
  });

  describe('Individual Listing Page', () => {
    test('title and meta description include business, category, and location', async () => {
      const res = await request(app).get('/listing/1/sydney-spine-clinic');
      expect(res.status).toBe(200);

      const $ = cheerio.load(res.text);
      const title = $('title').text();
      const description = $('meta[name="description"]').attr('content') || '';

      expect(title).toContain('Sydney Spine Clinic');
      expect(title).toMatch(/Chiropractor/i);
      expect(title).toMatch(/Sydney|NSW/i);
      expect(title).toMatch(/\| Fix My Spine$/);

      expect(description).toMatch(/Sydney Spine Clinic/i);
      expect(description.length).toBeGreaterThan(20);
    });
  });

  describe('Category Page', () => {
    test('title and meta description are correctly formatted for the category', async () => {
      // We set category id=2 to physiotherapists with slug physiotherapists
      const res = await request(app).get('/category/physiotherapists');
      expect(res.status).toBe(200);

      const $ = cheerio.load(res.text);
      const title = $('title').text();
      const description = $('meta[name="description"]').attr('content') || '';

      expect(title).toMatch(/Find the Best Physiotherapists in Australia \| Fix My Spine/);
      expect(description).toMatch(/Physiotherapists?/i);
      expect(description.length).toBeGreaterThan(20);
    });
  });

  describe('Location Page', () => {
    test('title and meta description are correctly formatted for the location', async () => {
      // Our seeded location id=1 is Sydney; route expects suburb param matching locations.suburb
      const location = await getFirstRow('SELECT suburb FROM locations WHERE id = 1');
      const suburb = location ? location.suburb : 'Sydney';

      const res = await request(app).get(`/location/${encodeURIComponent(suburb)}`);
      if (res.status !== 200) {
        // Print server error page for diagnostics
        // eslint-disable-next-line no-console
        console.log('Location page response:', res.status, res.text);
      }
      expect(res.status).toBe(200);

      const $ = cheerio.load(res.text);
      const title = $('title').text();
      const description = $('meta[name="description"]').attr('content') || '';

      expect(title).toMatch(new RegExp(`Top Chiropractors & Physios in ${suburb} \| Fix My Spine`));
      expect(description).toMatch(new RegExp(suburb, 'i'));
      expect(description.length).toBeGreaterThan(20);
    });
  });

  describe('Homepage Fallback', () => {
    test('title and meta description match default homepage values', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);

      const $ = cheerio.load(res.text);
      const title = $('title').text();
      const description = $('meta[name="description"]').attr('content') || '';

      // Values come from routes/public.js homepage render
      expect(title).toBe('Find Trusted Chiropractors & Allied Health Professionals | Fix My Spine');
      expect(description).toContain('Find trusted Chiropractors, Physiotherapists & allied health professionals across Australia');
    });
  });
});



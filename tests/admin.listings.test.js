const request = require('supertest');
const app = require('../app');

describe('Admin Listings Management', () => {
  let agent;
  let testBusinessId;

  beforeAll(async () => {
    // Get the test business ID
    const businesses = await global.dbHelper.query('SELECT id FROM businesses WHERE business_name = ?', ['Test Chiropractic Clinic']);
    testBusinessId = businesses[0].id;
  });

  beforeEach(async () => {
    agent = request.agent(app);
    
    // Login as admin before each test
    await agent
      .post('/admin/login')
      .send({
        email: 'admin@test.com',
        password: 'admin123'
      });
  });

  describe('GET /admin/listings', () => {
    test('should display all business listings for authenticated admin', async () => {
      const response = await agent.get('/admin/listings');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Business Listings');
      expect(response.text).toContain('Test Chiropractic Clinic');
    });

    test('should redirect unauthenticated user to login', async () => {
      const newAgent = request.agent(app);
      const response = await newAgent.get('/admin/listings');
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });
  });

  describe('POST /admin/listings/:id/approve', () => {
    test('should approve a business listing', async () => {
      // First verify the business is not approved
      let business = await global.dbHelper.query('SELECT is_approved FROM businesses WHERE id = ?', [testBusinessId]);
      expect(business[0].is_approved).toBe(0); // 0 = false

      // Approve the business
      const response = await agent
        .post(`/admin/listings/${testBusinessId}/approve`)
        .send();

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/listings');

      // Verify the business is now approved
      business = await global.dbHelper.query('SELECT is_approved FROM businesses WHERE id = ?', [testBusinessId]);
      expect(business[0].is_approved).toBe(1); // 1 = true
    });

    test('should handle non-existent business ID', async () => {
      const response = await agent
        .post('/admin/listings/99999/approve')
        .send();

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/listings');
    });

    test('should redirect unauthenticated user to login', async () => {
      const newAgent = request.agent(app);
      const response = await newAgent
        .post(`/admin/listings/${testBusinessId}/approve`)
        .send();

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });
  });

  describe('GET /admin/listings/:id/edit', () => {
    test('should display edit form for existing business', async () => {
      const response = await agent.get(`/admin/listings/${testBusinessId}/edit`);
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Edit Business Listing');
      expect(response.text).toContain('Test Chiropractic Clinic');
    });

    test('should redirect to listings for non-existent business', async () => {
      const response = await agent.get('/admin/listings/99999/edit');
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/listings');
    });

    test('should redirect unauthenticated user to login', async () => {
      const newAgent = request.agent(app);
      const response = await newAgent.get(`/admin/listings/${testBusinessId}/edit`);
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });
  });

  describe('POST /admin/listings/:id/edit', () => {
    test('should update business listing with valid data', async () => {
      const updateData = {
        business_name: 'Updated Chiropractic Clinic',
        address: '456 Updated St, Sydney',
        phone: '02 8765 4321',
        website: 'https://updatedclinic.com',
        description: 'An updated chiropractic clinic',
        category_id: '1',
        location_id: '1',
        listing_tier: 'premium'
      };

      const response = await agent
        .post(`/admin/listings/${testBusinessId}/edit`)
        .send(updateData);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/listings');

      // Verify the business was updated
      const business = await global.dbHelper.query('SELECT * FROM businesses WHERE id = ?', [testBusinessId]);
      expect(business[0].business_name).toBe('Updated Chiropractic Clinic');
      expect(business[0].address).toBe('456 Updated St, Sydney');
      expect(business[0].phone).toBe('02 8765 4321');
      expect(business[0].website).toBe('https://updatedclinic.com');
      expect(business[0].description).toBe('An updated chiropractic clinic');
      expect(business[0].listing_tier).toBe('premium');
    });

    test('should require business name, category, and location', async () => {
      const updateData = {
        business_name: '',
        category_id: '',
        location_id: ''
      };

      const response = await agent
        .post(`/admin/listings/${testBusinessId}/edit`)
        .send(updateData);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(`/admin/listings/${testBusinessId}/edit`);
    });

    test('should handle non-existent business ID', async () => {
      const updateData = {
        business_name: 'Test Business',
        category_id: '1',
        location_id: '1'
      };

      const response = await agent
        .post('/admin/listings/99999/edit')
        .send(updateData);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/listings');
    });

    test('should redirect unauthenticated user to login', async () => {
      const newAgent = request.agent(app);
      const updateData = {
        business_name: 'Test Business',
        category_id: '1',
        location_id: '1'
      };

      const response = await newAgent
        .post(`/admin/listings/${testBusinessId}/edit`)
        .send(updateData);

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });
  });

  describe('POST /admin/listings/:id/delete', () => {
    test('should delete business listing', async () => {
      // First create a new business to delete
      const newBusiness = await global.dbHelper.query(`
        INSERT INTO businesses (user_id, category_id, location_id, business_name, address, phone, website, description, listing_tier, is_approved) 
        VALUES (2, 1, 1, 'Business to Delete', '123 Delete St', '02 1111 2222', 'https://delete.com', 'A business to delete', 'free', FALSE)
      `);
      const businessToDeleteId = newBusiness.insertId;

      // Verify it exists
      let business = await global.dbHelper.query('SELECT id FROM businesses WHERE id = ?', [businessToDeleteId]);
      expect(business.length).toBe(1);

      // Delete the business
      const response = await agent
        .post(`/admin/listings/${businessToDeleteId}/delete`)
        .send();

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/listings');

      // Verify it was deleted
      business = await global.dbHelper.query('SELECT id FROM businesses WHERE id = ?', [businessToDeleteId]);
      expect(business.length).toBe(0);
    });

    test('should handle non-existent business ID', async () => {
      const response = await agent
        .post('/admin/listings/99999/delete')
        .send();

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/listings');
    });

    test('should redirect unauthenticated user to login', async () => {
      const newAgent = request.agent(app);
      const response = await newAgent
        .post(`/admin/listings/${testBusinessId}/delete`)
        .send();

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });
  });
});

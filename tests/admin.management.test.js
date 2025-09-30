const request = require('supertest');
const app = require('../app');

describe('Admin Management (Users, Categories, Locations)', () => {
  let agent;

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

  describe('User Management', () => {
    describe('GET /admin/users', () => {
      test('should display all non-admin users for authenticated admin', async () => {
        const response = await agent.get('/admin/users');
        
        expect(response.status).toBe(200);
        expect(response.text).toContain('Manage Users');
        expect(response.text).toContain('Test User');
        expect(response.text).toContain('user@test.com');
      });

      test('should redirect unauthenticated user to login', async () => {
        const newAgent = request.agent(app);
        const response = await newAgent.get('/admin/users');
        
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/login');
      });
    });

    describe('POST /admin/users/:id/delete', () => {
      test('should delete a registered business owner', async () => {
        // First create a new user to delete
        const bcrypt = require('bcryptjs');
        const userPassword = await bcrypt.hash('testuser123', 10);
        
        const newUser = await global.dbHelper.query(`
          INSERT INTO users (name, email, password, is_admin) 
          VALUES ('User to Delete', 'deleteme@test.com', ?, FALSE)
        `, [userPassword]);
        const userIdToDelete = newUser.insertId;

        // Verify user exists
        let user = await global.dbHelper.query('SELECT id FROM users WHERE id = ?', [userIdToDelete]);
        expect(user.length).toBe(1);

        // Delete the user
        const response = await agent
          .post(`/admin/users/${userIdToDelete}/delete`)
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/users');

        // Verify user was deleted
        user = await global.dbHelper.query('SELECT id FROM users WHERE id = ?', [userIdToDelete]);
        expect(user.length).toBe(0);
      });

      test('should not allow deletion of admin users', async () => {
        // Get admin user ID
        const adminUser = await global.dbHelper.query('SELECT id FROM users WHERE is_admin = TRUE LIMIT 1');
        const adminUserId = adminUser[0].id;

        const response = await agent
          .post(`/admin/users/${adminUserId}/delete`)
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/users');

        // Verify admin user still exists
        const user = await global.dbHelper.query('SELECT id FROM users WHERE id = ?', [adminUserId]);
        expect(user.length).toBe(1);
      });

      test('should handle non-existent user ID', async () => {
        const response = await agent
          .post('/admin/users/99999/delete')
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/users');
      });

      test('should redirect unauthenticated user to login', async () => {
        const newAgent = request.agent(app);
        const response = await newAgent
          .post('/admin/users/1/delete')
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/login');
      });
    });
  });

  describe('Category Management', () => {
    describe('GET /admin/taxonomy', () => {
      test('should display categories and locations for authenticated admin', async () => {
        const response = await agent.get('/admin/taxonomy');
        
        expect(response.status).toBe(200);
        expect(response.text).toContain('Manage Categories & Locations');
        expect(response.text).toContain('Chiropractor');
        expect(response.text).toContain('Physiotherapist');
        expect(response.text).toContain('Massage Therapy');
      });

      test('should redirect unauthenticated user to login', async () => {
        const newAgent = request.agent(app);
        const response = await newAgent.get('/admin/taxonomy');
        
        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/login');
      });
    });

    describe('POST /admin/categories/add', () => {
      test('should add a new category', async () => {
        const response = await agent
          .post('/admin/categories/add')
          .send({
            name: 'New Test Category'
          });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');

        // Verify category was added
        const category = await global.dbHelper.query('SELECT * FROM categories WHERE name = ?', ['New Test Category']);
        expect(category.length).toBe(1);
        expect(category[0].slug).toBe('new-test-category');
      });

      test('should require category name', async () => {
        const response = await agent
          .post('/admin/categories/add')
          .send({
            name: ''
          });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');
      });

      test('should handle duplicate category names', async () => {
        // Try to add a category that already exists
        const response = await agent
          .post('/admin/categories/add')
          .send({
            name: 'Chiropractor' // This already exists from seed data
          });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');
      });

      test('should redirect unauthenticated user to login', async () => {
        const newAgent = request.agent(app);
        const response = await newAgent
          .post('/admin/categories/add')
          .send({
            name: 'Test Category'
          });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/login');
      });
    });

    describe('POST /admin/categories/:id/delete', () => {
      test('should delete a category not in use', async () => {
        // First add a new category
        const newCategory = await global.dbHelper.query(`
          INSERT INTO categories (name, slug) VALUES ('Category to Delete', 'category-to-delete')
        `);
        const categoryIdToDelete = newCategory.insertId;

        // Verify it exists
        let category = await global.dbHelper.query('SELECT id FROM categories WHERE id = ?', [categoryIdToDelete]);
        expect(category.length).toBe(1);

        // Delete the category
        const response = await agent
          .post(`/admin/categories/${categoryIdToDelete}/delete`)
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');

        // Verify it was deleted
        category = await global.dbHelper.query('SELECT id FROM categories WHERE id = ?', [categoryIdToDelete]);
        expect(category.length).toBe(0);
      });

      test('should not delete category in use by businesses', async () => {
        // Get a category that's being used by a business
        const usedCategory = await global.dbHelper.query('SELECT id FROM categories WHERE name = ?', ['Chiropractor']);
        const usedCategoryId = usedCategory[0].id;

        const response = await agent
          .post(`/admin/categories/${usedCategoryId}/delete`)
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');

        // Verify category still exists
        const category = await global.dbHelper.query('SELECT id FROM categories WHERE id = ?', [usedCategoryId]);
        expect(category.length).toBe(1);
      });

      test('should handle non-existent category ID', async () => {
        const response = await agent
          .post('/admin/categories/99999/delete')
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');
      });

      test('should redirect unauthenticated user to login', async () => {
        const newAgent = request.agent(app);
        const response = await newAgent
          .post('/admin/categories/1/delete')
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/login');
      });
    });
  });

  describe('Location Management', () => {
    describe('POST /admin/locations/add', () => {
      test('should add a new location', async () => {
        const response = await agent
          .post('/admin/locations/add')
          .send({
            suburb: 'Perth',
            postcode: '6000',
            state: 'WA'
          });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');

        // Verify location was added
        const location = await global.dbHelper.query('SELECT * FROM locations WHERE suburb = ?', ['Perth']);
        expect(location.length).toBe(1);
        expect(location[0].postcode).toBe('6000');
        expect(location[0].state).toBe('WA');
      });

      test('should require suburb, postcode, and state', async () => {
        const response = await agent
          .post('/admin/locations/add')
          .send({
            suburb: '',
            postcode: '',
            state: ''
          });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');
      });

      test('should redirect unauthenticated user to login', async () => {
        const newAgent = request.agent(app);
        const response = await newAgent
          .post('/admin/locations/add')
          .send({
            suburb: 'Test City',
            postcode: '1234',
            state: 'TS'
          });

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/login');
      });
    });

    describe('POST /admin/locations/:id/delete', () => {
      test('should delete a location not in use', async () => {
        // First add a new location
        const newLocation = await global.dbHelper.query(`
          INSERT INTO locations (suburb, postcode, state) VALUES ('Location to Delete', '9999', 'TD')
        `);
        const locationIdToDelete = newLocation.insertId;

        // Verify it exists
        let location = await global.dbHelper.query('SELECT id FROM locations WHERE id = ?', [locationIdToDelete]);
        expect(location.length).toBe(1);

        // Delete the location
        const response = await agent
          .post(`/admin/locations/${locationIdToDelete}/delete`)
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');

        // Verify it was deleted
        location = await global.dbHelper.query('SELECT id FROM locations WHERE id = ?', [locationIdToDelete]);
        expect(location.length).toBe(0);
      });

      test('should not delete location in use by businesses', async () => {
        // Get a location that's being used by a business
        const usedLocation = await global.dbHelper.query('SELECT id FROM locations WHERE suburb = ?', ['Sydney']);
        const usedLocationId = usedLocation[0].id;

        const response = await agent
          .post(`/admin/locations/${usedLocationId}/delete`)
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');

        // Verify location still exists
        const location = await global.dbHelper.query('SELECT id FROM locations WHERE id = ?', [usedLocationId]);
        expect(location.length).toBe(1);
      });

      test('should handle non-existent location ID', async () => {
        const response = await agent
          .post('/admin/locations/99999/delete')
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/taxonomy');
      });

      test('should redirect unauthenticated user to login', async () => {
        const newAgent = request.agent(app);
        const response = await newAgent
          .post('/admin/locations/1/delete')
          .send();

        expect(response.status).toBe(302);
        expect(response.headers.location).toBe('/admin/login');
      });
    });
  });
});

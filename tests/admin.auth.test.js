const request = require('supertest');
const app = require('../app');

describe('Admin Authentication', () => {
  let agent;

  beforeEach(() => {
    agent = request.agent(app);
  });

  describe('GET /admin/login', () => {
    test('should render login page for unauthenticated user', async () => {
      const response = await agent.get('/admin/login');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('Admin Login');
    });

    test('should redirect to dashboard if already logged in as admin', async () => {
      // First login
      await agent
        .post('/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123'
        });

      // Then try to access login page
      const response = await agent.get('/admin/login');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/dashboard');
    });
  });

  describe('POST /admin/login', () => {
    test('should login successfully with valid admin credentials', async () => {
      const response = await agent
        .post('/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123'
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/dashboard');
    });

    test('should deny access with incorrect password', async () => {
      const response = await agent
        .post('/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });

    test('should deny access to non-admin user', async () => {
      const response = await agent
        .post('/admin/login')
        .send({
          email: 'user@test.com',
          password: 'user123'
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });

    test('should require email and password', async () => {
      const response = await agent
        .post('/admin/login')
        .send({
          email: '',
          password: ''
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });

    test('should handle non-existent email', async () => {
      const response = await agent
        .post('/admin/login')
        .send({
          email: 'nonexistent@test.com',
          password: 'admin123'
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });
  });

  describe('Protected Routes', () => {
    test('should redirect unauthenticated request to login page', async () => {
      const response = await agent.get('/admin/dashboard');
      
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');
    });

    test('should allow access to dashboard after successful login', async () => {
      // Login first
      await agent
        .post('/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123'
        });

      // Then access dashboard
      const response = await agent.get('/admin/dashboard');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Admin Dashboard');
    });

    test('should allow access to listings after successful login', async () => {
      // Login first
      await agent
        .post('/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123'
        });

      // Then access listings
      const response = await agent.get('/admin/listings');
      expect(response.status).toBe(200);
      expect(response.text).toContain('Business Listings');
    });
  });

  describe('GET /admin/logout', () => {
    test('should logout and redirect to login page', async () => {
      // First login
      await agent
        .post('/admin/login')
        .send({
          email: 'admin@test.com',
          password: 'admin123'
        });

      // Then logout
      const response = await agent.get('/admin/logout');
      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/admin/login');

      // Verify session is destroyed by trying to access protected route
      const protectedResponse = await agent.get('/admin/dashboard');
      expect(protectedResponse.status).toBe(302);
      expect(protectedResponse.headers.location).toBe('/admin/login');
    });
  });
});

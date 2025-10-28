import request from 'supertest';
import express from 'express';
import cors from 'cors';

describe('CORS Middleware', () => {
  let app: express.Express;
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    // Restore original NODE_ENV after each test
    process.env.NODE_ENV = originalEnv;
  });

  describe('Non-production environment (development)', () => {
    beforeEach(() => {
      // Set NODE_ENV to development
      process.env.NODE_ENV = 'development';
      
      // Create app with CORS config matching index.ts
      app = express();
      app.use(cors({
        origin: process.env.NODE_ENV === 'production'
          ? [
              process.env.CLIENT_URL || 'http://localhost:8080',
              'https://faskids.shop',
              'https://www.faskids.shop',
              'http://localhost:5173',
              'http://localhost:3000'
            ]
          : true,
        credentials: true
      }));
      app.get('/test', (_req, res) => res.json({ ok: true }));
    });

    it('should allow all origins when NODE_ENV is not "production"', async () => {
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://random-origin.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://random-origin.com');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should allow any origin including localhost variants', async () => {
      const origins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://example.com',
        'https://any-domain.net'
      ];

      for (const origin of origins) {
        const response = await request(app)
          .get('/test')
          .set('Origin', origin);

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
      }
    });
  });

  describe('Production environment', () => {
    const allowedOrigins = [
      'http://localhost:8080',
      'https://faskids.shop',
      'https://www.faskids.shop',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

    beforeEach(() => {
      // Set NODE_ENV to production
      process.env.NODE_ENV = 'production';
      delete process.env.CLIENT_URL; // Use default
      
      // Create app with CORS config matching index.ts
      app = express();
      app.use(cors({
        origin: process.env.NODE_ENV === 'production'
          ? [
              process.env.CLIENT_URL || 'http://localhost:8080',
              'https://faskids.shop',
              'https://www.faskids.shop',
              'http://localhost:5173',
              'http://localhost:3000'
            ]
          : true,
        credentials: true
      }));
      app.get('/test', (_req, res) => res.json({ ok: true }));
    });

    it('should restrict origins to the defined list when NODE_ENV is "production"', async () => {
      // Test that disallowed origin doesn't get reflected back
      const response = await request(app)
        .get('/test')
        .set('Origin', 'http://malicious-site.com');

      expect(response.status).toBe(200);
      // CORS middleware should not set the Access-Control-Allow-Origin header for disallowed origins
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should correctly handle requests from allowed origins in production', async () => {
      for (const origin of allowedOrigins) {
        const response = await request(app)
          .get('/test')
          .set('Origin', origin);

        expect(response.status).toBe(200);
        expect(response.headers['access-control-allow-origin']).toBe(origin);
        expect(response.headers['access-control-allow-credentials']).toBe('true');
      }
    });

    it('should correctly block requests from disallowed origins in production', async () => {
      const disallowedOrigins = [
        'http://unauthorized.com',
        'https://evil.net',
        'http://localhost:9999',
        'https://faskids.shop.fake.com'
      ];

      for (const origin of disallowedOrigins) {
        const response = await request(app)
          .get('/test')
          .set('Origin', origin);

        expect(response.status).toBe(200); // Request succeeds but CORS blocks it
        expect(response.headers['access-control-allow-origin']).toBeUndefined();
      }
    });

    it('should respect CLIENT_URL environment variable in production', async () => {
      process.env.CLIENT_URL = 'https://custom-domain.com';
      
      // Recreate app with new CLIENT_URL
      app = express();
      app.use(cors({
        origin: process.env.NODE_ENV === 'production'
          ? [
              process.env.CLIENT_URL || 'http://localhost:8080',
              'https://faskids.shop',
              'https://www.faskids.shop',
              'http://localhost:5173',
              'http://localhost:3000'
            ]
          : true,
        credentials: true
      }));
      app.get('/test', (_req, res) => res.json({ ok: true }));

      const response = await request(app)
        .get('/test')
        .set('Origin', 'https://custom-domain.com');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('https://custom-domain.com');
    });
  });

  describe('CORS preflight requests', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      delete process.env.CLIENT_URL;
      
      app = express();
      app.use(cors({
        origin: process.env.NODE_ENV === 'production'
          ? [
              process.env.CLIENT_URL || 'http://localhost:8080',
              'https://faskids.shop',
              'https://www.faskids.shop',
              'http://localhost:5173',
              'http://localhost:3000'
            ]
          : true,
        credentials: true
      }));
      app.get('/test', (_req, res) => res.json({ ok: true }));
    });

    it('should handle preflight OPTIONS requests for allowed origins', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'https://faskids.shop')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('https://faskids.shop');
    });

    it('should reject preflight OPTIONS requests for disallowed origins', async () => {
      const response = await request(app)
        .options('/test')
        .set('Origin', 'http://malicious.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});

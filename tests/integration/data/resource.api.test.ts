import request from 'supertest';
import { Express } from 'express';
import { DataSource } from 'typeorm';
import DataService from '../../../backend/services/data';
import { Resource } from '../../../backend/services/data/entities/sample-resource.entity';
import { AuditLog } from '../../../backend/services/data/entities/audit-log.entity';
import DatabaseManager from '../../../backend/services/data/config/database';
import RedisManager from '../../../backend/services/data/config/redis';

describe('Resource API Integration Tests', () => {
  let app: Express;
  let dataSource: DataSource;
  let redisManager: typeof RedisManager;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = 'dataservice_test';
    process.env.REDIS_DB = '15'; // Use separate Redis DB for tests

    // Initialize the data service
    const dataService = new DataService(0); // Use port 0 for random available port
    app = dataService.getApp();

    // Initialize database and Redis
    dataSource = await DatabaseManager.initialize();
    redisManager = await RedisManager.initialize();

    // Clean up database before tests
    await dataSource.synchronize(true); // Drop and recreate tables

    // Set up test data
    tenantId = 'test-tenant-123';
    authToken = 'Bearer test-token-123';
  });

  beforeEach(async () => {
    // Clear Redis cache before each test
    const client = redisManager.getClient();
    await client.flushdb();

    // Clean up database tables
    await dataSource.getRepository(AuditLog).clear();
    await dataSource.getRepository(Resource).clear();
  });

  afterAll(async () => {
    // Clean up connections
    await DatabaseManager.close();
    await RedisManager.close();
  });

  describe('POST /api/data/resources', () => {
    it('should create a new resource successfully', async () => {
      const resourceData = {
        name: 'Test Resource',
        description: 'This is a test resource',
        category: 'general',
        price: 99.99,
        quantity: 10,
        tags: ['test', 'integration'],
        attributes: {
          color: 'blue',
          size: 'medium',
        },
      };

      const response = await request(app)
        .post('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(resourceData)
        .expect(201);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          name: resourceData.name,
          description: resourceData.description,
          category: resourceData.category,
          price: resourceData.price,
          quantity: resourceData.quantity,
          tags: resourceData.tags,
          attributes: resourceData.attributes,
          status: 'draft', // Default status
          isFeatured: false, // Default value
          tenantId: tenantId,
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
          etag: expect.any(String),
        }),
        meta: expect.objectContaining({
          timestamp: expect.any(String),
        }),
      });

      // Verify resource was created in database
      const repository = dataSource.getRepository(Resource);
      const createdResource = await repository.findOne({
        where: { id: response.body.data.id },
      });

      expect(createdResource).toBeTruthy();
      expect(createdResource!.name).toBe(resourceData.name);

      // Verify audit log was created
      const auditRepository = dataSource.getRepository(AuditLog);
      const auditLog = await auditRepository.findOne({
        where: {
          entityId: response.body.data.id,
          action: 'CREATE',
        },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog!.entityName).toBe('Resource');
      expect(auditLog!.tenantId).toBe(tenantId);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name field',
        category: 'general',
      };

      const response = await request(app)
        .post('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('name'),
        }),
      });
    });

    it('should enforce business rules for featured resources', async () => {
      const resourceData = {
        name: 'Featured Resource',
        isFeatured: true,
        // Missing category - should fail business rule
      };

      const response = await request(app)
        .post('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(resourceData)
        .expect(400);

      expect(response.body.error.message).toContain('Featured resources must have a category');
    });

    it('should require tenant ID', async () => {
      const resourceData = {
        name: 'Test Resource',
        category: 'general',
      };

      await request(app)
        .post('/api/data/resources')
        .set('Authorization', authToken)
        // Missing X-Tenant-ID header
        .send(resourceData)
        .expect(401);
    });
  });

  describe('GET /api/data/resources', () => {
    beforeEach(async () => {
      // Create test resources
      const repository = dataSource.getRepository(Resource);
      
      const resources = [
        {
          name: 'Resource 1',
          description: 'First test resource',
          category: 'general',
          status: 'active',
          tenantId: tenantId,
          isFeatured: true,
        },
        {
          name: 'Resource 2',
          description: 'Second test resource',
          category: 'premium',
          status: 'active',
          tenantId: tenantId,
          isFeatured: false,
        },
        {
          name: 'Resource 3',
          description: 'Third test resource',
          category: 'general',
          status: 'inactive',
          tenantId: tenantId,
          isFeatured: false,
        },
      ];

      for (const resourceData of resources) {
        const resource = repository.create(resourceData);
        await repository.save(resource);
      }
    });

    it('should list resources with pagination', async () => {
      const response = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ page: 1, limit: 2 })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            tenantId: tenantId,
          }),
        ]),
        pagination: {
          page: 1,
          limit: 2,
          total: 3,
          pages: 2,
          hasNext: true,
          hasPrev: false,
        },
      });

      expect(response.body.data).toHaveLength(2);
      expect(response.headers['x-cache']).toBe('MISS'); // First request should be cache miss
    });

    it('should cache responses', async () => {
      // First request
      const response1 = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response1.headers['x-cache']).toBe('MISS');

      // Second identical request should hit cache
      const response2 = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response2.headers['x-cache']).toBe('HIT');
      expect(response2.body.data).toEqual(response1.body.data);
    });

    it('should filter resources by status', async () => {
      const response = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ 'filter[status]': 'active' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((r: any) => r.status === 'active')).toBe(true);
    });

    it('should filter resources by category', async () => {
      const response = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ 'filter[category]': 'general' })
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((r: any) => r.category === 'general')).toBe(true);
    });

    it('should search resources by name', async () => {
      const response = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ search: 'First' })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].description).toContain('First');
    });

    it('should sort resources', async () => {
      const response = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ sortBy: 'name', sortOrder: 'ASC' })
        .expect(200);

      const names = response.body.data.map((r: any) => r.name);
      expect(names).toEqual([...names].sort());
    });

    it('should isolate resources by tenant', async () => {
      // Create resource for different tenant
      const repository = dataSource.getRepository(Resource);
      const otherTenantResource = repository.create({
        name: 'Other Tenant Resource',
        category: 'general',
        tenantId: 'other-tenant-456',
      });
      await repository.save(otherTenantResource);

      const response = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      // Should only return resources for the current tenant
      expect(response.body.data.every((r: any) => r.tenantId === tenantId)).toBe(true);
      expect(response.body.data.find((r: any) => r.name === 'Other Tenant Resource')).toBeUndefined();
    });
  });

  describe('GET /api/data/resources/:id', () => {
    let testResource: Resource;

    beforeEach(async () => {
      const repository = dataSource.getRepository(Resource);
      testResource = repository.create({
        name: 'Test Resource',
        description: 'Test description',
        category: 'general',
        tenantId: tenantId,
      });
      await repository.save(testResource);
    });

    it('should get resource by ID', async () => {
      const response = await request(app)
        .get(`/api/data/resources/${testResource.id}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testResource.id,
          name: testResource.name,
          description: testResource.description,
        }),
      });

      expect(response.headers['etag']).toBe(testResource.etag);
      expect(response.headers['cache-control']).toBe('private, max-age=300');
    });

    it('should handle conditional requests with ETag', async () => {
      // First request to get ETag
      const response1 = await request(app)
        .get(`/api/data/resources/${testResource.id}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      const etag = response1.headers['etag'];

      // Second request with If-None-Match header
      const response2 = await request(app)
        .get(`/api/data/resources/${testResource.id}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .set('If-None-Match', etag)
        .expect(304);

      expect(response2.body).toEqual({});
    });

    it('should return 404 for non-existent resource', async () => {
      await request(app)
        .get('/api/data/resources/00000000-0000-4000-8000-000000000000')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(404);
    });

    it('should prevent cross-tenant access', async () => {
      await request(app)
        .get(`/api/data/resources/${testResource.id}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', 'different-tenant-456')
        .expect(404); // Should not find resource from different tenant
    });
  });

  describe('PUT /api/data/resources/:id', () => {
    let testResource: Resource;

    beforeEach(async () => {
      const repository = dataSource.getRepository(Resource);
      testResource = repository.create({
        name: 'Original Resource',
        description: 'Original description',
        category: 'general',
        tenantId: tenantId,
        version: 1,
      });
      await repository.save(testResource);
    });

    it('should update resource successfully', async () => {
      const updateData = {
        name: 'Updated Resource',
        description: 'Updated description',
        category: 'premium',
        price: 199.99,
      };

      const response = await request(app)
        .put(`/api/data/resources/${testResource.id}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          id: testResource.id,
          name: updateData.name,
          description: updateData.description,
          category: updateData.category,
          price: updateData.price,
          version: 2, // Version should increment
        }),
      });

      // Verify database was updated
      const repository = dataSource.getRepository(Resource);
      const updatedResource = await repository.findOne({
        where: { id: testResource.id },
      });

      expect(updatedResource!.name).toBe(updateData.name);
      expect(updatedResource!.version).toBe(2);

      // Verify audit log was created
      const auditRepository = dataSource.getRepository(AuditLog);
      const auditLog = await auditRepository.findOne({
        where: {
          entityId: testResource.id,
          action: 'UPDATE',
        },
      });

      expect(auditLog).toBeTruthy();
    });

    it('should handle optimistic locking', async () => {
      const updateData = { name: 'Updated Resource' };

      // Simulate concurrent update by incrementing version
      const repository = dataSource.getRepository(Resource);
      await repository.update(testResource.id, { version: 2 });

      // This update should fail due to version mismatch
      const response = await request(app)
        .put(`/api/data/resources/${testResource.id}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .set('If-Match', 'version-1-etag') // Old version
        .send(updateData)
        .expect(422);

      expect(response.body.error.message).toContain('modified by another user');
    });

    it('should invalidate cache after update', async () => {
      // First, populate cache
      await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      // Update resource
      await request(app)
        .put(`/api/data/resources/${testResource.id}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send({ name: 'Updated Resource' })
        .expect(200);

      // Next request should be cache miss
      const response = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response.headers['x-cache']).toBe('MISS');
    });
  });

  describe('DELETE /api/data/resources/:id', () => {
    let testResource: Resource;

    beforeEach(async () => {
      const repository = dataSource.getRepository(Resource);
      testResource = repository.create({
        name: 'Resource to Delete',
        category: 'general',
        status: 'draft',
        tenantId: tenantId,
      });
      await repository.save(testResource);
    });

    it('should soft delete resource successfully', async () => {
      const response = await request(app)
        .delete(`/api/data/resources/${testResource.id}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          id: testResource.id,
          deleted: true,
        },
      });

      // Verify resource is soft deleted
      const repository = dataSource.getRepository(Resource);
      const deletedResource = await repository.findOne({
        where: { id: testResource.id },
        withDeleted: true,
      });

      expect(deletedResource).toBeTruthy();
      expect(deletedResource!.deletedAt).toBeTruthy();

      // Verify resource is not returned in normal queries
      const activeResource = await repository.findOne({
        where: { id: testResource.id },
      });

      expect(activeResource).toBeNull();

      // Verify audit log was created
      const auditRepository = dataSource.getRepository(AuditLog);
      const auditLog = await auditRepository.findOne({
        where: {
          entityId: testResource.id,
          action: 'SOFT_DELETE',
        },
      });

      expect(auditLog).toBeTruthy();
    });

    it('should enforce business rules for deletion', async () => {
      // Update resource to be featured and active (should prevent deletion)
      const repository = dataSource.getRepository(Resource);
      await repository.update(testResource.id, {
        isFeatured: true,
        status: 'active',
      });

      const response = await request(app)
        .delete(`/api/data/resources/${testResource.id}`)
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(422);

      expect(response.body.error.message).toContain('Cannot delete active featured resources');
    });
  });

  describe('POST /api/data/resources/bulk', () => {
    it('should create multiple resources successfully', async () => {
      const resourcesData = [
        {
          name: 'Bulk Resource 1',
          category: 'general',
        },
        {
          name: 'Bulk Resource 2',
          category: 'premium',
          price: 99.99,
        },
      ];

      const response = await request(app)
        .post('/api/data/resources/bulk')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send({ items: resourcesData })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          success: expect.arrayContaining([
            expect.objectContaining({
              name: 'Bulk Resource 1',
            }),
            expect.objectContaining({
              name: 'Bulk Resource 2',
            }),
          ]),
          failed: [],
          summary: {
            total: 2,
            successful: 2,
            failed: 0,
          },
        }),
      });

      // Verify resources were created in database
      const repository = dataSource.getRepository(Resource);
      const createdResources = await repository.find({
        where: { tenantId: tenantId },
      });

      expect(createdResources).toHaveLength(2);
    });

    it('should handle partial failures in bulk operations', async () => {
      const resourcesData = [
        {
          name: 'Valid Resource',
          category: 'general',
        },
        {
          // Invalid resource - missing name
          category: 'premium',
        },
      ];

      const response = await request(app)
        .post('/api/data/resources/bulk')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send({ items: resourcesData })
        .expect(200);

      expect(response.body.data.summary.successful).toBe(1);
      expect(response.body.data.summary.failed).toBe(1);
      expect(response.body.data.failed).toHaveLength(1);
      expect(response.body.data.failed[0].error).toContain('name');
    });

    it('should enforce bulk operation limits', async () => {
      const largeResourcesData = Array.from({ length: 150 }, (_, i) => ({
        name: `Bulk Resource ${i}`,
        category: 'general',
      }));

      await request(app)
        .post('/api/data/resources/bulk')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .send({ items: largeResourcesData })
        .expect(400);
    });
  });

  describe('GET /api/data/resources/featured', () => {
    beforeEach(async () => {
      const repository = dataSource.getRepository(Resource);
      
      const resources = [
        {
          name: 'Featured Resource 1',
          category: 'general',
          status: 'active',
          isFeatured: true,
          tenantId: tenantId,
        },
        {
          name: 'Featured Resource 2',
          category: 'premium',
          status: 'active',
          isFeatured: true,
          tenantId: tenantId,
        },
        {
          name: 'Not Featured Resource',
          category: 'general',
          status: 'active',
          isFeatured: false,
          tenantId: tenantId,
        },
      ];

      for (const resourceData of resources) {
        const resource = repository.create(resourceData);
        await repository.save(resource);
      }
    });

    it('should return only featured resources', async () => {
      const response = await request(app)
        .get('/api/data/resources/featured')
        .set('X-Tenant-ID', tenantId) // No auth required for featured resources
        .expect(200);

      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((r: any) => r.isFeatured === true)).toBe(true);
      expect(response.headers['cache-control']).toBe('public, max-age=900');
    });

    it('should limit featured resources', async () => {
      const response = await request(app)
        .get('/api/data/resources/featured')
        .set('X-Tenant-ID', tenantId)
        .query({ limit: 1 })
        .expect(200);

      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/data/resources/stats', () => {
    beforeEach(async () => {
      const repository = dataSource.getRepository(Resource);
      
      const resources = [
        {
          name: 'Resource 1',
          category: 'general',
          status: 'active',
          price: 99.99,
          quantity: 10,
          tenantId: tenantId,
        },
        {
          name: 'Resource 2',
          category: 'premium',
          status: 'active',
          price: 199.99,
          quantity: 5,
          tenantId: tenantId,
        },
        {
          name: 'Resource 3',
          category: 'general',
          status: 'inactive',
          tenantId: tenantId,
        },
      ];

      for (const resourceData of resources) {
        const resource = repository.create(resourceData);
        await repository.save(resource);
      }
    });

    it('should return resource statistics', async () => {
      const response = await request(app)
        .get('/api/data/resources/stats')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({
          totalResources: 3,
          activeResources: 2,
          categoryCounts: expect.arrayContaining([
            expect.objectContaining({
              category: 'general',
              count: expect.any(String),
            }),
          ]),
          averagePrice: expect.any(Number),
          totalValue: expect.any(Number),
        }),
      });

      expect(response.headers['cache-control']).toBe('private, max-age=600');
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app)
        .get('/api/data/unknown-endpoint')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
        }),
      });
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .set('Content-Type', 'application/json')
        .send('invalid json')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should handle database connection errors gracefully', async () => {
      // Close database connection to simulate error
      await dataSource.destroy();

      const response = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .expect(503);

      expect(response.body.error.code).toBe('DATABASE_CONNECTION_ERROR');

      // Reconnect for cleanup
      dataSource = await DatabaseManager.initialize();
    });
  });

  describe('Performance and Caching', () => {
    beforeEach(async () => {
      // Create multiple resources for performance testing
      const repository = dataSource.getRepository(Resource);
      const resources = Array.from({ length: 50 }, (_, i) => ({
        name: `Performance Resource ${i}`,
        category: i % 2 === 0 ? 'general' : 'premium',
        status: 'active',
        tenantId: tenantId,
      }));

      for (const resourceData of resources) {
        const resource = repository.create(resourceData);
        await repository.save(resource);
      }
    });

    it('should handle large result sets efficiently', async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ limit: 50 })
        .expect(200);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.body.data).toHaveLength(50);
      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should demonstrate cache performance improvement', async () => {
      // First request (cache miss)
      const start1 = Date.now();
      const response1 = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ limit: 25 })
        .expect(200);
      const time1 = Date.now() - start1;

      expect(response1.headers['x-cache']).toBe('MISS');

      // Second request (cache hit)
      const start2 = Date.now();
      const response2 = await request(app)
        .get('/api/data/resources')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', tenantId)
        .query({ limit: 25 })
        .expect(200);
      const time2 = Date.now() - start2;

      expect(response2.headers['x-cache']).toBe('HIT');
      expect(time2).toBeLessThan(time1); // Cache hit should be faster
      expect(response2.body.data).toEqual(response1.body.data);
    });
  });
});
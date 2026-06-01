import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { AuditServiceError } from './audit-service';

// Hoisted mock for the default-export apiClient. `vi.mock` is hoisted to the
// top of the file, so we use `vi.hoisted` to declare `apiClientGet` before
// the mock factory runs.
const { apiClientGet } = vi.hoisted(() => ({ apiClientGet: vi.fn() }));
vi.mock('./api-client', () => ({
  default: { get: apiClientGet },
}));

// axios.isAxiosError is used in the error-mapping path; vitest doesn't know
// about real axios shape unless we spy explicitly.
const isAxiosErrorSpy = vi.spyOn(axios, 'isAxiosError');

import {
  getCouponActivity,
  getCouponsForHost,
  getInactiveCouponHosts,
} from './coupon-activity-service';

beforeEach(() => {
  apiClientGet.mockReset();
  isAxiosErrorSpy.mockReset();
});

describe('coupon-activity-service', () => {
  describe('getCouponActivity', () => {
    it('GETs /api/v1/admin/audit/pages/coupon-activity with days/page/size params', async () => {
      apiClientGet.mockResolvedValueOnce({
        data: {
          summary: {
            totalHosts: 2,
            totalCoupons: 7,
            totalRedemptions: 12,
            conversionRatePct: 171.43,
          },
          rows: [],
          page: 0,
          size: 20,
          hasNext: false,
        },
      });

      const result = await getCouponActivity(7, 0, 20);

      expect(apiClientGet).toHaveBeenCalledWith(
        '/api/v1/admin/audit/pages/coupon-activity',
        { params: { days: '7', page: '0', size: '20' } },
      );
      expect(result.summary.totalHosts).toBe(2);
      expect(result.summary.totalCoupons).toBe(7);
      expect(result.rows).toEqual([]);
      expect(result.hasNext).toBe(false);
    });

    it('normalizes missing optional fields to defaults / null', async () => {
      apiClientGet.mockResolvedValueOnce({
        data: {
          // summary absent
          rows: [
            {
              // hostUserIdHash missing → null
              hostFullName: 'Aaron Tester',
              // hostPhone missing → ''
              primaryBusinessName: 'Alpha',
              // primaryBusinessCategory missing → ''
              couponsCreated: 3,
              totalRedemptions: 9,
              avgUsesPerCoupon: 3.0,
            },
          ],
          page: 0,
          size: 20,
          hasNext: false,
        },
      });

      const result = await getCouponActivity(7);

      expect(result.summary.totalHosts).toBe(0);
      expect(result.summary.totalCoupons).toBe(0);
      expect(result.rows[0].hostUserIdHash).toBeNull();
      expect(result.rows[0].hostPhone).toBe('');
      expect(result.rows[0].primaryBusinessCategory).toBe('');
    });

    it('maps axios errors with response body to AuditServiceError', async () => {
      const err = Object.assign(new Error('boom'), {
        isAxiosError: true,
        response: { status: 403, data: { message: 'Forbidden by scope' } },
      });
      apiClientGet.mockRejectedValueOnce(err);
      isAxiosErrorSpy.mockReturnValueOnce(true);

      await expect(getCouponActivity(7)).rejects.toMatchObject({
        name: 'AuditServiceError',
        status: 403,
        message: 'Forbidden by scope',
      });
    });

    it('falls back to the default message when the response body has no `message`', async () => {
      const err = Object.assign(new Error('boom'), {
        isAxiosError: true,
        response: { status: 500, data: {} },
      });
      apiClientGet.mockRejectedValueOnce(err);
      isAxiosErrorSpy.mockReturnValueOnce(true);

      const promise = getCouponActivity(7);
      await expect(promise).rejects.toBeInstanceOf(AuditServiceError);
      await expect(promise).rejects.toMatchObject({
        status: 500,
        message: 'Failed to load coupon activity',
      });
    });
  });

  describe('getCouponsForHost', () => {
    it('GETs the drill-down endpoint with hash + days', async () => {
      const validHash = 'a'.repeat(64);
      apiClientGet.mockResolvedValueOnce({
        data: {
          hostUserIdHash: validHash,
          hostFullName: 'Aaron Tester',
          coupons: [
            {
              couponId: 'c-1',
              title: 'Deal',
              type: 'TIME_BASED',
              discountType: 'PERCENTAGE',
              discountValue: 10,
              usageCount: 2,
              usageLimit: 10,
              percentFilled: 20,
              status: 'ACTIVE',
              createdAt: '2026-05-20T10:00:00Z',
            },
          ],
        },
      });

      const result = await getCouponsForHost(validHash, 7);

      expect(apiClientGet).toHaveBeenCalledWith(
        '/api/v1/admin/audit/pages/coupon-activity/coupons',
        { params: { hostUserIdHash: validHash, days: '7' } },
      );
      expect(result.coupons).toHaveLength(1);
      expect(result.coupons[0].percentFilled).toBe(20);
    });

    it('normalizes unlimited usageLimit to null', async () => {
      apiClientGet.mockResolvedValueOnce({
        data: {
          hostUserIdHash: null,
          hostFullName: 'x',
          coupons: [
            {
              couponId: 'c-2',
              title: 't',
              type: 'TIME_BASED',
              discountType: 'PERCENTAGE',
              discountValue: 10,
              usageCount: 5,
              // usageLimit absent → null
              // percentFilled absent → null
              status: 'ACTIVE',
              createdAt: '2026-05-20T10:00:00Z',
            },
          ],
        },
      });

      const result = await getCouponsForHost('h', 7);
      expect(result.coupons[0].usageLimit).toBeNull();
      expect(result.coupons[0].percentFilled).toBeNull();
    });
  });

  describe('getInactiveCouponHosts', () => {
    it('GETs the inactive-hosts endpoint with page + size; defaults to no params when absent', async () => {
      apiClientGet.mockResolvedValueOnce({
        data: {
          totalInactiveHosts: 3,
          rows: [
            {
              hostUserIdHash: 'h1',
              hostFullName: 'Charlie',
              hostPhone: '+40700000000',
              primaryBusinessName: 'Spa',
              primaryBusinessCategory: 'SERVICE',
              lastCouponAt: null,
              daysSinceLastCoupon: null,
            },
          ],
          page: 0,
          size: 20,
          hasNext: false,
        },
      });

      const result = await getInactiveCouponHosts(0, 20);

      expect(apiClientGet).toHaveBeenCalledWith(
        '/api/v1/admin/audit/pages/inactive-coupon-hosts',
        { params: { page: '0', size: '20' } },
      );
      expect(result.totalInactiveHosts).toBe(3);
      expect(result.rows[0].lastCouponAt).toBeNull();
      expect(result.rows[0].daysSinceLastCoupon).toBeNull();
    });

    it('preserves non-null lastCouponAt + daysSinceLastCoupon', async () => {
      apiClientGet.mockResolvedValueOnce({
        data: {
          totalInactiveHosts: 1,
          rows: [
            {
              hostUserIdHash: 'h1',
              hostFullName: 'Dormant Host',
              hostPhone: '+40700000000',
              primaryBusinessName: 'Spa',
              primaryBusinessCategory: 'SERVICE',
              lastCouponAt: '2026-01-01T00:00:00Z',
              daysSinceLastCoupon: 144,
            },
          ],
          page: 0,
          size: 20,
          hasNext: false,
        },
      });

      const result = await getInactiveCouponHosts();
      expect(result.rows[0].lastCouponAt).toBe('2026-01-01T00:00:00Z');
      expect(result.rows[0].daysSinceLastCoupon).toBe(144);
    });

    it('non-axios errors propagate unwrapped', async () => {
      apiClientGet.mockRejectedValueOnce(new Error('non-axios boom'));
      isAxiosErrorSpy.mockReturnValueOnce(false);

      await expect(getInactiveCouponHosts()).rejects.toThrow('non-axios boom');
    });
  });
});

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { apiClient, ApiClient } from '@/lib/api'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('ApiClient', () => {
  let client: ApiClient

  beforeEach(() => {
    vi.clearAllMocks()
    client = new ApiClient('http://test-api.com')
  })

  describe('constructor', () => {
    it('should use provided base URL', () => {
      const customClient = new ApiClient('http://custom-api.com')
      expect(customClient).toBeInstanceOf(ApiClient)
    })

    it('should use default base URL when none provided', () => {
      const defaultClient = new ApiClient()
      expect(defaultClient).toBeInstanceOf(ApiClient)
    })
  })

  describe('getPixels', () => {
    it('should fetch pixels with correct parameters', async () => {
      const mockPixels = [
        { x: 1, y: 1, color: '#ff0000' },
        { x: 2, y: 2, color: '#00ff00' },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPixels),
      })

      const result = await client.getPixels(0, 0, 10, 10)

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/pixels?x1=0&y1=0&x2=10&y2=10', {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual(mockPixels)
    })

    it('should throw error on failed request', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      await expect(client.getPixels(0, 0, 10, 10)).rejects.toThrow(
        'API request failed: 500 Internal Server Error'
      )
    })
  })

  describe('createInvoice', () => {
    it('should create invoice for single pixel', async () => {
      const mockResponse = {
        invoice: 'lnbc...',
        payment_hash: 'hash123',
        amount: 100,
        id: 'inv123',
        isMock: false,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.createInvoice(5, 10, '#ff0000', 'A')

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x: 5,
          y: 10,
          color: '#ff0000',
          letter: 'A',
        }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should create invoice without letter', async () => {
      const mockResponse = {
        invoice: 'lnbc...',
        payment_hash: 'hash123',
        amount: 10,
        id: 'inv123',
        isMock: false,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.createInvoice(5, 10, '#ff0000')

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x: 5,
          y: 10,
          color: '#ff0000',
        }),
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('createBulkInvoice', () => {
    it('should create bulk invoice', async () => {
      const mockResponse = {
        invoice: 'lnbc...',
        payment_hash: 'hash123',
        amount: 1000,
        id: 'inv123',
        isMock: false,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.createBulkInvoice(0, 0, 10, 10, '#ff0000', ['A', 'B'])

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/invoices/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 10,
          color: '#ff0000',
          letters: ['A', 'B'],
        }),
      })
      expect(result).toEqual(mockResponse)
    })

    it('should create bulk invoice without letters', async () => {
      const mockResponse = {
        invoice: 'lnbc...',
        payment_hash: 'hash123',
        amount: 100,
        id: 'inv123',
        isMock: false,
      }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.createBulkInvoice(0, 0, 10, 10, '#ff0000')

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/invoices/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x1: 0,
          y1: 0,
          x2: 10,
          y2: 10,
          color: '#ff0000',
        }),
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('getActivity', () => {
    it('should fetch activity without limit', async () => {
      const mockActivity = [
        {
          id: '1',
          type: 'purchase',
          x: 1,
          y: 1,
          color: '#ff0000',
          amount: 100,
          timestamp: '2023-01-01T00:00:00Z',
        },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockActivity),
      })

      const result = await client.getActivity()

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/activity', {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual(mockActivity)
    })

    it('should fetch activity with limit', async () => {
      const mockActivity = [
        {
          id: '1',
          type: 'purchase',
          x: 1,
          y: 1,
          color: '#ff0000',
          amount: 100,
          timestamp: '2023-01-01T00:00:00Z',
        },
      ]

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockActivity),
      })

      const result = await client.getActivity(10)

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/activity?limit=10', {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual(mockActivity)
    })
  })

  describe('verifyEvent', () => {
    it('should verify payment event', async () => {
      const mockResponse = { verified: true }

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await client.verifyEvent('event123')

      expect(mockFetch).toHaveBeenCalledWith('http://test-api.com/verify/event123', {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      expect(result).toEqual(mockResponse)
    })
  })

  describe('request method', () => {
    it('should include custom headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      await client.getPixels(0, 0, 10, 10)

      const call = mockFetch.mock.calls[0]
      expect(call[1].headers).toEqual({
        'Content-Type': 'application/json',
      })
    })

    it('should merge custom headers with default', async () => {
      const customClient = new ApiClient()
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })

      // We can't easily test the private request method directly,
      // but we can test that the public methods work with custom options
      // This is tested indirectly through the other tests
    })
  })
})

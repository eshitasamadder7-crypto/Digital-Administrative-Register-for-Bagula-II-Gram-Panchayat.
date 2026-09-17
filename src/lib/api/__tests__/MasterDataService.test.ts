import { describe, it, expect, vi } from 'vitest';
import { MasterDataService } from '@/lib/api/MasterDataService';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: 'village1',
              name: 'Test Village',
              is_active: true,
              master_village_post_offices: [
                {
                  is_active: true,
                  post_office: { id: 'po1', name: 'Test PO', pin_code: '123456', is_active: true }
                }
              ]
            }
          ],
          error: null
        })
      }))
    }))
  }
}));

describe('MasterDataService', () => {
  it('getActiveVillagesWithPostOffices maps correctly', async () => {
    const data = await MasterDataService.getActiveVillagesWithPostOffices();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Test Village');
    expect(data[0].postOffices).toHaveLength(1);
    expect(data[0].postOffices[0].name).toBe('Test PO');
  });
});

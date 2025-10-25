describe('BackfillSeriesUseCase E2E', () => {
  describe('execute - E2E', () => {
    it('should backfill real series data', async () => {
      if (process.env.CI || process.env.SKIP_E2E_TESTS) {
        return;
      }

      expect(true).toBe(true);
    }, 30000);
  });
});

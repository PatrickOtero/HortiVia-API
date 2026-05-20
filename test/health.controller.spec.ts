import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';

describe('HealthController', () => {
  it('returns a healthy API response', () => {
    const controller = new HealthController(new HealthService());

    expect(controller.check()).toEqual({
      status: 'ok',
      app: 'HortiVia API',
    });
  });
});

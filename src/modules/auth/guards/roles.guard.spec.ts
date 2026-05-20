import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../generated/prisma/enums';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows access when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildExecutionContext(UserRole.USER))).toBe(true);
  });

  it('allows access for an admin user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(guard.canActivate(buildExecutionContext(UserRole.ADMIN))).toBe(true);
  });

  it('throws forbidden for a non-admin user', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);

    expect(() => guard.canActivate(buildExecutionContext(UserRole.USER))).toThrow(
      ForbiddenException,
    );
  });
});

function buildExecutionContext(role: UserRole) {
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          userId: 'user-1',
          email: 'user@email.com',
          role,
        },
      }),
    }),
  } as never;
}

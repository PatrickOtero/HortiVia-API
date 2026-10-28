import { TrainingService, summarizeProgress } from './training.service';
import type { PrismaService } from '../../prisma/prisma.service';

describe('Learning ranking', () => {
  const user = (id: string, specialBadge: 'FOUNDER' | 'CO_FOUNDER' | 'SPECIALIST' | null = null) => ({
    id, name: id, avatarUrl: null, store: 'Loja de teste', jobTitle: 'Repositor', specialBadge,
  });
  const attempt = (id: string, isCorrect: boolean, questionVersion = 1) => ({ user: user(id), isCorrect, questionVersion });
  const findMany = jest.fn();
  const service = new TrainingService({ trainingQuestion: { findMany } } as unknown as PrismaService);
  beforeEach(() => jest.clearAllMocks());

  it('shares ranks on ties, selects only eligible questions/latest answers and ignores obsolete versions', async () => {
    findMany.mockResolvedValue([
      { version: 1, attempts: [attempt('Ana', true), attempt('Bia', true), attempt('Caio', false)] },
      { version: 2, attempts: [attempt('Ana', false, 2), attempt('Bia', true, 1), attempt('Obsoleto', true, 1)] },
      { version: 1, attempts: [] },
    ]);
    const result = await service.ranking('Caio');
    expect(result.top.map(entry => [entry.user.id, entry.position, entry.progress.correct, entry.progress.percent])).toEqual([
      ['Ana', 1, 1, 33], ['Bia', 1, 1, 33], ['Caio', 3, 0, 0],
    ]);
    expect(result.participants).toBe(3);
    expect(result.currentUser?.position).toBe(3);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { isPublished: true, product: { isActive: true } },
      select: expect.objectContaining({ attempts: expect.objectContaining({ distinct: ['userId'], orderBy: { id: 'desc' } }) }),
    }));
  });

  it('returns ten leaders and the current participant outside the top ten without badge advantages', async () => {
    const people = Array.from({ length: 12 }, (_, i) => user(`Pessoa ${String(i).padStart(2, '0')}`, i === 11 ? 'FOUNDER' : null));
    findMany.mockResolvedValue(Array.from({ length: 12 }, (_, q) => ({
      version: 1, attempts: people.map((person, index) => ({ user: person, questionVersion: 1, isCorrect: q >= index })),
    })));
    const result = await service.ranking(people[11].id);
    expect(result.top).toHaveLength(10);
    expect(result.currentUser).toMatchObject({ position: 12, user: { specialBadge: 'FOUNDER' }, progress: { correct: 1, total: 12 } });
    expect(result.top[0].user.specialBadge).toBeNull();
  });

  it('does not count older correct answers after an incorrect latest answer', () => {
    expect(summarizeProgress([{ version: 1, attempts: [
      { questionVersion: 1, isCorrect: false }, { questionVersion: 1, isCorrect: true },
    ] }])).toEqual({ total: 1, answered: 1, correct: 0, percent: 0 });
  });

  it('handles an empty catalog and a user who has never participated', async () => {
    findMany.mockResolvedValue([]);
    expect(await service.ranking('new-user')).toEqual({ participants: 0, top: [], currentUser: null });
  });
});

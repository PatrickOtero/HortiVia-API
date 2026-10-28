import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import type { TrainingAttempt } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AnswerQuestionDto } from './dto/answer-question.dto';
import type { SaveQuestionDto } from './dto/save-question.dto';

const questionProgressSelect = (userId: string) => ({
  id: true, version: true,
  attempts: { where: { userId }, orderBy: { id: 'desc' as const }, take: 1,
    select: { questionVersion: true, isCorrect: true } },
});

type ProgressQuestion = {
  version: number;
  attempts: { questionVersion: number; isCorrect: boolean }[];
};

export function summarizeProgress(questions: ProgressQuestion[], total = questions.length) {
  const latest = questions.flatMap(q => q.attempts.slice(0, 1).filter(a => a.questionVersion === q.version));
  const correct = latest.filter(a => a.isCorrect).length;
  return { total, answered: latest.length, correct,
    percent: total ? Math.round(correct / total * 100) : 0 };
}

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  private async requireProduct(productId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, isActive: true }, select: { id: true, name: true },
    });
    if (!product) throw new NotFoundException('Produto não disponível.');
    return product;
  }

  async getProduct(productId: string, userId: string) {
    const product = await this.requireProduct(productId);
    // Explicit projection: no answer key, explanation or guide citation before submission.
    const questions = await this.prisma.trainingQuestion.findMany({
      where: { productId, isPublished: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: { ...questionProgressSelect(userId), prompt: true, options: true, sortOrder: true },
    });
    return { product, questions: questions.map(({ attempts: _attempts, ...question }) => question),
      progress: summarizeProgress(questions) };
  }

  async progress(userId: string) {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, trainingQuestions: { some: { isPublished: true } } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, trainingQuestions: {
        where: { isPublished: true }, select: questionProgressSelect(userId),
      } },
    });
    return { summary: summarizeProgress(products.flatMap(product => product.trainingQuestions)),
      products: products.map(({ trainingQuestions, ...product }) => ({
      product, progress: summarizeProgress(trainingQuestions),
    })) };
  }

  async ranking(userId: string) {
    // One projection of eligible questions and the latest answer per participant.
    // Do not select contact details, roles or answer keys for this public response.
    const questions = await this.prisma.trainingQuestion.findMany({
      where: { isPublished: true, product: { isActive: true } },
      select: {
        version: true,
        attempts: {
          distinct: ['userId'], orderBy: { id: 'desc' },
          select: {
            questionVersion: true, isCorrect: true,
            user: { select: {
              id: true, name: true, avatarUrl: true, store: true,
              jobTitle: true, specialBadge: true,
            } },
          },
        },
      },
    });
    type Participant = {
      user: (typeof questions)[number]['attempts'][number]['user'];
      questions: ProgressQuestion[];
    };
    const participants = new Map<string, Participant>();
    for (const question of questions) {
      for (const attempt of question.attempts) {
        if (attempt.questionVersion !== question.version) continue;
        const participant = participants.get(attempt.user.id) ?? {
          user: attempt.user, questions: [],
        };
        participant.questions.push({ version: question.version, attempts: [attempt] });
        participants.set(attempt.user.id, participant);
      }
    }
    const ordered = [...participants.values()].map(participant => ({
      user: participant.user,
      progress: summarizeProgress(participant.questions, questions.length),
    })).sort((a, b) => b.progress.correct - a.progress.correct ||
      b.progress.percent - a.progress.percent || a.user.name.localeCompare(b.user.name, 'pt-BR') ||
      a.user.id.localeCompare(b.user.id));
    let position = 0;
    const ranked = ordered.map((entry, index) => {
      const previous = ordered[index - 1];
      if (!previous || previous.progress.correct !== entry.progress.correct ||
        previous.progress.percent !== entry.progress.percent) position = index + 1;
      return { ...entry, position };
    });
    return {
      participants: ranked.length,
      top: ranked.slice(0, 10),
      currentUser: ranked.find(entry => entry.user.id === userId) ?? null,
    };
  }

  async adminList(productId: string) {
    const product = await this.requireProduct(productId);
    const questions = await this.prisma.trainingQuestion.findMany({
      where: { productId }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return { product, questions };
  }

  private questionData(dto: SaveQuestionDto) {
    const sourceReference = typeof dto.sourceReference === 'string' ? dto.sourceReference.trim() : null;
    if (dto.isPublished && !sourceReference) {
      throw new BadRequestException('Informe uma referência no guia para publicar a pergunta.');
    }
    if (dto.correctOptionIndex >= dto.options.length) {
      throw new BadRequestException('A resposta correta deve apontar para uma alternativa existente.');
    }
    return { prompt: dto.prompt, options: dto.options, correctOptionIndex: dto.correctOptionIndex,
      explanation: dto.explanation, sourceReference: sourceReference || null,
      sortOrder: dto.sortOrder, isPublished: dto.isPublished };
  }

  async create(productId: string, dto: SaveQuestionDto) {
    await this.requireProduct(productId);
    return this.prisma.trainingQuestion.create({ data: { productId, ...this.questionData(dto) } });
  }

  async update(productId: string, questionId: string, dto: SaveQuestionDto) {
    await this.requireProduct(productId);
    if (!dto.version) throw new BadRequestException('Informe a versão da pergunta.');
    const data = this.questionData(dto);
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "TrainingQuestion" WHERE "id" = ${questionId} FOR UPDATE`;
      const current = await tx.trainingQuestion.findFirst({ where: { id: questionId, productId } });
      if (!current) throw new NotFoundException('Pergunta não encontrada.');
      if (current.version !== dto.version) {
        throw new ConflictException('A pergunta foi alterada. Recarregue antes de salvar.');
      }
      const contentChanged = current.prompt !== data.prompt ||
        JSON.stringify(current.options) !== JSON.stringify(data.options) ||
        current.correctOptionIndex !== data.correctOptionIndex ||
        current.explanation !== data.explanation || current.sourceReference !== data.sourceReference;
      return tx.trainingQuestion.update({ where: { id: questionId }, data: {
        ...data, version: contentChanged ? { increment: 1 } : undefined,
        // Publication is explicit editorial approval of a seed draft.
        isDemo: data.isPublished ? false : current.isDemo,
      } });
    });
  }

  private feedback(attempt: TrainingAttempt) {
    return { attemptId: attempt.id, questionId: attempt.questionId,
      isCorrect: attempt.isCorrect, correctOptionIndex: attempt.correctOptionIndex,
      explanation: attempt.explanation, sourceReference: attempt.sourceReference };
  }

  private verifyReplay(attempt: TrainingAttempt, questionId: string, dto: AnswerQuestionDto) {
    if (attempt.questionId !== questionId || attempt.questionVersion !== dto.version ||
      attempt.selectedOptionIndex !== dto.selectedOptionIndex) {
      throw new ConflictException('Este envio já foi usado para outra resposta.');
    }
    return this.feedback(attempt);
  }

  async answer(questionId: string, userId: string, dto: AnswerQuestionDto) {
    try {
      return await this.prisma.$transaction(async tx => {
        // Shared row lock prevents deactivation/editing during grading and insertion.
        await tx.$queryRaw`SELECT "id" FROM "TrainingQuestion" WHERE "id" = ${questionId} FOR SHARE`;
        const question = await tx.trainingQuestion.findFirst({
          where: { id: questionId, isPublished: true, product: { isActive: true } },
        });
        if (!question) throw new NotFoundException('Pergunta não disponível.');
        const replay = await tx.trainingAttempt.findUnique({
          where: { userId_submissionKey: { userId, submissionKey: dto.submissionKey } },
        });
        if (replay) return this.verifyReplay(replay, questionId, dto);
        if (question.version !== dto.version) {
          throw new ConflictException('O treinamento foi atualizado. Recarregue para continuar.');
        }
        if (dto.selectedOptionIndex >= question.options.length) {
          throw new BadRequestException('Alternativa não disponível.');
        }
        const attempt = await tx.trainingAttempt.create({ data: {
          userId, questionId, questionVersion: question.version,
          selectedOptionIndex: dto.selectedOptionIndex, submissionKey: dto.submissionKey,
          isCorrect: dto.selectedOptionIndex === question.correctOptionIndex,
          correctOptionIndex: question.correctOptionIndex, explanation: question.explanation,
          sourceReference: question.sourceReference,
        } });
        return this.feedback(attempt);
      });
    } catch (error) {
      // Simultaneous retries share a unique key; only one attempt is committed.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const replay = await this.prisma.trainingAttempt.findUnique({
          where: { userId_submissionKey: { userId, submissionKey: dto.submissionKey } },
        });
        if (replay) return this.verifyReplay(replay, questionId, dto);
      }
      throw error;
    }
  }
}

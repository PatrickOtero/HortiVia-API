import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '../../generated/prisma/enums';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { SaveQuestionDto } from './dto/save-question.dto';
import { TrainingService } from './training.service';

@Controller('training')
@UseGuards(JwtAuthGuard)
export class TrainingController {
  constructor(private readonly training: TrainingService) {}

  @Get('progress')
  progress(@CurrentUser() user: AuthenticatedUser) {
    return this.training.progress(user.userId);
  }

  @Get('products/:productId')
  getProduct(@Param('productId') productId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.training.getProduct(productId, user.userId);
  }

  @Post('questions/:questionId/answers')
  answer(@Param('questionId') questionId: string, @Body() dto: AnswerQuestionDto,
    @CurrentUser() user: AuthenticatedUser) {
    return this.training.answer(questionId, user.userId, dto);
  }
}

@Controller('admin/training/products/:productId/questions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminTrainingController {
  constructor(private readonly training: TrainingService) {}

  @Get()
  list(@Param('productId') productId: string) {
    return this.training.adminList(productId);
  }

  @Post()
  create(@Param('productId') productId: string, @Body() dto: SaveQuestionDto) {
    return this.training.create(productId, dto);
  }

  @Patch(':questionId')
  update(@Param('productId') productId: string, @Param('questionId') questionId: string,
    @Body() dto: SaveQuestionDto) {
    return this.training.update(productId, questionId, dto);
  }
}

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ListSavedArticlesQueryDto } from './dto/list-saved-articles-query.dto';
import { ArticlesService } from './articles.service';

@Controller('saved')
@UseGuards(JwtAuthGuard)
export class SavedArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get('articles')
  async listSavedArticles(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListSavedArticlesQueryDto,
  ) {
    return this.articlesService.listSavedArticles(user.userId, query);
  }
}

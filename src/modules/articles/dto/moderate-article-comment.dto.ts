import { IsIn } from 'class-validator';
import { ArticleCommentStatus } from '../../../generated/prisma/enums';

export class ModerateArticleCommentDto {
  @IsIn([ArticleCommentStatus.VISIBLE, ArticleCommentStatus.HIDDEN])
  status!: ArticleCommentStatus;
}

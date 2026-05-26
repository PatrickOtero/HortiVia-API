import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { ListFavoriteProductsQueryDto } from './dto/list-favorite-products-query.dto';
import { ProductsService } from './products.service';

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('products')
  async listFavoriteProducts(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListFavoriteProductsQueryDto,
  ) {
    return this.productsService.listFavoriteProducts(user.userId, query);
  }
}

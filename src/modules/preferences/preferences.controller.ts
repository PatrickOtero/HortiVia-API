import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferencesService } from './preferences.service';

@Controller('preferences')
@UseGuards(JwtAuthGuard)
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @Get()
  async getPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.preferencesService.getPreferences(user.userId);
  }

  @Patch()
  async updatePreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    return this.preferencesService.updatePreferences(
      user.userId,
      updatePreferencesDto,
    );
  }
}

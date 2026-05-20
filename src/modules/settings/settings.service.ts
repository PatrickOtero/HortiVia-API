import { Injectable } from '@nestjs/common';
import { SettingsRepository } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(private readonly settingsRepository: SettingsRepository) {}

  get repository() {
    return this.settingsRepository;
  }
}

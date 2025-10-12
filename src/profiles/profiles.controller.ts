import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    return this.profilesService.getProfile(user.id);
  }

  @Put('me')
  @UseGuards(SupabaseAuthGuard)
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() payload: UpdateProfileDto,
  ) {
    return this.profilesService.upsertProfile(user.id, payload);
  }
}

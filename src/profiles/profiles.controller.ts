import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { User } from '@supabase/supabase-js';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { ProfilesService } from './profiles.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('Profiles')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get('me')
  @ApiOperation({
    summary: '내 프로필 조회',
    description: '현재 사용자의 프로필 정보 조회',
  })
  @UseGuards(SupabaseAuthGuard)
  async getMyProfile(@CurrentUser() user: User) {
    return this.profilesService.getProfile(user.id);
  }

  @Put('me')
  @ApiOperation({
    summary: '내 프로필 수정',
    description: '현재 사용자의 프로필 정보 수정',
  })
  @UseGuards(SupabaseAuthGuard)
  async updateMyProfile(
    @CurrentUser() user: User,
    @Body() payload: UpdateProfileDto,
  ) {
    return this.profilesService.upsertProfile(user.id, payload);
  }
}

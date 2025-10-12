import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

interface ProfileRecord {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  updated_at: string | null;
  created_at: string | null;
}

@Injectable()
export class ProfilesService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async getProfile(userId: string) {
    const client = this.supabaseService.getClient();

    const { data, error } = await client
      .from('profiles')
      .select('id, username, full_name, avatar_url, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Profile not found.');
      }
      throw new InternalServerErrorException(error.message);
    }

    if (!data) {
      throw new NotFoundException('Profile not found.');
    }

    return this.mapProfile(data);
  }

  async upsertProfile(userId: string, payload: UpdateProfileDto) {
    const client = this.supabaseService.getClient();
    const updates = {
      id: userId,
      username: payload.username ?? null,
      full_name: payload.fullName ?? null,
      avatar_url: payload.avatarUrl ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client
      .from('profiles')
      .upsert(updates, { onConflict: 'id' })
      .select('id, username, full_name, avatar_url, created_at, updated_at')
      .maybeSingle();

    if (error) {
      throw new InternalServerErrorException(error.message);
    }

    if (!data) {
      throw new InternalServerErrorException('Failed to persist profile.');
    }

    return this.mapProfile(data);
  }

  private mapProfile(record: ProfileRecord) {
    return {
      id: record.id,
      username: record.username,
      fullName: record.full_name,
      avatarUrl: record.avatar_url,
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    };
  }
}

import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import type { SupabaseClient } from '@supabase/supabase-js';
import { lookup as mimeLookup } from 'mime-types';
import { RedisService } from '../redis/redis.service.js';
import {
  SUPABASE_CLIENT,
  SUPABASE_MODULE_OPTIONS,
  type SupabaseModuleOptions,
} from './supabase.module-definition.js';
import type {
  StorageObjectInfo,
  UploadBody,
  UploadOptions,
} from './types.js';

const supabaseUploadPathKey = (token: string) =>
  `supabase:upload_path:${token}`;

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);

  constructor(
    @Inject(SUPABASE_CLIENT) private readonly client: SupabaseClient,
    @Inject(SUPABASE_MODULE_OPTIONS)
    private readonly options: SupabaseModuleOptions,
    private readonly redisService: RedisService,
  ) {
    this.logger.log('Supabase initialized successfully');
  }

  private resolveBucket(bucket: string): string {
    if (!this.options.buckets.length) {
      throw new InternalServerErrorException(
        'Supabase storage buckets are required. Set SUPABASE_BUCKETS.',
      );
    }
    if (!this.options.buckets.includes(bucket)) {
      throw new InternalServerErrorException(
        `Supabase storage bucket ${bucket} is not valid. Valid buckets are: ${this.options.buckets.join(', ')}`,
      );
    }
    return bucket;
  }

  private resolveContentType(
    filePath: string,
    body: UploadBody,
    explicit?: string,
  ): string {
    if (explicit) return explicit;

    if (typeof Blob !== 'undefined' && body instanceof Blob && body.type) {
      return body.type;
    }

    return mimeLookup(filePath) || 'application/octet-stream';
  }

  /**
   * Upload / write a file to Supabase Storage.
   */
  async upload(
    user_id: string,
    name: string,
    bucket: string,
    body: UploadBody,
    options: UploadOptions = {},
  ) {
    try {
      const filePath = `${user_id}/${Date.now()}_${name}`;
      const bucketName = this.resolveBucket(bucket);
      const { upsert = false, cacheControl = '3600' } = options;
      const contentType = this.resolveContentType(
        filePath,
        body,
        options.contentType,
      );

      this.logger.log(
        `Starting storage upload userId=${user_id} path=${filePath} bucket=${bucketName}`,
      );
      const { data, error } = await this.client.storage
        .from(bucketName)
        .upload(filePath, body, {
          contentType,
          upsert,
          cacheControl,
        });

      if (error) {
        this.logger.error('Error uploading to Supabase Storage', error);
        throw new InternalServerErrorException(
          `Failed to upload file to Supabase Storage: ${error}`,
        );
      }
      this.logger.log(
        `Completed storage upload userId=${user_id} path=${filePath}`,
      );

      return data;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Error uploading to Supabase Storage', error);
      throw new InternalServerErrorException(
        'An error occurred while uploading to Supabase Storage.',
      );
    }
  }

  /**
   * Generate a signed upload URL (and token) for client-side uploads.
   */
  async createSignedUploadUrl(user_id: string, name: string, bucket: string) {
    try {
      this.logger.log(
        `Starting signed upload URL create userId=${user_id} name=${name} bucket=${bucket}`,
      );
      const filePath = `${user_id}/${Date.now()}_${name}`;
      const bucketName = this.resolveBucket(bucket);

      this.logger.log(
        `Starting signed upload URL create userId=${user_id} path=${filePath} bucket=${bucketName}`,
      );
      const { data, error } = await this.client.storage
        .from(bucketName)
        .createSignedUploadUrl(filePath, { upsert: false });

      if (error || !data) {
        this.logger.error('Error creating signed upload URL', error);
        throw new InternalServerErrorException(
          `Failed to create signed upload URL: ${error?.message ?? 'unknown error'}`,
        );
      }
      this.logger.log(
        `Completed signed upload URL create userId=${user_id} path=${filePath}`,
      );

      // automatic expiry of 2 hours by supabase
      await this.redisService.set(
        supabaseUploadPathKey(data.token),
        filePath,
        2 * 60 * 60,
      );
      this.logger.log(
        `Completed upload path store userId=${user_id} path=${filePath}`,
      );

      return {
        upload_token: data.token,
        signed_url: data.signedUrl,
        file_path: filePath,
      };
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Error creating signed upload URL', error);
      throw new InternalServerErrorException(
        'An error occurred while creating a signed upload URL.',
      );
    }
  }

  /**
   * Generate a signed URL for viewing/downloading a file, with expiry in seconds.
   */
  async createSignedDownloadUrl(file_path: string, bucket: string) {
    try {
      const bucketName = this.resolveBucket(bucket);
      const expiresInSeconds = 24 * 60 * 60;

      this.logger.log(
        `Starting signed download URL create path=${file_path} bucket=${bucketName}`,
      );
      const { data, error } = await this.client.storage
        .from(bucketName)
        .createSignedUrl(file_path, expiresInSeconds, {
          download: true,
        });

      if (error || !data?.signedUrl) {
        this.logger.error('Error creating signed download URL', error);
        throw new InternalServerErrorException(
          `Failed to create signed URL: ${error?.message ?? 'unknown error'}`,
        );
      }
      this.logger.log(`Completed signed download URL create path=${file_path}`);

      return data.signedUrl;
    } catch (error) {
      if (error instanceof InternalServerErrorException) throw error;
      this.logger.error('Error creating signed download URL', error);
      throw new InternalServerErrorException(
        'An error occurred while creating a signed URL.',
      );
    }
  }

  getPublicURL(file_path: string, bucket: string) {
    const bucketName = this.resolveBucket(bucket);
    return `${this.options.url}/storage/v1/object/public/${bucketName}/${file_path}`;
  }

  /**
   * Fetch storage object metadata without downloading the file body.
   */
  async getObjectInfo(
    file_path: string,
    bucket: string,
  ): Promise<StorageObjectInfo | null> {
    try {
      const bucketName = this.resolveBucket(bucket);

      this.logger.log(
        `Starting object info get path=${file_path} bucket=${bucketName}`,
      );
      const { data, error } = await this.client.storage
        .from(bucketName)
        .info(file_path);

      if (error || !data) {
        this.logger.error('Error getting object info', error);
        return null
      }
      this.logger.log(`Completed object info get path=${file_path}`);

      return {
        name: data.name,
        size: data.size ?? 0,
        contentType: data.contentType ?? '',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error getting object info', error);
      throw new InternalServerErrorException(
        'An error occurred while reading the uploaded file.',
      );
    }
  }

  /**
   * Delete one or more files from Supabase Storage.
   */
  async deleteFile(file_paths: string[], bucket: string) {
    try {
      const bucketName = this.resolveBucket(bucket);

      this.logger.log(
        `Starting storage delete paths=${file_paths.join(',')} bucket=${bucketName}`,
      );
      const { data, error } = await this.client.storage
        .from(bucketName)
        .remove(file_paths);

      if (error) {
        this.logger.error('Error deleting from Supabase Storage', error);
        throw new InternalServerErrorException(
          `Failed to delete file(s) from Supabase Storage: ${error.message}`,
        );
      }
      this.logger.log(`Completed storage delete paths=${file_paths.join(',')}`);

      return data;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Error deleting from Supabase Storage', error);
      throw new InternalServerErrorException(
        'An error occurred while deleting from Supabase Storage.',
      );
    }
  }
}

import { AppDataSource } from '@/data-source.js';
import { ActivityType, UserActivityLog } from '@/entities/user-activity-log.entity.js';
import { logger } from '@/shared/utils/logger.js';
import { Repository } from 'typeorm';

export interface LogActivityData {
  userId: string;
  activityType: ActivityType;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
}

export class UserActivityService {
  private static instance: UserActivityService;
  private repository: Repository<UserActivityLog>;
  private isInitialized: boolean = false;

  private constructor() {
    this.repository = AppDataSource.getRepository(UserActivityLog);
  }

  public static getInstance(): UserActivityService {
    if (!UserActivityService.instance) {
      UserActivityService.instance = new UserActivityService();
    }
    return UserActivityService.instance;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized && AppDataSource.isInitialized) {
      this.repository = AppDataSource.getRepository(UserActivityLog);
      this.isInitialized = true;
    }
  }

  public async logActivity(data: LogActivityData): Promise<void> {
    try {
      this.ensureInitialized();

      const activityLog = this.repository.create({
        userId: data.userId,
        activityType: data.activityType,
        timestamp: new Date(),
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        metadata: data.metadata || null,
      });

      await this.repository.save(activityLog);

      logger.debug('User activity logged', {
        userId: data.userId,
        activityType: data.activityType,
      });
    } catch (error) {
      logger.error('Failed to log user activity:', error);
    }
  }

  public async logLoginActivity(
    userId: string,
    ipAddress?: string | null,
    userAgent?: string | null
  ): Promise<void> {
    await this.logActivity({
      userId,
      activityType: 'login',
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
      metadata: { loginAt: new Date().toISOString() },
    });
  }

  public async logLogoutActivity(userId: string): Promise<void> {
    await this.logActivity({
      userId,
      activityType: 'logout',
      metadata: { logoutAt: new Date().toISOString() },
    });
  }

  public async logPasswordChangeActivity(userId: string): Promise<void> {
    await this.logActivity({
      userId,
      activityType: 'password_change',
      metadata: { changedAt: new Date().toISOString() },
    });
  }

  public async logPasswordResetActivity(userId: string): Promise<void> {
    await this.logActivity({
      userId,
      activityType: 'password_reset',
      metadata: { resetAt: new Date().toISOString() },
    });
  }
}

export const userActivityService = UserActivityService.getInstance();

import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CurrentUser,
  JwtPayload,
} from '../common/decorators/current-user.decorator';
import { FeedService } from './feed.service';

@ApiTags('Feed')
@ApiBearerAuth()
@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getUserFeed(
    @CurrentUser() user: JwtPayload,
    @Query('cursor') cursor?: string,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.feedService.getUserFeed(user.sub, cursor, limit);
  }

  @Get(':articleId')
  getArticleDetail(@Param('articleId') articleId: string) {
    return this.feedService.getArticleDetail(articleId);
  }

  @Patch(':articleId/seen')
  markSeen(
    @CurrentUser() user: JwtPayload,
    @Param('articleId') articleId: string,
  ) {
    return this.feedService.markSeen(user.sub, articleId);
  }
}

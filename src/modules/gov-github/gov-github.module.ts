import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GovGithubService } from './gov-github.service';
import { GovGithubResolver } from './gov-github.resolver';

@Module({
    imports: [HttpModule, ConfigModule],
    providers: [GovGithubService, GovGithubResolver],
})
export class GovGithubModule { }

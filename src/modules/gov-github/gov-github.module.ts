import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { GovGithubService } from './gov-github.service';
import { GovGithubResolver } from './gov-github.resolver';
import { CommonAppModule } from 'src/common.app.module';

@Module({
    imports: [HttpModule, ConfigModule, CommonAppModule],
    providers: [GovGithubService, GovGithubResolver],
})
export class GovGithubModule { }

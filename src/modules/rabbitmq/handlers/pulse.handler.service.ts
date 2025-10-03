import { Address } from "@multiversx/sdk-core/out";
import { Inject } from "@nestjs/common";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { WINSTON_MODULE_PROVIDER } from "nest-winston";
import { scAddress } from "src/config";
import { PulseSetterService } from "src/modules/governance/services/pulse.setter.service";
import { PUB_SUB } from "src/services/redis.pubSub.module";
import { Logger } from "winston";

export class PulseHandlerService {
    constructor(
        
        private readonly pulseSetterService: PulseSetterService,
        @Inject(PUB_SUB) private pubSub: RedisPubSub,
        @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    ) {}

    async handlePulseEvents(pulseEvents: any) {
        const pollVoteEvents = pulseEvents.filter(event => event.identifier === 'vote_poll');
        await this.handlePulseVotePollEvents(pollVoteEvents);

        const ideaVoteEvents = pulseEvents.filter(event => event.identifier === 'vote_up_proposal');
        await this.handlePulseVoteIdeaEvents(ideaVoteEvents);
    }

    async handlePulseVoteIdeaEvents(
        events: any,
    ): Promise<void> {
        
        const promises = []
        for(const event of events) {
            this.logger.info('Found vote idea event raw: ', event)
            const scAddress = event.address;
            const userAddress = Address.newFromHex(Buffer.from(event.topics[1], 'base64').toString('hex')).toBech32();
            const ideaId = event.topics[2] !== '' ? parseInt(Buffer.from(event.topics[2], 'base64').toString('hex'), 16) : 0;

            this.logger.info('Event vote idea decoded: ', {scAddress, userAddress, ideaId})

            promises.push(
                this.pulseSetterService.hasUserVotedIdea(scAddress, userAddress, ideaId, true),
            );
        }
        const userVoteCacheKeys = await Promise.all(promises);
        await this.deleteCacheKeys(userVoteCacheKeys);
    }

    async handlePulseVotePollEvents(
        events: any,
    ): Promise<void> {
        
        const promises = []
        for(const event of events) {
            this.logger.info('Found vote poll event raw: ', event)
            const scAddress = event.address;
            const userAddress = Address.newFromHex(Buffer.from(event.topics[1], 'base64').toString('hex')).toBech32();
            const pollId = event.topics[2] !== '' ? parseInt(Buffer.from(event.topics[2], 'base64').toString('hex'), 16) : 0;
            const optionId = event.topics[3] !== '' ? parseInt(Buffer.from(event.topics[3], 'base64').toString('hex'), 16) : 0;

            this.logger.info('Event vote poll decoded: ', {scAddress, userAddress, pollId, optionId})

            promises.push(
                this.pulseSetterService.getUserVotePulse(scAddress, userAddress, pollId, optionId),
            );
        }
        const userVoteCacheKeys = await Promise.all(promises);
        await this.deleteCacheKeys(userVoteCacheKeys);
    }

    async handleNewProposalEvent(
        _event: any,
    ): Promise<void> {
        await this.deleteCacheKeys(['getTotalIdeas']);
    }

     private async deleteCacheKeys(invalidatedKeys: string[]) {
        await this.pubSub.publish('deleteCacheKeys', invalidatedKeys);
    }
}
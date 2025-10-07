import { Args, Int, ResolveField, Resolver } from "@nestjs/graphql";
import { GovernancePulseAggregation } from "../models/pulse.aggregation.model";
import { GovernancePulseService } from "../services/governance.pulse.service";
import { governanceConfig } from "src/config";
import { PulseIdeaModel, PulsePollModel } from "../models/pulse.poll.model";
import { PaginationArgs } from "../models/pagination.model";
import { OrderType, SortArgs, SortType } from "../models/sort.model";
import BigNumber from "bignumber.js";

@Resolver(() => GovernancePulseAggregation)
export class PulseAggregationResolver {
     constructor(
            private readonly pulseService: GovernancePulseService,
        ) { }
        
    @ResolveField(() => [PulsePollModel])
    async polls(
        @Args('pollId', {type: () => Int, nullable: true}) pollId?: number,
        @Args('contractAddress', { type: () => String, nullable: true }) contractAddress?: string,
    ) {
        const scAddresses: string[] = governanceConfig.pulse.linear;
        const promises = [];
        for(const scAddress of scAddresses) {
            promises.push(this.pulseService.getPolls(scAddress))
        }

        const allPolls = (await Promise.all(promises)).flat();

        if(pollId !== undefined && pollId !== null && contractAddress !== null && contractAddress !== undefined) {
            return allPolls.filter(idea => idea.pollId === pollId && idea.contractAddress === contractAddress);
        }

        return allPolls;
    }

    @ResolveField(() => [PulseIdeaModel])
    async ideas(
        @Args('ideaId', {type: () => Int, nullable: true}) ideaId?: number,
        @Args('contractAddress', { type: () => String, nullable: true }) contractAddress?: string,
        @Args() pagination?: PaginationArgs,
        @Args() sortArgs?: SortArgs,
    ) {
        const scAddresses: string[] = governanceConfig.pulse.linear;
        const promises = [];
        for(const scAddress of scAddresses) {
            promises.push(this.pulseService.getIdeas(scAddress))
        }

        const allIdeas = (await Promise.all(promises)).flat();

        if(ideaId !== undefined && ideaId !== null && contractAddress !== undefined && contractAddress !== null) {
            return allIdeas.filter(idea => idea.ideaId === ideaId && idea.contractAddress === contractAddress);
        }
  
        const sortedIdeas = this.applySortForIdeas(allIdeas, sortArgs);
        const paginatedIdeas = this.getPaginated(sortedIdeas, pagination);

        return paginatedIdeas;
    }

    @ResolveField()
    async totalPolls() {
        const scAddresses: string[] = governanceConfig.pulse.linear;
        const promises = [];
        for(const scAddress of scAddresses) {
            promises.push(this.pulseService.getTotalPolls(scAddress))
        }

        const totalPolls = (await Promise.all(promises)).reduce((acc, curr) => acc += curr, 0);
        return totalPolls;
    }

    @ResolveField()
    async totalIdeas() {
        const scAddresses: string[] = governanceConfig.pulse.linear;
        const promises = [];
        for(const scAddress of scAddresses) {
            promises.push(this.pulseService.getTotalIdeas(scAddress))
        }

        const totalIdeas = (await Promise.all(promises)).reduce((acc, curr) => acc += curr, 0);
        return totalIdeas;
    }

    @ResolveField()
    async latestContract() {
        const scAddresses: string[] = governanceConfig.pulse.linear;
        if(scAddresses.length > 0) {
            return scAddresses[scAddresses.length - 1];
        }

        return 'NO CONTRACTS AVAILABLE';
    }

    private applySortForIdeas(ideas: any[], sortArgs?: SortArgs) {
        if (sortArgs) {
            const sortedIdeas = [...ideas];
            const { sortBy: field, order } = sortArgs;

            sortedIdeas.sort((a, b) => {
            let compareValue = new BigNumber(0);
            switch (field) {
                case SortType.VOTING_POWER: {
                    const aPower = new BigNumber(a.totalVotingPower ?? '0');
                    const bPower = new BigNumber(b.totalVotingPower ?? '0');
                    compareValue = aPower.minus(bPower);
                    break;
                }

                case SortType.VOTES_NUMBER: {
                    const aVotes = new BigNumber(a.totalVotesCount ?? 0);
                    const bVotes = new BigNumber(b.totalVotesCount ?? 0);
                    compareValue = aVotes.minus(bVotes);
                    break;
                }

                case SortType.START_TIME: {
                    const aTime = new BigNumber(a.ideaStartTime ?? 0);
                    const bTime = new BigNumber(b.ideaStartTime ?? 0);
                    compareValue = aTime.minus(bTime);
                    break;
                }

                default:
                    compareValue = new BigNumber(0);
                }

            const sign = compareValue.isZero() ? 0 : compareValue.isNegative() ? -1 : 1;

            return order === OrderType.DESCENDING ? -sign : sign;
            });

            return sortedIdeas;
        }

        return ideas;
    }

    private getPaginated(array: any[], pagination?: PaginationArgs) {
        if(pagination) {
            const start = Math.max(array.length - pagination.offset - pagination.limit, 0);
            const end = array.length - pagination.offset;

            if(start < 0 || end < 0) {
                return [];
            }

            return array.slice(start, end);
        }
        return array;
    }
}
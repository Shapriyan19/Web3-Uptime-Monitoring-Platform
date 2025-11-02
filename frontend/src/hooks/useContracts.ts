import { useMemo } from 'react';
import { Contract, BrowserProvider } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DOMAIN_REGISTRY_ABI, RESULT_AGGREGATOR_ABI, MONITORING_SCHEDULER_ABI } from '../config/abis';

export function useContracts(provider: BrowserProvider | null) {
  const contracts = useMemo(() => {
    if (!provider) return null;

    return {
      domainRegistry: new Contract(
        CONTRACT_ADDRESSES.domainRegistry,
        DOMAIN_REGISTRY_ABI,
        provider
      ),
      resultAggregator: new Contract(
        CONTRACT_ADDRESSES.resultAggregator,
        RESULT_AGGREGATOR_ABI,
        provider
      ),
      monitoringScheduler: new Contract(
        CONTRACT_ADDRESSES.monitoringScheduler,
        MONITORING_SCHEDULER_ABI,
        provider
      ),
    };
  }, [provider]);

  return contracts;
}


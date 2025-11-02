import { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DOMAIN_REGISTRY_ABI } from '../config/abis';
import { formatEther } from 'ethers';

interface DomainListProps {
  provider: any;
  address: string | null;
}

interface DomainInfo {
  owner: string;
  stakingBalance: bigint;
  interval: bigint;
}

export function DomainList({ provider, address }: DomainListProps) {
  const [domains, setDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [domainDetails, setDomainDetails] = useState<Record<string, DomainInfo>>({});

  useEffect(() => {
    if (provider && address) {
      loadDomains();
    }
  }, [provider, address]);

  const loadDomains = async () => {
    if (!provider || !address) return;

    setLoading(true);
    try {
      const contract = new Contract(
        CONTRACT_ADDRESSES.domainRegistry,
        DOMAIN_REGISTRY_ABI,
        provider
      );
      const signer = await provider.getSigner();
      const contractWithSigner = contract.connect(signer);
      const userDomains = await (contractWithSigner as any).getOwnerDomains();

      setDomains(userDomains);

      // Load details for each domain
      const details: Record<string, DomainInfo> = {};
      for (const domain of userDomains) {
        const info = await contract.getDomainInfo(domain);
        details[domain] = {
          owner: info[0],
          stakingBalance: info[1],
          interval: info[2],
        };
      }
      setDomainDetails(details);
    } catch (err) {
      console.error('Failed to load domains:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return <p>Please connect your wallet to view your domains.</p>;
  }

  if (loading) {
    return <p>Loading domains...</p>;
  }

  if (domains.length === 0) {
    return <p>No domains registered yet. Register a domain to get started!</p>;
  }

  return (
    <div className="domain-list">
      <h2>Your Domains</h2>
      <button onClick={loadDomains} className="btn-refresh">
        Refresh
      </button>
      <div className="domains-grid">
        {domains.map((domain) => {
          const details = domainDetails[domain];
          return (
            <div key={domain} className="domain-card">
              <h3>{domain}</h3>
              {details && (
                <div className="domain-details">
                  <p>
                    <strong>Stake:</strong> {formatEther(details.stakingBalance)} ETH
                  </p>
                  <p>
                    <strong>Interval:</strong> {Number(details.interval)} seconds
                  </p>
                  <p>
                    <strong>Owner:</strong> {details.owner.slice(0, 10)}...
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


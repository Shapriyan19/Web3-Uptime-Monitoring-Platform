import { useState } from 'react';
import { Contract } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { RESULT_AGGREGATOR_ABI } from '../config/abis';

interface DomainStatsProps {
  provider: any;
}

interface DomainStats {
  domainURL: string;
  totalChecks: bigint;
  successfulChecks: bigint;
  failedChecks: bigint;
  uptimePercentage: bigint;
  totalDownTime: bigint;
  currentStatus: boolean;
}

export function DomainStats({ provider }: DomainStatsProps) {
  const [domainURL, setDomainURL] = useState('');
  const [stats, setStats] = useState<DomainStats | null>(null);
  const [status, setStatus] = useState<{ isUp: boolean; status: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadStats = async () => {
    if (!provider || !domainURL) {
      setError('Please provide a domain URL');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const contract = new Contract(
        CONTRACT_ADDRESSES.resultAggregator,
        RESULT_AGGREGATOR_ABI,
        provider
      );

      const [domainStats, domainStatus] = await Promise.all([
        contract.fetchDomainStats(domainURL),
        contract.getDomainStatus(domainURL),
      ]);

      setStats({
        domainURL: domainStats[0],
        totalChecks: domainStats[1],
        successfulChecks: domainStats[2],
        failedChecks: domainStats[3],
        uptimePercentage: domainStats[4],
        totalDownTime: domainStats[5],
        currentStatus: domainStats[6],
      });

      setStatus({
        isUp: domainStatus[0],
        status: domainStatus[1],
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load domain stats');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="domain-stats">
      <h2>Domain Statistics</h2>
      <div className="form-group">
        <input
          type="text"
          value={domainURL}
          onChange={(e) => setDomainURL(e.target.value)}
          placeholder="Enter domain URL"
          className="domain-input"
        />
        <button onClick={loadStats} disabled={loading} className="btn-primary">
          {loading ? 'Loading...' : 'Load Stats'}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {status && (
        <div className="status-badge">
          <span className={`status ${status.isUp ? 'up' : 'down'}`}>
            {status.status}
          </span>
        </div>
      )}

      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Checks</h3>
            <p className="stat-value">{Number(stats.totalChecks)}</p>
          </div>
          <div className="stat-card">
            <h3>Successful</h3>
            <p className="stat-value success">{Number(stats.successfulChecks)}</p>
          </div>
          <div className="stat-card">
            <h3>Failed</h3>
            <p className="stat-value error">{Number(stats.failedChecks)}</p>
          </div>
          <div className="stat-card">
            <h3>Uptime</h3>
            <p className="stat-value">{Number(stats.uptimePercentage)}%</p>
          </div>
        </div>
      )}
    </div>
  );
}


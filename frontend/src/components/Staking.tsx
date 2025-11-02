import React, { useState } from 'react';
import { Contract, parseEther } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { DOMAIN_REGISTRY_ABI } from '../config/abis';

interface StakingProps {
  provider: any;
}

export function Staking({ provider }: StakingProps) {
  const [domainURL, setDomainURL] = useState('');
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'stake' | 'withdraw'>('stake');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const signer = await provider.getSigner();
      const contract = new Contract(
        CONTRACT_ADDRESSES.domainRegistry,
        DOMAIN_REGISTRY_ABI,
        signer
      );

      if (action === 'stake') {
        const stakeAmount = parseEther(amount);
        const tx = await contract.stakeTokens(domainURL, { value: stakeAmount });
        setSuccess(`Staking transaction sent! Hash: ${tx.hash}`);
        await tx.wait();
        setSuccess(`Successfully staked ${amount} ETH! Transaction: ${tx.hash}`);
      } else {
        const withdrawAmount = parseEther(amount);
        const tx = await contract.withdrawStake(domainURL, { value: withdrawAmount });
        setSuccess(`Withdrawal transaction sent! Hash: ${tx.hash}`);
        await tx.wait();
        setSuccess(`Successfully withdrew ${amount} ETH! Transaction: ${tx.hash}`);
      }

      setDomainURL('');
      setAmount('');
    } catch (err: any) {
      setError(err.message || `Failed to ${action}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staking">
      <h2>Stake Management</h2>
      <div className="action-selector">
        <button
          className={action === 'stake' ? 'active' : ''}
          onClick={() => setAction('stake')}
        >
          Stake
        </button>
        <button
          className={action === 'withdraw' ? 'active' : ''}
          onClick={() => setAction('withdraw')}
        >
          Withdraw
        </button>
      </div>
      <form onSubmit={handleStake}>
        <div className="form-group">
          <label htmlFor="domainStake">Domain URL</label>
          <input
            id="domainStake"
            type="text"
            value={domainURL}
            onChange={(e) => setDomainURL(e.target.value)}
            placeholder="e.g., example.com"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="amount">Amount (ETH)</label>
          <input
            id="amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.1"
            step="0.001"
            min="0"
            required
          />
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Processing...' : action === 'stake' ? 'Stake Tokens' : 'Withdraw Stake'}
        </button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </div>
  );
}


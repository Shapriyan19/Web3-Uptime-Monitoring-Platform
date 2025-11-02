import React, { useState } from 'react';
import { Contract, parseEther } from 'ethers';
import { CONTRACT_ADDRESSES, MIN_REGISTRATION_STAKE } from '../config/contracts';
import { DOMAIN_REGISTRY_ABI } from '../config/abis';

interface DomainRegistrationProps {
  provider: any;
}

export function DomainRegistration({ provider }: DomainRegistrationProps) {
  const [domainURL, setDomainURL] = useState('');
  const [interval, setInterval] = useState('3600'); // Default 1 hour in seconds
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
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
      
      // Check balance first
      const balance = await provider.getBalance(await signer.getAddress());
      const stakeAmount = parseEther(MIN_REGISTRATION_STAKE);
      const minRequired = stakeAmount + parseEther('0.01'); // Add buffer for gas
      
      if (balance < minRequired) {
        setError(`Insufficient balance. Need at least ${MIN_REGISTRATION_STAKE} ETH + gas fees.`);
        setLoading(false);
        return;
      }

      const contract = new Contract(
        CONTRACT_ADDRESSES.domainRegistry,
        DOMAIN_REGISTRY_ABI,
        signer
      );

      const intervalSeconds = BigInt(interval);

      // Estimate gas first to catch errors early
      try {
        await contract.registerDomain.estimateGas(domainURL, intervalSeconds, {
          value: stakeAmount,
        });
      } catch (estimateErr: any) {
        const errorMsg = estimateErr.reason || estimateErr.data?.message || estimateErr.message || 'Transaction would fail';
        setError(`Registration failed: ${errorMsg}`);
        setLoading(false);
        return;
      }

      const tx = await contract.registerDomain(domainURL, intervalSeconds, {
        value: stakeAmount,
      });

      setSuccess(`Transaction sent! Hash: ${tx.hash}`);
      await tx.wait();
      setSuccess(`Domain registered successfully! Transaction: ${tx.hash}`);
      setDomainURL('');
      setInterval('3600');
    } catch (err: any) {
      const errorMsg = err.reason || err.data?.message || err.message || 'Failed to register domain';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="domain-registration">
      <h2>Register Domain</h2>
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label htmlFor="domainURL">Domain URL</label>
          <input
            id="domainURL"
            type="text"
            value={domainURL}
            onChange={(e) => setDomainURL(e.target.value)}
            placeholder="e.g., example.com"
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="interval">Check Interval (seconds)</label>
          <input
            id="interval"
            type="number"
            value={interval}
            onChange={(e) => setInterval(e.target.value)}
            placeholder="3600"
            min="60"
            required
          />
        </div>
        <div className="info">
          <p>Minimum stake required: {MIN_REGISTRATION_STAKE} ETH</p>
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Registering...' : 'Register Domain'}
        </button>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </div>
  );
}


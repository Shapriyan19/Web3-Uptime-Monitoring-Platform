import { useState, useEffect } from 'react';
import { Contract } from 'ethers';
import { CONTRACT_ADDRESSES } from '../config/contracts';
import { MONITORING_SCHEDULER_ABI, RESULT_AGGREGATOR_ABI, RESULT_AGGREGATOR_SUBMIT_ABI } from '../config/abis';

interface ValidatorProps {
  provider: any;
  address: string | null;
}

interface PendingJob {
  domainURL: string;
  cycleId?: bigint;
  submissionDeadline?: bigint;
}

export function Validator({ provider, address }: ValidatorProps) {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedJob, setSelectedJob] = useState<PendingJob | null>(null);
  const [isUp, setIsUp] = useState(true);
  const [httpStatusCode, setHttpStatusCode] = useState('200');
  const [cycleId, setCycleId] = useState('');

  useEffect(() => {
    if (provider && address) {
      checkRegistration();
    }
  }, [provider, address]);

  // Load pending jobs after registration status is confirmed
  useEffect(() => {
    if (provider && address && isRegistered) {
      loadPendingJobs();
    } else {
      // Clear jobs if not registered
      setPendingJobs([]);
    }
  }, [provider, address, isRegistered]);

  const checkRegistration = async () => {
    if (!provider || !address) return;

    const contract = new Contract(
      CONTRACT_ADDRESSES.monitoringScheduler,
      MONITORING_SCHEDULER_ABI,
      provider
    );

    try {
      // Check the validator's isActive status directly from the mapping
      const validatorInfo = await (contract as any).validators(address);
      // validatorInfo is a tuple: [validatorAddress, isActive, totalJobsAssigned, lastAssignedTime]
      const registered = validatorInfo && validatorInfo[1] === true; // isActive is at index 1
      setIsRegistered(registered);
      console.log('Registration status checked:', registered);
      
      // If registered, try to get pending jobs count for debugging
      if (registered) {
        try {
          const jobs = await (contract as any).getPendingJobs(address);
          console.log('Pending jobs count:', jobs ? jobs.length : 0);
        } catch (jobErr) {
          console.warn('Could not check pending jobs during registration check:', jobErr);
        }
      }
    } catch (err) {
      console.error('Failed to check registration:', err);
      // If there's an error, try checking active validators list as fallback
      try {
        const validators = await contract.getActiveValidators();
        const registered = validators.includes(address);
        setIsRegistered(registered);
        console.log('Registration status (fallback):', registered);
      } catch (fallbackErr) {
        console.error('Fallback check also failed:', fallbackErr);
        setIsRegistered(false);
      }
    }
  };

  const registerValidator = async () => {
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
        CONTRACT_ADDRESSES.monitoringScheduler,
        MONITORING_SCHEDULER_ABI,
        signer
      );

      // Check if already registered before attempting registration
      const validatorInfo = await (contract as any).validators(await signer.getAddress());
      if (validatorInfo && validatorInfo[1] === true) {
        setError('You are already registered as a validator');
        setIsRegistered(true);
        setLoading(false);
        await loadPendingJobs();
        return;
      }

      const tx = await contract.registerValidator();
      setSuccess(`Registration transaction sent! Hash: ${tx.hash}`);
      await tx.wait();
      setSuccess(`Successfully registered as validator! Transaction: ${tx.hash}`);
      setIsRegistered(true);
      await loadPendingJobs();
    } catch (err: any) {
      let errorMsg = err.reason || err.message || 'Failed to register validator';
      
      // Handle "Already registered" error more gracefully
      if (errorMsg.includes('Already registered') || errorMsg.includes('already registered')) {
        errorMsg = 'You are already registered as a validator. Refreshing status...';
        setIsRegistered(true);
        await checkRegistration();
        await loadPendingJobs();
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const deactivateValidator = async () => {
    if (!provider) {
      setError('Please connect your wallet first');
      return;
    }

    if (!confirm('Are you sure you want to deactivate as a validator?')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const signer = await provider.getSigner();
      const contract = new Contract(
        CONTRACT_ADDRESSES.monitoringScheduler,
        MONITORING_SCHEDULER_ABI,
        signer
      );

      const tx = await contract.deactivateValidator();
      setSuccess(`Deactivation transaction sent! Hash: ${tx.hash}`);
      await tx.wait();
      setSuccess(`Successfully deactivated as validator! Transaction: ${tx.hash}`);
      setIsRegistered(false);
    } catch (err: any) {
      const errorMsg = err.reason || err.message || 'Failed to deactivate validator';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingJobs = async () => {
    if (!provider || !address || !isRegistered) {
      setPendingJobs([]);
      return;
    }

    setIsChecking(true);
    setError('');
    try {
      const contract = new Contract(
        CONTRACT_ADDRESSES.monitoringScheduler,
        MONITORING_SCHEDULER_ABI,
        provider
      );
      
      const jobs = await (contract as any).getPendingJobs(address);
      console.log('Pending jobs retrieved:', jobs);
      
      if (!jobs || jobs.length === 0) {
        setPendingJobs([]);
        setIsChecking(false);
        return;
      }

      // Load cycle information for each job
      const jobsWithCycle = await Promise.all(
        jobs.map(async (domainURL: string) => {
          try {
            const resultContract = new Contract(
              CONTRACT_ADDRESSES.resultAggregator,
              RESULT_AGGREGATOR_ABI,
              provider
            );
            const latestCycle = await (resultContract as any).getLatestCycle(domainURL);
            // Check if cycle exists (cycleId > 0)
            if (latestCycle && latestCycle[1] && latestCycle[1] > 0) {
              return {
                domainURL,
                cycleId: latestCycle[1], // cycleId is second element
                submissionDeadline: latestCycle[4], // submissionDeadline is 5th element
              };
            } else {
              return { domainURL };
            }
          } catch (cycleErr) {
            console.warn(`Could not load cycle info for ${domainURL}:`, cycleErr);
            return { domainURL };
          }
        })
      );
      
      setPendingJobs(jobsWithCycle);
      console.log('Pending jobs with cycle info:', jobsWithCycle);
    } catch (err: any) {
      console.error('Failed to load pending jobs:', err);
      const errorMsg = err.reason || err.message || 'Failed to load pending jobs';
      setError(`Error loading jobs: ${errorMsg}`);
      setPendingJobs([]);
    } finally {
      setIsChecking(false);
    }
  };

  const completeJob = async (domainURL: string) => {
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
        CONTRACT_ADDRESSES.monitoringScheduler,
        MONITORING_SCHEDULER_ABI,
        signer
      );

      const tx = await contract.completeJob(domainURL);
      setSuccess(`Job completion transaction sent! Hash: ${tx.hash}`);
      await tx.wait();
      setSuccess(`Successfully completed job for ${domainURL}! Transaction: ${tx.hash}`);
      await loadPendingJobs();
    } catch (err: any) {
      const errorMsg = err.reason || err.message || 'Failed to complete job';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const submitResult = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !selectedJob) {
      setError('Please select a job and connect your wallet');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const signer = await provider.getSigner();
      const contract = new Contract(
        CONTRACT_ADDRESSES.resultAggregator,
        [...RESULT_AGGREGATOR_ABI, ...RESULT_AGGREGATOR_SUBMIT_ABI],
        signer
      );

      const domainURL = selectedJob.domainURL;
      const cycleIdValue = cycleId || (selectedJob.cycleId?.toString() || '1');
      const statusCode = parseInt(httpStatusCode);
      const emptySignature = '0x'; // Empty signature for now

      const tx = await (contract as any).submitResult(
        domainURL,
        cycleIdValue,
        isUp,
        statusCode,
        emptySignature
      );

      setSuccess(`Result submission transaction sent! Hash: ${tx.hash}`);
      await tx.wait();
      setSuccess(`Successfully submitted result for ${domainURL}! Transaction: ${tx.hash}`);
      setSelectedJob(null);
      setCycleId('');
      setIsUp(true);
      setHttpStatusCode('200');
      await loadPendingJobs();
    } catch (err: any) {
      const errorMsg = err.reason || err.message || 'Failed to submit result';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!address) {
    return <p>Please connect your wallet to use validator features.</p>;
  }

  return (
    <div className="validator">
      <h2>Validator Dashboard</h2>

      <div className="validator-status">
        {isRegistered ? (
          <div className="status-registered">
            <p className="success">✓ You are registered as a validator</p>
            <button onClick={deactivateValidator} disabled={loading} className="btn-danger">
              {loading ? 'Deactivating...' : 'Deactivate Validator'}
            </button>
          </div>
        ) : (
          <div className="status-not-registered">
            <p>You are not registered as a validator</p>
            <button onClick={registerValidator} disabled={loading} className="btn-primary">
              {loading ? 'Registering...' : 'Register as Validator'}
            </button>
          </div>
        )}
      </div>

      {isRegistered && (
        <>
          <div className="pending-jobs-section">
            <div className="section-header">
              <h3>Pending Jobs</h3>
              <button onClick={loadPendingJobs} disabled={isChecking} className="btn-refresh">
                {isChecking ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {isChecking ? (
              <p>Loading pending jobs...</p>
            ) : pendingJobs.length === 0 ? (
              <div className="no-jobs-message">
                <p>No pending jobs available.</p>
                <p className="info-text">Jobs will appear here when domains are assigned to you for monitoring.</p>
                <p className="info-text">Make sure there are registered domains and monitoring cycles are active.</p>
              </div>
            ) : (
              <div className="jobs-list">
                {pendingJobs.map((job, index) => (
                  <div key={index} className="job-card">
                    <h4>{job.domainURL}</h4>
                    {job.cycleId && (
                      <p>
                        <strong>Cycle ID:</strong> {job.cycleId.toString()}
                      </p>
                    )}
                    {job.submissionDeadline && (
                      <p>
                        <strong>Deadline:</strong>{' '}
                        {new Date(Number(job.submissionDeadline) * 1000).toLocaleString()}
                      </p>
                    )}
                    <div className="job-actions">
                      <button
                        onClick={() => {
                          setSelectedJob(job);
                          setCycleId(job.cycleId?.toString() || '');
                        }}
                        className="btn-secondary"
                      >
                        Submit Result
                      </button>
                      <button
                        onClick={() => completeJob(job.domainURL)}
                        disabled={loading}
                        className="btn-primary"
                      >
                        Complete Job
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedJob && (
            <div className="submit-result-form">
              <h3>Submit Result for {selectedJob.domainURL}</h3>
              <form onSubmit={submitResult}>
                <div className="form-group">
                  <label htmlFor="cycleId">Cycle ID</label>
                  <input
                    id="cycleId"
                    type="number"
                    value={cycleId}
                    onChange={(e) => setCycleId(e.target.value)}
                    placeholder={selectedJob.cycleId?.toString() || '1'}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="isUp">Status</label>
                  <select
                    id="isUp"
                    value={isUp ? 'true' : 'false'}
                    onChange={(e) => setIsUp(e.target.value === 'true')}
                    required
                  >
                    <option value="true">UP</option>
                    <option value="false">DOWN</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="httpStatusCode">HTTP Status Code</label>
                  <input
                    id="httpStatusCode"
                    type="number"
                    value={httpStatusCode}
                    onChange={(e) => setHttpStatusCode(e.target.value)}
                    placeholder="200"
                    min="100"
                    max="599"
                    required
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" disabled={loading} className="btn-primary">
                    {loading ? 'Submitting...' : 'Submit Result'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedJob(null);
                      setCycleId('');
                      setIsUp(true);
                      setHttpStatusCode('200');
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
    </div>
  );
}


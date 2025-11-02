import { useState } from 'react';
import './App.css';
import { WalletConnection } from './components/WalletConnection';
import { DomainRegistration } from './components/DomainRegistration';
import { DomainList } from './components/DomainList';
import { DomainStats } from './components/DomainStats';
import { Staking } from './components/Staking';
import { Validator } from './components/Validator';
import { useWallet } from './hooks/useWallet';

function App() {
  const { address, provider, isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'register' | 'domains' | 'stats' | 'stake' | 'validator'>('register');

  return (
    <div className="app">
      <header className="app-header">
        <h1>Web3 Uptime Monitoring Platform</h1>
        <WalletConnection />
      </header>

      <nav className="tabs">
        <button
          className={activeTab === 'register' ? 'active' : ''}
          onClick={() => setActiveTab('register')}
        >
          Register Domain
        </button>
        <button
          className={activeTab === 'domains' ? 'active' : ''}
          onClick={() => setActiveTab('domains')}
        >
          My Domains
        </button>
        <button
          className={activeTab === 'stats' ? 'active' : ''}
          onClick={() => setActiveTab('stats')}
        >
          Domain Stats
        </button>
        <button
          className={activeTab === 'stake' ? 'active' : ''}
          onClick={() => setActiveTab('stake')}
        >
          Stake Management
        </button>
        <button
          className={activeTab === 'validator' ? 'active' : ''}
          onClick={() => setActiveTab('validator')}
        >
          Validator
        </button>
      </nav>

      <main className="app-content">
        {!isConnected && (
          <div className="warning">
            <p>Please connect your wallet to interact with the platform.</p>
          </div>
        )}

        {activeTab === 'register' && (
          <DomainRegistration provider={provider} />
        )}
        
        {activeTab === 'domains' && (
          <DomainList provider={provider} address={address} />
        )}
        
        {activeTab === 'stats' && (
          <DomainStats provider={provider} />
        )}
        
        {activeTab === 'stake' && (
          <Staking provider={provider} />
        )}
        
        {activeTab === 'validator' && (
          <Validator provider={provider} address={address} />
        )}
      </main>

      <footer className="app-footer">
        <p>Deployed on Sepolia Testnet</p>
      </footer>
    </div>
  );
}

export default App;

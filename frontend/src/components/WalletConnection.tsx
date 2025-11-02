import { useWallet } from '../hooks/useWallet';

export function WalletConnection() {
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  const formatAddress = (addr: string | null) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (isConnected && address) {
    return (
      <div className="wallet-connection">
        <div className="wallet-info">
          <span className="wallet-address">{formatAddress(address)}</span>
          <button onClick={disconnect} className="btn-disconnect">
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wallet-connection">
      <button
        onClick={connect}
        disabled={isConnecting}
        className="btn-connect"
      >
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <p className="error">{error}</p>}
    </div>
  );
}


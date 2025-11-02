import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

export interface WalletState {
  address: string | null;
  provider: BrowserProvider | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

export function useWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    provider: null,
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  useEffect(() => {
    // Check if wallet is already connected
    if (window.ethereum) {
      window.ethereum
        .request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            const provider = new BrowserProvider(window.ethereum);
            setWallet({
              address: accounts[0],
              provider,
              isConnected: true,
              isConnecting: false,
              error: null,
            });
          }
        })
        .catch(console.error);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          const provider = new BrowserProvider(window.ethereum);
          setWallet({
            address: accounts[0],
            provider,
            isConnected: true,
            isConnecting: false,
            error: null,
          });
        } else {
          setWallet({
            address: null,
            provider: null,
            isConnected: false,
            isConnecting: false,
            error: null,
          });
        }
      });
    }
  }, []);

  const connect = async () => {
    if (!window.ethereum) {
      setWallet((prev) => ({
        ...prev,
        error: 'Please install MetaMask!',
      }));
      return;
    }

    setWallet((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setWallet({
        address,
        provider,
        isConnected: true,
        isConnecting: false,
        error: null,
      });
    } catch (error: any) {
      setWallet((prev) => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  };

  const disconnect = () => {
    setWallet({
      address: null,
      provider: null,
      isConnected: false,
      isConnecting: false,
      error: null,
    });
  };

  return {
    ...wallet,
    connect,
    disconnect,
  };
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    ethereum?: any;
  }
}


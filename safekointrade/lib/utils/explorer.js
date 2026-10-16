/**
 * Block explorer links for deposit review. Picks the chain from the network
 * name first (e.g. "Tron (TRC-20)"), then from the coin symbol.
 */
const EXPLORERS = {
  bitcoin: { tx: "https://mempool.space/tx/", address: "https://mempool.space/address/", txPattern: /^[A-Fa-f0-9]{64}$/ },
  ethereum: { tx: "https://etherscan.io/tx/", address: "https://etherscan.io/address/", txPattern: /^0x[A-Fa-f0-9]{64}$/ },
  bsc: { tx: "https://bscscan.com/tx/", address: "https://bscscan.com/address/", txPattern: /^0x[A-Fa-f0-9]{64}$/ },
  polygon: { tx: "https://polygonscan.com/tx/", address: "https://polygonscan.com/address/", txPattern: /^0x[A-Fa-f0-9]{64}$/ },
  tron: { tx: "https://tronscan.org/#/transaction/", address: "https://tronscan.org/#/address/", txPattern: /^[A-Fa-f0-9]{64}$/ },
  solana: { tx: "https://solscan.io/tx/", address: "https://solscan.io/account/", txPattern: /^[1-9A-HJ-NP-Za-km-z]{64,90}$/ },
};

function chainFrom(text) {
  const s = String(text || "").toLowerCase();
  if (!s) return null;
  if (/tron|trc/.test(s)) return "tron";
  if (/bep|bsc|bnb/.test(s)) return "bsc";
  if (/polygon|matic/.test(s)) return "polygon";
  if (/\bsol\b|solana/.test(s)) return "solana";
  if (/erc|ethereum|\beth\b/.test(s)) return "ethereum";
  if (/bitcoin|\bbtc\b/.test(s)) return "bitcoin";
  return null;
}

export function detectChain(asset, network) {
  return chainFrom(network) || chainFrom(asset);
}

export function explorerTxUrl(asset, network, hash) {
  const chain = EXPLORERS[detectChain(asset, network)];
  const h = String(hash || "").trim();
  if (!chain || !chain.txPattern.test(h)) return null;
  return chain.tx + encodeURIComponent(h);
}

export function explorerAddressUrl(asset, network, address) {
  const chain = EXPLORERS[detectChain(asset, network)];
  const a = String(address || "").trim();
  if (!chain || !/^[A-Za-z0-9]{10,128}$/.test(a)) return null;
  return chain.address + encodeURIComponent(a);
}
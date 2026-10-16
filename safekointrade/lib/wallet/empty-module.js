// Stand-in for optional x402 payment packages that a WalletConnect dependency
// imports but this app never uses (we only read wallet addresses). Anything
// that somehow calls into it fails loudly instead of silently doing nothing.
const unused = () => {
  throw new Error("x402 payments are not available in this app");
};
export const toClientEvmSigner = unused;
export const registerExactEvmScheme = unused;
export const x402Client = unused;
export const ExactEvmScheme = unused;
export const UptoEvmScheme = unused;
export const ExactSvmScheme = unused;
export const registerExactSvmScheme = unused;
const empty = {};
export default empty;

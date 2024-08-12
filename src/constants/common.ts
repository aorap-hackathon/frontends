import { requireEnv } from "@/utils"

export const ETH_SYMBOL = requireEnv("REACT_APP_ETH_SYMBOL")
export const WETH_SYMBOL = "WETH"
export const USDC_SYMBOL = "USDC"

export const L1_NAME = requireEnv("REACT_APP_BASE_CHAIN")
export const L2_NAME = requireEnv("REACT_APP_ROLLUP") || "ScrollStack"

export const CHAIN_ID = {
  L1: parseInt(requireEnv("REACT_APP_CHAIN_ID_L1") as string),
  L2: parseInt(requireEnv("REACT_APP_CHAIN_ID_L2") as string),
}

export const RPC_URL = {
  L1: requireEnv("REACT_APP_EXTERNAL_RPC_URI_L1"),
  L2: requireEnv("REACT_APP_EXTERNAL_RPC_URI_L2"),
}

export const EXPLORER_URL = {
  L1: requireEnv("REACT_APP_EXTERNAL_EXPLORER_URI_L1"),
  L2: requireEnv("REACT_APP_EXTERNAL_EXPLORER_URI_L2"),
}

export const STANDARD_ERC20_GATEWAY_PROXY_ADDR = {
  [CHAIN_ID.L1]: requireEnv("REACT_APP_L1_STANDARD_ERC20_GATEWAY_PROXY_ADDR"),
  [CHAIN_ID.L2]: requireEnv("REACT_APP_L2_STANDARD_ERC20_GATEWAY_PROXY_ADDR"),
}

export const GATEWAY_ROUTE_PROXY_ADDR = {
  [CHAIN_ID.L1]: requireEnv("REACT_APP_L1_GATEWAY_ROUTER_PROXY_ADDR"),
  [CHAIN_ID.L2]: requireEnv("REACT_APP_L2_GATEWAY_ROUTER_PROXY_ADDR"),
}

export const WETH_GATEWAY_PROXY_ADDR = {
  [CHAIN_ID.L1]: requireEnv("REACT_APP_L1_WETH_GATEWAY_PROXY_ADDR"),
  [CHAIN_ID.L2]: requireEnv("REACT_APP_L2_WETH_GATEWAY_PROXY_ADDR"),
}

export const SCROLL_MESSENGER_ADDR = {
  [CHAIN_ID.L1]: requireEnv("REACT_APP_L1_SCROLL_MESSENGER"),
  [CHAIN_ID.L2]: requireEnv("REACT_APP_L2_SCROLL_MESSENGER"),
}

export const USDC_GATEWAY_PROXY_ADDR = {
  [CHAIN_ID.L2]: requireEnv("REACT_APP_L2_USDC_GATEWAY_PROXY_ADDR"),
}

export const GAS_TOKEN_ADDR = {
  [CHAIN_ID.L1]: requireEnv("REACT_APP_L1_GAS_TOKEN_ADDR"),
}

export const WETH_ADDR = {
  [CHAIN_ID.L1]: requireEnv("REACT_APP_L1_WETH_ADDR"),
}

export const WRAPPED_TOKEN_GATEWAY_ADDR = {
  [CHAIN_ID.L1]: requireEnv("REACT_APP_L1_WRAPPED_TOKEN_GATEWAY"),
}

export const GAS_TOKEN_GATEWAY = {
  [CHAIN_ID.L1]: requireEnv("REACT_APP_L1_GAS_TOKEN_GATEWAY"),
}

export const DOCUMENTATION_URL = {
  Mainnet: "https://docs.scroll.io/en/developers/developer-quickstart/",
  Sepolia: "https://docs.scroll.io/en/user-guide/",
}

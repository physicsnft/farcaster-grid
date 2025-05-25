//import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { http, createConfig } from "wagmi";
//import { base, mainnet } from "wagmi/chains";
import { baseSepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

export const config = createConfig({
  //chains: [base, mainnet],
  chains: [baseSepolia],
  //connectors: [farcasterFrame()],
  connectors: [injected()],
  transports: {
    [baseSepolia.id]: http(),
    //[base.id]: http(),
    //[mainnet.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

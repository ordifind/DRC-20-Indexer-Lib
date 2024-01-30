import { Protocol_Symbol } from "./config";

export enum ValidMethods {
  deploy = "deploy",
  mint = "mint",
  transfer = "transfer",
  inscribe_transfer = "inscribe-transfer",
}

export enum BalanceUpdateTypes {
  PUSH_NEW_TOKEN = "PUSH_NEW_TOKEN",
  UPDATE_TOKEN_VALUE = "UPDATE_TOKEN_VALUE",
  CREATE_NEW_WALLET = "CREATE_NEW_WALLET",
}

type DogeSymbol = typeof Protocol_Symbol;

export interface DOGEDRC {
  method: ValidMethods;
  p: DogeSymbol;
  op: ValidMethods;
  tick: string;
  amt?: number;
  max?: number;
  lim?: number;
}

interface InscriptionMeta {
  hash: string;
  sender: string;
  receiver?: string;
  time: number;
  block: number;
  inscriptionId: string;
}

export interface Doginals {
  inscriptionData: InscriptionMeta;
  DRCData: DOGEDRC;
}

export interface DoginalsDeployment {
  tick: string;
  supply: bigint;
  limit: bigint;
  MintedAmount: bigint;
  deployer: string;
  txid: string;
  inscriptionID: string;
  time: number;
  block: number;
  isMinted: boolean;
  completedBlock?: bigint;
}

export interface DeployedCache {
  tick: string;
  supply: bigint;
  limit: bigint;
  MintedAmount: bigint;
  isMinted: boolean;
  MintedBlock: bigint;
}

export type BalanceData = {
  tick: string;
  amount: bigint;
  transferable: bigint;
  updateTypes?: BalanceUpdateTypes;
};

export interface BalanceDoginals {
  address: string;
  holding: BalanceData[];
}

export interface InscribedData {
  address: string;
  inscribed_id: string;
}

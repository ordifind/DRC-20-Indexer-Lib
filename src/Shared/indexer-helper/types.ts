import Decimal from "decimal.js";
import { Protocol_Symbol } from "./config";
export enum ValidMethods {
  deploy = "deploy",
  mint = "mint",
  transfer = "transfer0",
  inscribe_transfer = "transfer",
}

export enum MethodsDNS {
  dns = "dns",
}

export enum BalanceUpdateTypes {
  PUSH_NEW_TOKEN = "PUSH_NEW_TOKEN",
  UPDATE_TOKEN_VALUE = "UPDATE_TOKEN_VALUE",
  CREATE_NEW_WALLET = "CREATE_NEW_WALLET",
}

type DogeSymbol = typeof Protocol_Symbol;

export interface DomainMethod {
  p: "dns";
  op: string;
  name: string;
}

export interface BlockMethod {
  p: "dogemap";
  block: number;
}

export interface DOGEDRC {
  method: ValidMethods;
  p: DogeSymbol;
  op: ValidMethods;
  tick: string;
  amt?: string;
  max?: string;
  lim?: string;
}

interface InscriptionMeta {
  hash: string;
  sender: string;
  receiver?: string;
  time: number;
  block: number;
  index: number;
  inscriptionId: string;
  location: string;
}

export interface Doginals {
  inscriptionData: InscriptionMeta;
  DRCData: DOGEDRC;
}

export interface OtherDoginalsBox {
  inscriptionData: InscriptionMeta;
  doginal: DomainMethod | BlockMethod;
}

export interface DoginalsDeployment {
  tick: string;
  supply: string;
  limit: string;
  MintedAmount: string;
  deployer: string;
  txid: string;
  inscriptionID: string;
  time: number;
  block: number;
  isMinted: boolean;
  completedBlock?: number;
}

export interface DeployedCache {
  tick: string;
  supply: Decimal;
  limit: Decimal;
  MintedAmount: Decimal;
  isMinted: boolean;
  MintedBlock: number;
}

export type BalanceData = {
  tick: string;
  amount: string;
  transferable: string;
  updateTypes?: BalanceUpdateTypes;
};

export interface BalanceDoginals {
  address: string;
  holding: BalanceData[];
}

export interface InscribedData {
  address: string;
  inscribed_id: string;
  hash: string;
  index: number;
}

export interface DoginalsLogs {
  tick: string;
  amount?: string;
  limit?: string;
  max?: string;
  block: number;
  inscripition_id: string;
  txid: string;
  sender?: string;
  receiver: string;
  isValid: boolean;
  reasonIgnore?: string;
  event: "deploy" | "mint" | "inscribe-transfer" | "transfer";
}

export interface DoginalsInputTransaction {
  blockNumber: number;
  txid: string;
  InscriptionPresentIndex: number;
  inputs: { txid: string; vin: string }[];
  outputs: {
    index: string;
    script: string;
    amount: number;
  }[];
  InscriptionUTXOs: {
    hash: string;
    index: number;
    address: string;
    inscribed_id: string;
  };
  coinbase: boolean;
  index: number;
  time: number;
}
export type Outputdata = {
  hash: string;
  amount: number;
  index: number;
};
export interface outputDecode {
  outputs: Outputdata[];
}

export interface Dogemap {
  inscription_id: string;
  blockNumber: number;
}

export interface domains {
  inscription_id: string;
  content: string;
  namespace: string;
}

import {
  AddDecimals,
  DecimalToString,
  StringToDecimals,
  SubDecimals,
} from "../utils/decimalsConvert";
import { Protocol_Symbol } from "./config";
import {
  BalanceData,
  BalanceDoginals,
  BalanceUpdateTypes,
  DOGEDRC,
  Doginals,
  ValidMethods,
} from "./types";
import Decimal from "decimal.js";
import * as bitcoin from "bitcoinjs-lib";

export const DecodeJSON = <T>(hex: string): T | undefined => {
  try {
    const UTF8 = BufferToString(hex);
    const JSONDecode = JSON.parse(UTF8);

    const tick: string = JSONDecode?.tick.toLowerCase();

    if (!tick) return;
    return { ...JSONDecode, tick: tick };
  } catch (error) {}
};

export const BufferToString = (Buffer_: string): string => {
  return Buffer.from(Buffer_, "hex").toString("utf-8");
};

export const ValidatePayloads = (data: DOGEDRC): boolean => {
  if (data.p !== Protocol_Symbol) return false;
  const DecimalReg = /[eE\s]/g;

  if (!data.tick) return false;

  if (typeof data.tick !== "string") return false;

  if (Buffer.from(data.tick).length !== 4) return false;

  if (data.amt && typeof data.amt !== "string") return false;

  if (data.lim && typeof data.lim !== "string") return false;

  if (data.max && typeof data.max !== "string") return false;

  if (data.amt && isNaN(Number(data.amt))) return false;

  if (data.amt && DecimalReg.test(String(data.amt))) return false;
  if (data.max && DecimalReg.test(String(data.max))) return false;
  if (data.lim && DecimalReg.test(String(data.lim))) return false;

  if (data.lim && isNaN(Number(data.lim))) return false;
  if (data.max && isNaN(Number(data.max))) return false;

  if (
    data.amt &&
    (new Decimal(Number(data.amt)).isZero() ||
      new Decimal(Number(data.amt)).isNeg() ||
      new Decimal(Number(data.amt)).isNaN())
  )
    return false;

  if (
    data.max &&
    (new Decimal(Number(data.max)).isZero() ||
      new Decimal(Number(data.max)).isNeg() ||
      new Decimal(Number(data.max)).isNaN())
  )
    return false;

  if (
    data.lim &&
    (new Decimal(Number(data.lim)).isZero() ||
      new Decimal(Number(data.lim)).isNeg() ||
      new Decimal(Number(data.lim)).isNaN())
  )
    return false;

  return true;
};

export const GetTokenToCheck = (data: Doginals[]): string[] => {
  const Tokens = data.map((e) => e.DRCData.tick);
  const UniqueTokens = new Set(Tokens);
  const UniqueTokensList = Array.from(UniqueTokens);
  return UniqueTokensList;
};

export const GetAddressToLoadBalance = (data: Doginals[]): string[] => {
  const AddressList: string[] = [];
  data.map((e) => {
    if (
      e.DRCData.op === ValidMethods.deploy ||
      e.DRCData.op === ValidMethods.mint ||
      e.DRCData.op === ValidMethods.inscribe_transfer
    ) {
      AddressList.push(e.inscriptionData.sender);
    } else if (e.DRCData.op === ValidMethods.transfer) {
      AddressList.push(e.inscriptionData.sender);
      AddressList.push(e.inscriptionData.receiver || "");
    }
  });
  const UniqueAddress = new Set(AddressList);
  const UniqueAddressList = Array.from(UniqueAddress);
  return UniqueAddressList;
};

export const CheckUpdateType = (
  IsUserExistinDB: BalanceDoginals | undefined,
  IsSameTickExistinDB: BalanceData | undefined
): BalanceUpdateTypes => {
  if (IsUserExistinDB && IsSameTickExistinDB) {
    return BalanceUpdateTypes.UPDATE_TOKEN_VALUE;
  } else if (IsUserExistinDB && !IsSameTickExistinDB) {
    return BalanceUpdateTypes.PUSH_NEW_TOKEN;
  } else {
    return BalanceUpdateTypes.CREATE_NEW_WALLET;
  }
};

export const UpdateBalanceValue = (
  IsUserExistinDB: BalanceDoginals | undefined,
  IsSameTickExistinDB: BalanceData | undefined,
  amount: Decimal,
  sum: boolean,
  balanceType: "amount" | "transferable"
): string => {
  if (IsUserExistinDB && IsSameTickExistinDB) {
    return sum
      ? DecimalToString(
          AddDecimals(
            amount,
            StringToDecimals(IsSameTickExistinDB[balanceType])
          )
        )
      : IsSameTickExistinDB[balanceType];
  } else {
    return DecimalToString(amount);
  }
};

export const ValidateMintPayloads = (
  limit: Decimal,
  amt: Decimal,
  max: Decimal,
  minted: Decimal
): Decimal | string => {
  try {
    if (amt.gt(limit)) return "Amount is greater then Limit";

    if (max.lte(minted)) return "Token Minted Already";

    const SupplyLeftToMint: Decimal = SubDecimals(max, minted);
    //1000 - 990

    if (SupplyLeftToMint.lt(limit) && !SupplyLeftToMint.isZero()) {
      const IsAmountLast = SupplyLeftToMint;
      return IsAmountLast;
    } else if (!SupplyLeftToMint.isZero()) {
      return amt;
    }
    return "No Supply Left to cover mint";
  } catch (error) {
    throw error;
    return "Invalid Number";
  }
};

export const FormatBalance = (data: BalanceDoginals[]) => {
  try {
    const Address: string[] = [];
    const UpdateQuery: any[] = [];

    data.map((el) => {
      el.holding.map((e) => {
        const UpdateMethods = e.updateTypes;

        if (UpdateMethods === BalanceUpdateTypes.UPDATE_TOKEN_VALUE) {
          UpdateQuery.push({
            updateOne: {
              filter: { address: el.address },
              update: {
                $set: {
                  "holding.$[elm].amount": e.amount,
                  "holding.$[elm].transferable": e.transferable,
                },
              },
              arrayFilters: [{ "elm.tick": e.tick }],
            },
          });
        } else if (
          UpdateMethods === BalanceUpdateTypes.PUSH_NEW_TOKEN ||
          Address.find((a) => a === el.address)
        ) {
          UpdateQuery.push({
            updateOne: {
              filter: { address: el.address },
              update: {
                $push: {
                  holding: {
                    tick: e.tick,
                    amount: e.amount,
                    transferable: e.transferable,
                  },
                },
              },
            },
          });
        } else {
          Address.push(el.address);
          UpdateQuery.push({
            insertOne: {
              document: {
                address: el.address,
                holding: [
                  {
                    tick: e.tick,
                    amount: e.amount,
                    transferable: e.transferable,
                  },
                ],
              },
            },
          });
        }
      });
    });
    return UpdateQuery;
  } catch (error) {
    throw error;
  }
};

export const Sleep = async (timer: number = 20): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, timer * 1000));
};

export const ReverseHash = (hash: string) => {
  return Buffer.from(hash, "hex").reverse().toString("hex");
};
export const dogecoinNetwork = {
  messagePrefix: "\x19Dogecoin Signed Message:\n",
  bech32: "bc",
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398,
  },
  pubKeyHash: 0x1e,
  scriptHash: 0x16,
  wif: 0x9e,
};

export const OutputScriptToAddress = (script: string) => {
  try {
    const outputScriptDecoded = bitcoin.address.fromOutputScript(
      Buffer.from(script, "hex"),
      dogecoinNetwork
    );
    return outputScriptDecoded;
  } catch (error) {
    return script;
  }
};

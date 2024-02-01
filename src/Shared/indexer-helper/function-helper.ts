import { Add, Sub } from "../utils/decimalsConvert";
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

export const DecodeJSON = <T>(jsonData: string): T | undefined => {
  try {
    const JSONDecode = JSON.parse(BufferToString(jsonData));
    return JSONDecode;
  } catch (error) {}
};

export const BufferToString = (Buffer_: string): string => {
  return Buffer.from(Buffer_, "hex").toString("utf-8");
};

export const ValidatePayloads = (data: DOGEDRC): boolean => {
  if (data.p !== Protocol_Symbol) return false;
  const DecimalReg = /[eE]/;

  if (!data.tick) return false;

  if (typeof data.tick !== "string") return false;

  if (Buffer.from(data.tick).length !== 4) return false;

  if (data.amt && typeof data.amt !== "string") return false;

  if (data.lim && typeof data.lim !== "string") return false;

  if (data.max && typeof data.max !== "string") return false;

  if (data.amt && isNaN(data.amt)) return false;

  if (data.amt && DecimalReg.test(String(data.amt))) return false;

  if (data.lim && isNaN(data.lim)) return false;
  if (data.max && isNaN(data.max)) return false;

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
  amount: bigint,
  sum: boolean,
  balanceType: "amount" | "transferable"
): bigint => {
  if (IsUserExistinDB && IsSameTickExistinDB) {
    return sum
      ? Add(amount, BigInt(IsSameTickExistinDB[balanceType]))
      : BigInt(IsSameTickExistinDB[balanceType]);
  } else {
    return amount;
  }
};

export const ValidateMintPayloads = (
  limit: number,
  amt: number,
  max: number,
  minted: number
): number | string => {
  try {
    const LimitDecimals = new Decimal(limit);
    const amtDecimals = new Decimal(amt);
    const maxDecimals = new Decimal(max);
    const MintedDecimals = new Decimal(minted);

    if (amtDecimals.gt(LimitDecimals)) return "Amount is greater then Limit";

    if (maxDecimals.lte(MintedDecimals)) return "Token Minted Already";

    const SupplyLeftToMint: number = Number(Sub(BigInt(max), BigInt(minted)));
    //1000 - 990

    if (
      new Decimal(SupplyLeftToMint).lt(LimitDecimals) &&
      !new Decimal(SupplyLeftToMint).isZero()
    ) {
      const IsAmountLast = SupplyLeftToMint;
      return IsAmountLast;
    } else if (!new Decimal(SupplyLeftToMint).isZero()) {
      return amt;
    }
    return "No Supply Left to cover mint";
  } catch (error) {
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

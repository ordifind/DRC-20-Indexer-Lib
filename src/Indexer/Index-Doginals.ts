import {
  BalanceData,
  BalanceDoginals,
  DeployedCache,
  Doginals,
  DoginalsDeployment,
  DoginalsLogs,
  ValidMethods,
} from "../Shared/indexer-helper/types";
import TokenQuery from "../Shared/db-lib/conn/Token-Query";
import {
  CheckUpdateType,
  GetAddressToLoadBalance,
  GetTokenToCheck,
  UpdateBalanceValue,
  ValidateMintPayloads,
} from "../Shared/indexer-helper/function-helper";
import BalanceQuery from "../Shared/db-lib/conn/Balance-Query";
import Decimal from "decimal.js";
import {
  Add,
  BigIntToString,
  DecimalsToNumber,
  StringToBigint,
  Sub,
} from "../Shared/utils/decimalsConvert";

const IndexDoginals = async (data: Doginals[]) => {
  try {
    //Doginals Logs

    const DoginalsLogs: DoginalsLogs[] = [];

    //Token Deployment
    const DeployedCache: DeployedCache[] = [];
    const DeploymentData: DoginalsDeployment[] = [];

    //User Balances
    const BalanceData: BalanceDoginals[] = [];
    const BalanceDataBase: BalanceDoginals[] = [];

    const TokenToCheckInDatabase: string[] = GetTokenToCheck(data);

    const AddressToCheckInDataBase: string[] = GetAddressToLoadBalance(data);

    const TokenDatafromDB = await TokenQuery.LoadTokensData(
      TokenToCheckInDatabase
    );

    const BalanceDataFromDb = await BalanceQuery.LoadUpBalance(
      AddressToCheckInDataBase
    );

    if (BalanceDataFromDb?.length !== 0 && BalanceDataFromDb) {
      const FormatedData: BalanceDoginals[] | undefined =
        BalanceDataFromDb?.map((e) => {
          return { address: e.address, holding: e.holding };
        });

      BalanceDataBase.push(...FormatedData);
    }

    if (TokenDatafromDB?.length !== 0)
      TokenDatafromDB?.map((e) => {
        const { tick, supply, limit, MintedAmount, isMinted, completedBlock } =
          e;

        DeployedCache.push({
          tick: tick,
          supply: supply,
          limit: limit,
          MintedAmount: MintedAmount,
          isMinted,
          MintedBlock: completedBlock,
        });
      });

    for (const Doginals of data) {
      const { inscriptionData, DRCData } = Doginals;

      const Sender = inscriptionData.sender;

      if (DRCData.op === ValidMethods.deploy) {
        //lets check if the Tick is on the cahce

        const IsTokenExistInCache = DeployedCache.find(
          (a) => a.tick === DRCData.tick
        );

        const Supply = DecimalsToNumber(DRCData.max || 0);
        const Limit = DecimalsToNumber(DRCData.lim || 0);

        if (IsTokenExistInCache) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            limit: Supply,
            max: Limit,
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "Token Already Deployed",
            event: "deploy",
          });
          continue;
        }

        DeployedCache.push({
          tick: DRCData.tick,
          supply: Supply,
          limit: Limit,
          MintedAmount: BigInt(0),
          isMinted: false,
          MintedBlock: 0,
        });

        DeploymentData.push({
          tick: DRCData.tick,
          supply: Supply,
          limit: Limit,
          deployer: inscriptionData.sender,
          block: inscriptionData.block,
          MintedAmount: BigInt(0),
          isMinted: false,
          time: inscriptionData.time,
          inscriptionID: inscriptionData.inscriptionId,
          txid: inscriptionData.hash,
          completedBlock: 0,
        });

        DoginalsLogs.push({
          tick: DRCData.tick,
          limit: Supply,
          max: Limit,
          inscripition_id: inscriptionData.inscriptionId,
          txid: inscriptionData.hash,
          block: inscriptionData.block,
          receiver: inscriptionData.sender || "",
          isValid: true,
          event: "deploy",
        });
      } else if (DRCData.op === ValidMethods.mint) {
        //Check if Token is Deployed
        if (!DRCData.amt) continue;

        const IsTokenDeployed = DeployedCache.find(
          (a) => a.tick === DRCData.tick
        );

        const UserMintAmount = DecimalsToNumber(Number(DRCData.amt));

        if (!IsTokenDeployed) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: UserMintAmount,
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "Token Not Deployed",
            event: "mint",
          });
          continue;
        } //token not Deployed Yet

        const { supply, MintedAmount, isMinted, limit } = IsTokenDeployed;

        if (isMinted) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: UserMintAmount,
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "Token Already 100% Minted",
            event: "mint",
          });
          continue;
        } //token minted

        const ValidateMint: bigint | string = ValidateMintPayloads(
          limit,
          UserMintAmount,
          supply,
          MintedAmount
        );

        if (typeof ValidateMint !== "bigint") {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: UserMintAmount,
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: ValidateMint,
            event: "mint",
          });
          continue;
        }
        IsTokenDeployed.MintedAmount = Add(BigInt(MintedAmount), ValidateMint);

        IsTokenDeployed.MintedBlock = inscriptionData.block;

        //Now Check if User Exist in Balance Cache or Not

        const IsUserInBalanceToStore = BalanceData.find(
          (e) => e.address === Sender
        );

        const IsUserHoldingSameTokenInStore =
          IsUserInBalanceToStore?.holding?.find(
            (a) => a?.tick === Doginals.DRCData.tick
          );

        const IsUserInBalanceDataBase = BalanceDataBase.find(
          (e) => e.address === Sender
        );

        const IsUserHoldingSameTokenInDataBase =
          IsUserInBalanceDataBase?.holding?.find(
            (a) => a?.tick === Doginals.DRCData.tick
          );

        DoginalsLogs.push({
          tick: DRCData.tick,
          amount: UserMintAmount,
          inscripition_id: inscriptionData.inscriptionId,
          txid: inscriptionData.hash,
          block: inscriptionData.block,
          receiver: inscriptionData.sender || "",
          isValid: true,
          event: "mint",
        });

        //lets process update
        if (IsUserInBalanceToStore && !IsUserHoldingSameTokenInStore) {
          IsUserInBalanceToStore.holding.push({
            tick: Doginals.DRCData.tick,
            amount: UpdateBalanceValue(
              IsUserInBalanceDataBase,
              IsUserHoldingSameTokenInDataBase,
              ValidateMint,
              true,
              "amount"
            ),
            transferable: UpdateBalanceValue(
              IsUserInBalanceDataBase,
              IsUserHoldingSameTokenInDataBase,
              BigInt(0),
              false,
              "transferable"
            ),
            updateTypes: CheckUpdateType(
              IsUserInBalanceDataBase,
              IsUserHoldingSameTokenInDataBase
            ),
          });
        } else if (IsUserInBalanceToStore && IsUserHoldingSameTokenInStore) {
          IsUserInBalanceToStore.holding.map((e) => {
            if (e.tick !== DRCData.tick) return e;
            return {
              tick: e.tick,
              amount: Add(BigInt(e.amount), ValidateMint),
              transferable: UpdateBalanceValue(
                IsUserInBalanceDataBase,
                IsUserHoldingSameTokenInDataBase,
                BigInt(0),
                false,
                "transferable"
              ),
              updateTypes: CheckUpdateType(
                IsUserInBalanceDataBase,
                IsUserHoldingSameTokenInDataBase
              ),
            };
          });
        } else {
          BalanceData.push({
            address: Sender,
            holding: [
              {
                tick: Doginals.DRCData.tick,
                amount: BigIntToString(ValidateMint),
                transferable: BigIntToString(BigInt(0)),
                updateTypes: CheckUpdateType(
                  IsUserInBalanceDataBase,
                  IsUserHoldingSameTokenInDataBase
                ),
              },
            ],
          });
        }
      } else if (DRCData.op === ValidMethods.inscribe_transfer) {
        if (!DRCData.amt) continue;

        const IsTokenExistInCache = DeployedCache.find(
          (a) => a.tick === DRCData.tick
        );

        const UserTransferAmount = DecimalsToNumber(DRCData.amt || 0);

        if (!IsTokenExistInCache) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: UserTransferAmount,
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "Token Not Deployed",
            event: "inscribe-transfer",
          });
          continue;
        }

        let BalanceTree: BalanceData | undefined;

        const IsBalanceinCache = BalanceData.find(
          (a) =>
            a.address === inscriptionData.sender &&
            a.holding.find((b) => b.tick === DRCData.tick)
        );

        const isBalanceinDB = BalanceDataBase.find(
          (a) =>
            a.address === inscriptionData.sender &&
            a.holding.find((b) => b.tick === DRCData.tick)
        );

        if (IsBalanceinCache) {
          const UserBalanceSeperated = IsBalanceinCache.holding.find(
            (a) => a.tick === DRCData.tick
          );
          BalanceTree = UserBalanceSeperated;
        } else {
          BalanceTree = isBalanceinDB?.holding.find(
            (a) => a.tick === DRCData.tick
          );
        }

        if (!BalanceTree) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: UserTransferAmount,
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "User or Token did not exist",
            event: "inscribe-transfer",
          });
          continue;
        }

        const TransferAbleBalance = BigInt(BalanceTree.transferable);
        const AmountBalance = BigInt(BalanceTree.amount);

        if (new Decimal(Number(AmountBalance)).isNeg()) {
          throw Error(`Neg Balance found !`);
        }

        if (new Decimal(Number(UserTransferAmount)).gt(Number(AmountBalance))) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: UserTransferAmount,
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "User Balance is less then Transfer Amount",
            event: "inscribe-transfer",
          });

          continue;
        }
        const NewTransferableBalance = Add(
          UserTransferAmount,
          TransferAbleBalance
        );

        const NewAmountBalance = Sub(AmountBalance, UserTransferAmount);

        //Saved Inscribe-Data

        await BalanceQuery.WriteInscribedTransfer({
          inscribed_id: inscriptionData.inscriptionId,
          address: inscriptionData.sender,
        });

        DoginalsLogs.push({
          tick: DRCData.tick,
          amount: UserTransferAmount,
          inscripition_id: inscriptionData.inscriptionId,
          txid: inscriptionData.hash,
          block: inscriptionData.block,
          receiver: inscriptionData.sender || "",
          isValid: true,
          event: "inscribe-transfer",
        });

        if (IsBalanceinCache) {
          IsBalanceinCache.holding = IsBalanceinCache.holding.map((e) => {
            return e.tick !== DRCData.tick
              ? e
              : {
                  tick: e.tick,
                  amount: BigIntToString(
                    Sub(StringToBigint(e.amount), UserTransferAmount)
                  ),
                  transferable: BigIntToString(
                    Add(StringToBigint(e.transferable), UserTransferAmount)
                  ),
                  updateTypes: e.updateTypes,
                };
          });
        } else if (isBalanceinDB) {
          const IsAddressPresentInCache = BalanceData.find(
            (a) => a.address === inscriptionData.sender
          );

          if (IsAddressPresentInCache) {
            IsAddressPresentInCache.holding.push({
              tick: DRCData.tick,
              amount: BigIntToString(NewAmountBalance),
              transferable: BigIntToString(NewTransferableBalance),
            });
          } else {
            BalanceData.push({
              address: inscriptionData.sender,
              holding: [
                {
                  tick: DRCData.tick,
                  amount: BigIntToString(NewAmountBalance),
                  transferable: BigIntToString(NewTransferableBalance),
                },
              ],
            });
          }
        }
      }
    }

    if (DeploymentData.length !== 0) {
      const Success = await TokenQuery.CreateDRC20Tokens(DeploymentData);
      if (!Success) throw new Error(`Faild to Index Some Doginals Token!`);
    }

    if (BalanceData.length !== 0) {
      const BalanceSuccess = await BalanceQuery.WriteBalance(BalanceData);
      if (!BalanceSuccess) throw new Error(`Faild to Insert Balance Datas`);
    }

    if (DeployedCache.length !== 0) {
      const ValidUpdateStates = DeployedCache.filter(
        (a) => Number(a.MintedAmount) !== 0
      );

      if (ValidUpdateStates.length !== 0) {
        await TokenQuery.UpdateTokenState(ValidUpdateStates);
      }
    }

    if (DoginalsLogs.length !== 0) {
      await BalanceQuery.StoreEventLogs(DoginalsLogs);
    }
  } catch (error) {
    throw error;
  }
};

export default IndexDoginals;

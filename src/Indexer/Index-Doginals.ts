import {
  BalanceData,
  BalanceDoginals,
  BalanceUpdateTypes,
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
import {
  AddDecimals,
  DecimalToString,
  NumberToDecimals,
  StringToDecimals,
  SubDecimals,
} from "../Shared/utils/decimalsConvert";
import Decimal from "decimal.js";

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
          supply: StringToDecimals(supply),
          limit: StringToDecimals(limit),
          MintedAmount: StringToDecimals(MintedAmount),
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

        const Supply = NumberToDecimals(DRCData.max || "0");
        const Limit = NumberToDecimals(DRCData.lim || "0");

        if (IsTokenExistInCache) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            limit: DecimalToString(Supply),
            max: DecimalToString(Limit),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "Token Already Deployed",
            event: "deploy",
            time: inscriptionData.time,
          });
          continue;
        }

        DeployedCache.push({
          tick: DRCData.tick,
          supply: Supply,
          limit: Limit,
          MintedAmount: NumberToDecimals("0"),
          isMinted: false,
          MintedBlock: 0,
        });

        DeploymentData.push({
          tick: DRCData.tick,
          supply: DecimalToString(Supply),
          limit: DecimalToString(Limit),
          deployer: inscriptionData.sender,
          block: inscriptionData.block,
          MintedAmount: "0",
          isMinted: false,
          time: inscriptionData.time,
          inscriptionID: inscriptionData.inscriptionId,
          txid: inscriptionData.hash,
          completedBlock: 0,
        });

        DoginalsLogs.push({
          tick: DRCData.tick,
          limit: DecimalToString(Supply),
          max: DecimalToString(Limit),
          inscripition_id: inscriptionData.inscriptionId,
          txid: inscriptionData.hash,
          block: inscriptionData.block,
          receiver: inscriptionData.sender || "",
          isValid: true,
          event: "deploy",
          time: inscriptionData.time,
        });
      } else if (DRCData.op === ValidMethods.mint) {
        //Check if Token is Deployed
        if (!DRCData.amt) continue;

        const IsTokenDeployed = DeployedCache.find(
          (a) => a.tick === DRCData.tick
        );

        const UserMintAmount = NumberToDecimals(DRCData.amt);

        if (!IsTokenDeployed) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: DecimalToString(UserMintAmount),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "Token Not Deployed",
            event: "mint",
            time: inscriptionData.time,
          });
          continue;
        } //token not Deployed Yet

        const { supply, MintedAmount, isMinted, limit } = IsTokenDeployed;

        if (isMinted) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: DecimalToString(UserMintAmount),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "Token Already 100% Minted",
            event: "mint",
            time: inscriptionData.time,
          });
          continue;
        } //token minted

        const ValidateMint: Decimal | string = ValidateMintPayloads(
          limit,
          UserMintAmount,
          supply,
          MintedAmount
        );

        if (typeof ValidateMint === "string") {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: DecimalToString(UserMintAmount),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: ValidateMint,
            event: "mint",
            time: inscriptionData.time,
          });
          continue;
        }
        IsTokenDeployed.MintedAmount = AddDecimals(MintedAmount, ValidateMint);
        IsTokenDeployed.MintedBlock = inscriptionData.block;

        //Now Check if User Exist in Balance Cache or Not

        const IsUserInBalanceToStore = BalanceData.find(
          (e) => e.address === Sender
        );

        const IsUserHoldingSameTokenInStore =
          IsUserInBalanceToStore?.holding?.find(
            (a) => a?.tick === DRCData.tick
          );

        const IsUserInBalanceDataBase = BalanceDataBase.find(
          (e) => e.address === Sender
        );

        const IsUserHoldingSameTokenInDataBase =
          IsUserInBalanceDataBase?.holding?.find(
            (a) => a?.tick === DRCData.tick
          );

        DoginalsLogs.push({
          tick: DRCData.tick,
          amount: DecimalToString(UserMintAmount),
          inscripition_id: inscriptionData.inscriptionId,
          txid: inscriptionData.hash,
          block: inscriptionData.block,
          receiver: inscriptionData.sender || "",
          isValid: true,
          event: "mint",
          time: inscriptionData.time,
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
              NumberToDecimals("0"),
              false,
              "transferable"
            ),
            updateTypes: CheckUpdateType(
              IsUserInBalanceDataBase,
              IsUserHoldingSameTokenInDataBase
            ),
          });
        } else if (IsUserInBalanceToStore && IsUserHoldingSameTokenInStore) {
          IsUserInBalanceToStore.holding = IsUserInBalanceToStore.holding.map(
            (e) => {
              if (e.tick !== DRCData.tick) return e;

              return {
                tick: e.tick,
                amount: DecimalToString(
                  AddDecimals(StringToDecimals(e.amount), ValidateMint)
                ),
                transferable: e.transferable,
                updateTypes: e.updateTypes,
              };
            }
          );
        } else {
          BalanceData.push({
            address: Sender,
            holding: [
              {
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
                  NumberToDecimals("0"),
                  false,
                  "transferable"
                ),
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
        const UserTransferAmount = NumberToDecimals(DRCData.amt || "0");

        if (!IsTokenExistInCache) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: DecimalToString(UserTransferAmount),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "Token Not Deployed",
            event: "inscribe-transfer",
            time: inscriptionData.time,
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
            amount: DecimalToString(UserTransferAmount),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "User or Token did not exist",
            event: "inscribe-transfer",
            time: inscriptionData.time,
          });
          continue;
        }

        const TransferAbleBalance = StringToDecimals(BalanceTree.transferable);
        const AmountBalance = StringToDecimals(BalanceTree.amount);

        if (AmountBalance.isNegative()) {
          throw Error(`Neg Balance found !`);
        }

        if (UserTransferAmount.gt(AmountBalance)) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: DecimalToString(UserTransferAmount),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            receiver: inscriptionData.sender || "",
            isValid: false,
            reasonIgnore: "User Balance is less then Transfer Amount",
            event: "inscribe-transfer",
            time: inscriptionData.time,
          });

          continue;
        }
        const NewTransferableBalance = AddDecimals(
          UserTransferAmount,
          TransferAbleBalance
        );

        const NewAmountBalance = SubDecimals(AmountBalance, UserTransferAmount);

        //Saved Inscribe-Data

        await BalanceQuery.WriteInscribedTransfer({
          inscribed_id: inscriptionData.inscriptionId,
          address: inscriptionData.sender,
          hash: inscriptionData.hash,
          index: 0,
        });

        DoginalsLogs.push({
          tick: DRCData.tick,
          amount: DecimalToString(UserTransferAmount),
          inscripition_id: inscriptionData.inscriptionId,
          txid: inscriptionData.hash,
          block: inscriptionData.block,
          receiver: inscriptionData.sender || "",
          isValid: true,
          event: "inscribe-transfer",
          time: inscriptionData.time,
        });

        if (IsBalanceinCache) {
          IsBalanceinCache.holding = IsBalanceinCache.holding.map((e) => {
            return e.tick !== DRCData.tick
              ? e
              : {
                  tick: e.tick,
                  amount: DecimalToString(
                    SubDecimals(StringToDecimals(e.amount), UserTransferAmount)
                  ),
                  transferable: DecimalToString(
                    AddDecimals(
                      StringToDecimals(e.transferable),
                      UserTransferAmount
                    )
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
              amount: DecimalToString(NewAmountBalance),
              transferable: DecimalToString(NewTransferableBalance),
              updateTypes: BalanceUpdateTypes.UPDATE_TOKEN_VALUE,
            });
          } else {
            BalanceData.push({
              address: inscriptionData.sender,
              holding: [
                {
                  tick: DRCData.tick,
                  amount: DecimalToString(NewAmountBalance),
                  transferable: DecimalToString(NewTransferableBalance),
                  updateTypes: BalanceUpdateTypes.UPDATE_TOKEN_VALUE,
                },
              ],
            });
          }
        }
      } else if (DRCData.op === ValidMethods.transfer) {
        if (!DRCData.amt) continue;

        const IsTokenExistInCache = DeployedCache.find(
          (a) => a.tick === DRCData.tick
        );

        const UserTransferAmount = NumberToDecimals(DRCData.amt || "0");

        //Now lets Check if the inscription is inscriped or not

        const IsInscriptionInscribe = await BalanceQuery.LoadInscribeId(
          inscriptionData.inscriptionId
        );

        if (!IsInscriptionInscribe) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: DecimalToString(UserTransferAmount),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            sender: inscriptionData.sender,
            receiver: inscriptionData.receiver || "",
            isValid: false,
            reasonIgnore: "Inscription is not transferable",
            event: "transfer",
            time: inscriptionData.time,
          });
          continue;
        }

        if (!IsTokenExistInCache) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: DecimalToString(UserTransferAmount),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            sender: inscriptionData.sender,
            receiver: inscriptionData.receiver || "",
            isValid: false,
            reasonIgnore: "Token Not Deployed",
            event: "transfer",
            time: inscriptionData.time,
          });
          continue;
        }

        let Sender: BalanceData | undefined;

        const IsSenderBalanceinCache = BalanceData.find(
          (a) =>
            a.address === inscriptionData.sender &&
            a.holding.find((b) => b.tick === DRCData.tick)
        );

        const isSenderBalanceinDB = BalanceDataBase.find(
          (a) =>
            a.address === inscriptionData.sender &&
            a.holding.find((b) => b.tick === DRCData.tick)
        );

        if (IsSenderBalanceinCache) {
          const UserBalanceSeperated = IsSenderBalanceinCache.holding.find(
            (a) => a.tick === DRCData.tick
          );
          Sender = UserBalanceSeperated;
        } else {
          Sender = isSenderBalanceinDB?.holding.find(
            (a) => a.tick === DRCData.tick
          );
        }

        if (!Sender) {
          DoginalsLogs.push({
            tick: DRCData.tick,
            amount: DecimalToString(UserTransferAmount),
            inscripition_id: inscriptionData.inscriptionId,
            txid: inscriptionData.hash,
            block: inscriptionData.block,
            sender: inscriptionData.sender,
            receiver: inscriptionData.receiver || "",
            isValid: false,
            reasonIgnore: "User or Token did not exist",
            event: "transfer",
            time: inscriptionData.time,
          });
          continue;
        }

        const SenderBalanceAmount = StringToDecimals(Sender.amount);
        const SenderBalanceTransferable = StringToDecimals(Sender.transferable);

        const NewSenderTransferableBalance = SubDecimals(
          SenderBalanceTransferable,
          UserTransferAmount
        );

        if (IsSenderBalanceinCache) {
          IsSenderBalanceinCache.holding = IsSenderBalanceinCache.holding.map(
            (e) => {
              return e.tick !== DRCData.tick
                ? e
                : {
                    tick: e.tick,
                    amount: e.amount,
                    transferable: DecimalToString(NewSenderTransferableBalance),
                    updateTypes: e.updateTypes,
                  };
            }
          );
        } else if (isSenderBalanceinDB) {
          const IsAddressPresentInCache = BalanceData.find(
            (a) => a.address === inscriptionData.sender
          );

          if (IsAddressPresentInCache) {
            IsAddressPresentInCache.holding.push({
              tick: DRCData.tick,
              amount: DecimalToString(SenderBalanceAmount),
              transferable: DecimalToString(NewSenderTransferableBalance),
              updateTypes: BalanceUpdateTypes.UPDATE_TOKEN_VALUE,
            });
          } else {
            BalanceData.push({
              address: inscriptionData.sender,
              holding: [
                {
                  tick: DRCData.tick,
                  amount: DecimalToString(SenderBalanceAmount),
                  transferable: DecimalToString(NewSenderTransferableBalance),
                  updateTypes: BalanceUpdateTypes.UPDATE_TOKEN_VALUE,
                },
              ],
            });
          }
        }

        const IsReceiverAddressInCache = BalanceData.find(
          (a) => a.address === inscriptionData.receiver
        );

        const IsReceiverBalanceinCache =
          IsReceiverAddressInCache?.holding?.find(
            (a) => a.tick === DRCData.tick
          );

        const isReceiverAddressinDB = BalanceDataBase.find(
          (a) => a.address === inscriptionData.receiver
        );

        const isReceiverBalanceinDB = isReceiverAddressinDB?.holding?.find(
          (a) => a.tick === DRCData.tick
        );

        if (IsReceiverAddressInCache && !IsReceiverBalanceinCache) {
          IsReceiverAddressInCache.holding.push({
            tick: Doginals.DRCData.tick,
            amount: UpdateBalanceValue(
              isReceiverAddressinDB,
              isReceiverBalanceinDB,
              UserTransferAmount,
              true,
              "amount"
            ),
            transferable: UpdateBalanceValue(
              isReceiverAddressinDB,
              isReceiverBalanceinDB,
              NumberToDecimals("0"),
              false,
              "transferable"
            ),
            updateTypes: CheckUpdateType(
              isReceiverAddressinDB,
              isReceiverBalanceinDB
            ),
          });
        } else if (IsReceiverAddressInCache && IsReceiverBalanceinCache) {
          IsReceiverAddressInCache.holding =
            IsReceiverAddressInCache?.holding.map((e) => {
              if (e.tick !== DRCData.tick) return e;
              return {
                tick: e.tick,
                amount: DecimalToString(
                  AddDecimals(StringToDecimals(e.amount), UserTransferAmount)
                ),
                transferable: e.transferable,
                updateTypes: e.updateTypes,
              };
            });
        } else {
          const receiver = inscriptionData.receiver || "";
          BalanceData.push({
            address: receiver,
            holding: [
              {
                tick: Doginals.DRCData.tick,
                amount: UpdateBalanceValue(
                  isReceiverAddressinDB,
                  isReceiverBalanceinDB,
                  UserTransferAmount,
                  true,
                  "amount"
                ),
                transferable: UpdateBalanceValue(
                  isReceiverAddressinDB,
                  isReceiverBalanceinDB,
                  NumberToDecimals("0"),
                  false,
                  "transferable"
                ),
                updateTypes: CheckUpdateType(
                  isReceiverAddressinDB,
                  isReceiverBalanceinDB
                ),
              },
            ],
          });
        }

        await BalanceQuery.DeleteInscribedId(inscriptionData.inscriptionId);

        DoginalsLogs.push({
          tick: DRCData.tick,
          amount: DecimalToString(UserTransferAmount),
          inscripition_id: inscriptionData.inscriptionId,
          txid: inscriptionData.hash,
          block: inscriptionData.block,
          sender: inscriptionData.sender,
          receiver: inscriptionData.receiver || "",
          isValid: true,
          time: inscriptionData.time,
          event: "transfer",
        });
      }
    }

    let MongoPromise = [];

    if (DeploymentData.length !== 0) {
      MongoPromise.push(TokenQuery.CreateDRC20Tokens(DeploymentData));
    }

    if (BalanceData.length !== 0) {
      MongoPromise.push(BalanceQuery.WriteBalance(BalanceData));
    }

    if (DeployedCache.length !== 0) {
      const ValidUpdateStates = DeployedCache.filter(
        (a) => Number(a.MintedAmount) !== 0
      );

      if (ValidUpdateStates.length !== 0) {
        MongoPromise.push(TokenQuery.UpdateTokenState(ValidUpdateStates));
      }
    }

    if (DoginalsLogs.length !== 0) {
      MongoPromise.push(BalanceQuery.StoreEventLogs(DoginalsLogs));
    }

    await Promise.all(MongoPromise);
  } catch (error) {
    throw error;
  }
};

export default IndexDoginals;

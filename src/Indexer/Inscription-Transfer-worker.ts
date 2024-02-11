import BalanceQuery from "../Shared/db-lib/conn/Balance-Query";
import DataQuery from "../Shared/db-lib/conn/Data-Query";
import { DecodeJSON } from "../Shared/indexer-helper/function-helper";
import {
  DOGEDRC,
  Doginals,
  DoginalsInputTransaction,
  InscribedData,
  ValidMethods,
} from "../Shared/indexer-helper/types";

interface TransactionsInput {
  index: number;
  hash: string;
}

const InputsValueIndex: { hash: string; value: number; index: number }[] = [];

const InscriptionTransferWorker = async (
  SameBlockDoginalsData: Doginals[],
  BlocksToIndex: number[]
): Promise<Doginals[]> => {
  const DoginalsTransfer: Doginals[] = [];

  try {
    const Inscribe_Transfer_Data = SameBlockDoginalsData.filter(
      (a) => a.DRCData.op === ValidMethods.inscribe_transfer
    );

    const DummyInscribedData = Inscribe_Transfer_Data.map(
      (e): InscribedData => {
        return {
          inscribed_id: e.inscriptionData.inscriptionId,
          address: e.inscriptionData.sender,
          index: 0,
          hash: e.inscriptionData.hash,
        };
      }
    );

    //Lets Load All BlockTransaction

    const BlockTransaction =
      (await DataQuery.LoadTransactions(BlocksToIndex)) || [];

    //Now lets gather all the Input TX used in these Transactions

    const InputHash: string[] = [];
    BlockTransaction?.map((e) => {
      e.Inputs.map((a: TransactionsInput) => {
        const IndexedUsed = a.hash.split(":");
        if (Number(IndexedUsed[1]) !== 0) return;
        InputHash.push(IndexedUsed[0]);
      });
    });

    //Now lets Find the Transfer Inscription contains input hash

    const ValidTransfers_ = await BalanceQuery.GetMatchInputs(InputHash);

    if (!ValidTransfers_ && !DummyInscribedData.length) return DoginalsTransfer;

    const InscribedDataFromDB =
      ValidTransfers_?.map((e): InscribedData => {
        return {
          inscribed_id: e.inscribed_id,
          address: e.address,
          index: e.index,
          hash: e.hash,
        };
      }) || [];

    const ValidTransfers = DummyInscribedData.concat(InscribedDataFromDB);

    const InputTransactions: string[] = [];

    const DoginalsTransactions: DoginalsInputTransaction[] = [];

    const Inscriptions: string[] = [];

    for (const Transactions of BlockTransaction) {
      for (const [i, Inputs] of Transactions.Inputs.entries()) {
        const InputHash = Inputs.hash.split(":")[0];

        const IsDoginalsTransfer = ValidTransfers.find(
          (a) => a.hash.toLowerCase() === InputHash.toLowerCase()
        );

        if (Number(InputHash.hash.split(":")[1] !== IsDoginalsTransfer?.index))
          continue;

        if (!IsDoginalsTransfer) continue;

        DoginalsTransactions.push({
          txId: Transactions.txId,
          Inputs: Transactions.Inputs,
          outputs: Transactions.outputs,
          block: Transactions.block,
          InscriptionPresentIndex: i,
          InscriptionUTXOs: {
            hash: IsDoginalsTransfer.hash,
            index: IsDoginalsTransfer.index,
            address: IsDoginalsTransfer.address,
            inscribed_id: IsDoginalsTransfer.inscribed_id,
          },
          index: Transactions.transaction.index,
          time: new Date(Transactions.transaction.timestamp).getTime(),
        });

        Inscriptions.push(IsDoginalsTransfer.inscribed_id);

        const IsTransactionReadyToCheck = InputTransactions.find(
          (a) => a === InputHash
        );

        if (IsTransactionReadyToCheck) continue;

        const InputsHash = Transactions.Inputs.map(
          (e: any) => e.hash.split(":")[0]
        );

        InputTransactions.push(...InputsHash);
      }
    }

    //Now lets get All the Transaction Info for those hash
    const UniqueTransactionsInputs: string[] = [...new Set(InputTransactions)];

    const LoadTransactionForInputs = await DataQuery.GetTransactionPerHash(
      UniqueTransactionsInputs
    );

    const UniqueInscriptions: string[] = [...new Set(Inscriptions)];

    const LoadAllInscriptionMatched = await DataQuery.LoadMatchedInscriptions(
      UniqueInscriptions
    );

    for (const DoginalsTransactionData of DoginalsTransactions) {
      for (const InputsData of DoginalsTransactionData.Inputs) {
        const InputHashIndex = InputsData.hash.split(":");

        const index = InputHashIndex[1];
        const hash = InputHashIndex[0];

        //Now lets find the transactions

        const IsTransactionFound = LoadTransactionForInputs?.find(
          (a) => a.txId === hash
        );

        if (!IsTransactionFound) throw new Error("Faild to get Transaction");

        const InputDatasValues = IsTransactionFound.outputs.find(
          (a: { hash: string; value: number }) => {
            const InputHashIndexSplited = a.hash.split(":");
            const hashTran = InputHashIndexSplited[0];
            const indexTran = InputHashIndexSplited[1];
            if (
              Number(index) === Number(indexTran) &&
              hashTran.toLowerCase() === hash.toLowerCase()
            ) {
              return a.value;
            }
          }
        );

        if (!InputDatasValues) throw new Error("Input value missmatch found !");

        InputsValueIndex.push({
          value: InputDatasValues.value,
          hash: InputDatasValues.transactionHash,
          index: InputDatasValues.index,
        });
      }

      const InscriptionInputHash = DoginalsTransactionData.Inputs.slice(
        0,
        DoginalsTransactionData.InscriptionPresentIndex
      ).map((e) => {
        return {
          hash: e.hash.split(":")[0],
          index: Number(e.hash.split(":")[1]),
        };
      });

      const InputValues = [];

      for (const IH of InscriptionInputHash) {
        const HashValue = InputsValueIndex.find(
          (a) => a.hash === IH.hash && a.index === IH.index
        );
        if (!HashValue)
          throw new Error(`Output value not for for tx ${IH.hash} `);

        InputValues.push(HashValue.value);
      }

      const SumInputValues = InputValues.reduce((a, b) => a + b, 0) + 1;

      //Now lets see where does the Inscription goes in output

      let newInscriptionIndex;
      let CurrentOutputSum = 0;

      for (const [i, Outputs] of DoginalsTransactionData.outputs.entries()) {
        const OutputValue = Outputs.value;

        if (OutputValue + CurrentOutputSum >= SumInputValues) {
          newInscriptionIndex = i;
          break;
        }
        CurrentOutputSum += OutputValue;
      }

      const InscriptionId =
        DoginalsTransactionData.InscriptionUTXOs.inscribed_id;

      const InscriptionContent = LoadAllInscriptionMatched?.find(
        (a) => a.inscriptionId.toLowerCase() === InscriptionId.toLowerCase()
      )?.content;

      if (!InscriptionContent)
        throw new Error(
          `Content for Inscription: ${InscriptionContent} not found`
        );

      const DecodedContent: DOGEDRC | undefined =
        DecodeJSON(InscriptionContent);

      if (!DecodedContent)
        throw new Error("Decoded Inscribe-Transfer Json problem exist !!!");

      if (newInscriptionIndex) {
        const NewOutput = DoginalsTransactionData.outputs[newInscriptionIndex];

        DoginalsTransfer.push({
          inscriptionData: {
            hash: DoginalsTransactionData.txId,
            block: DoginalsTransactionData.block,
            sender: DoginalsTransactionData.InscriptionUTXOs.address,
            receiver: NewOutput.address,
            inscriptionId:
              DoginalsTransactionData.InscriptionUTXOs.inscribed_id,
            time: DoginalsTransactionData.time,
            index: DoginalsTransactionData.index,
          },
          DRCData: { ...DecodedContent, op: ValidMethods.transfer },
        });
      } else {
        /*If the sum of input is less then output then the
        inscription burned but in case of token it return back to sender. */

        DoginalsTransfer.push({
          inscriptionData: {
            hash: DoginalsTransactionData.txId,
            block: DoginalsTransactionData.block,
            sender: DoginalsTransactionData.InscriptionUTXOs.address,
            receiver: DoginalsTransactionData.InscriptionUTXOs.address,
            inscriptionId:
              DoginalsTransactionData.InscriptionUTXOs.inscribed_id,
            time: DoginalsTransactionData.time,
            index: DoginalsTransactionData.index,
          },
          DRCData: { ...DecodedContent, op: ValidMethods.transfer },
        });
      }
    }
    return DoginalsTransfer;
  } catch (error) {
    throw error;
  }
};

export default InscriptionTransferWorker;

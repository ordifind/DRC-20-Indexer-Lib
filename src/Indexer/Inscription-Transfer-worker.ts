import BalanceQuery from "../Shared/db-lib/conn/Balance-Query";
import DataQuery from "../Shared/db-lib/conn/Data-Query";
import Provider from "../Shared/dogecoin-core";
import Decoder from "../Shared/dogecoin-core/decoder";
import { HOST, PASS, PORT, USER } from "../Shared/indexer-helper/config";
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

const InputsValueIndex: Record<string, number> = {};

const InscriptionContent: Record<string, string> = {};

const MAX_ARRAYCACHE = 80_000;

const DogecoinClient = new Provider({
  user: USER,
  pass: PASS,
  host: HOST,
  port: PORT,
});

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

    const InputHash: string[][] = [[]];
    BlockTransaction?.map((e) => {
      e.Inputs.map((a: TransactionsInput) => {
        const IndexedUsed = a.hash.split(":");
        if (Number(IndexedUsed[1]) !== 0) return;

        if (InputHash[InputHash.length - 1].length <= MAX_ARRAYCACHE) {
          InputHash[InputHash.length - 1].push(IndexedUsed[0]);
        } else {
          InputHash.push([IndexedUsed[0]]);
        }
      });
    });

    //Now lets Find the Transfer Inscription contains input hash

    const ValidTransfers_ = await Promise.all(
      InputHash.map(async (e) => {
        const ValidTransfers_ = (await BalanceQuery.GetMatchInputs(e)) || [];
        return ValidTransfers_?.map((e): InscribedData => {
          return {
            inscribed_id: e.inscribed_id,
            address: e.address,
            index: e.index,
            hash: e.hash,
          };
        });
      })
    );

    const FlatedTransfers = ValidTransfers_.flat(1);

    if (
      ValidTransfers_.filter((a) => a !== undefined).length !== InputHash.length
    ) {
      throw new Error("Faild check all input hashes");
    }

    if (!ValidTransfers_ && !DummyInscribedData.length) return DoginalsTransfer;

    const ValidTransfers = DummyInscribedData.concat(FlatedTransfers);

    const InputTransactions: string[] = [];

    const DoginalsTransactions: DoginalsInputTransaction[] = [];

    const Inscriptions: string[] = [];

    const Inscribe_Transfer = new Set();

    const DoginalsDataWithKey: Record<string, InscribedData> = {};

    ValidTransfers.map((e) => {
      const hash = e.hash;
      const Index = e.index;

      const key = `${hash}:${Index}`;

      Inscribe_Transfer.add(key);

      DoginalsDataWithKey[key] = e;
    });

    for (const Transactions of BlockTransaction) {
      for (const [i, Inputs] of Transactions.Inputs.entries()) {
        const InputWithIndex = Inputs.hash.split(":");
        const InputIndex = InputWithIndex[1];

        const Key = `${InputWithIndex[0]}:${InputIndex}`;

        const IsDoginalsTransfer = Inscribe_Transfer.has(Key);

        if (!IsDoginalsTransfer) continue;

        const DoginalsData = DoginalsDataWithKey[Key];

        DoginalsTransactions.push({
          txId: Transactions.txId,
          Inputs: Transactions.Inputs,
          outputs: Transactions.outputs,
          block: Transactions.block,
          InscriptionPresentIndex: i,
          InscriptionUTXOs: {
            hash: DoginalsData.hash,
            index: 0,
            address: DoginalsData.address,
            inscribed_id: DoginalsData.inscribed_id,
          },
          index: Transactions.transaction.index,
          time: new Date(Transactions.transaction.timestamp).getTime(),
        });

        Inscriptions.push(DoginalsData.inscribed_id);

        const InputsHash = Transactions.Inputs.map(
          (e: any) => e.hash.split(":")[0]
        );

        InputTransactions.push(...InputsHash);
      }
    }

    //Now lets get All the Transaction Info for those hash
    const UniqueTransactionsInputs: string[] = [...new Set(InputTransactions)];

    const LoadTransactionForInputs =
      (await DataQuery.GetTransactionPerHash(UniqueTransactionsInputs)) || [];

    const UniqueInscriptions: string[] = [...new Set(Inscriptions)];

    const LoadAllInscriptionMatched = await DataQuery.LoadMatchedInscriptions(
      UniqueInscriptions
    );

    LoadAllInscriptionMatched?.map((e) => {
      const key = e.inscriptionId;
      const content = e.content;
      InscriptionContent[key] = content;
    });

    //Lets sets Transactionkey

    const InputKey = new Set();
    const InputTransactionsets: Record<string, any> = {};

    LoadTransactionForInputs.map((e) => {
      const txid = e.txId;
      InputKey.add(txid);
      InputTransactionsets[txid] = e;
    });

    for (const DoginalsTransactionData of DoginalsTransactions) {
      for (const InputsData of DoginalsTransactionData.Inputs) {
        const InputHashIndex = InputsData.hash.split(":");

        const index = InputHashIndex[1];
        const hash = InputHashIndex[0];

        //Now lets find the transactions

        let TransactionController;

        const IsTransactionFound = InputKey.has(hash);

        if (!IsTransactionFound) {
          const TransactionFromNode = await DogecoinClient.GetTransaction(hash);

          if (!TransactionFromNode) {
            throw new Error("Faild to get Transaction from Node");
          }

          const DecodedNodeTransaction = Decoder(TransactionFromNode);

          TransactionController = {
            ...DecodedNodeTransaction,
          };
        } else {
          TransactionController = InputTransactionsets[hash];
        }

        const InputDatasValues = TransactionController.outputs.find(
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

        const InputKeyValue: string = `${InputDatasValues.transactionHash}:${InputDatasValues.index}`;

        InputsValueIndex[InputKeyValue] = InputDatasValues.value;
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
        const key = `${IH.hash}:${IH.index}`;
        const HashValue = InputsValueIndex[key];

        if (!HashValue) {
          const OutputFromNode = await DogecoinClient.GetOutputValue(
            IH.hash,
            IH.index
          );
          if (!OutputFromNode)
            throw new Error(`Output value not for for tx ${IH.hash} `);

          OutputFromNode.map((e: any) => {
            const newKey = `${e.hash}:${e.index}`;
            InputsValueIndex[newKey] = e.value;
          });
          const newHashValue = InputsValueIndex[key];
          if (!newHashValue) throw new Error(`Output value mismatched`);
          InputValues.push(newHashValue);
        } else {
          InputValues.push(HashValue);
        }
      }

      const SumInputValues = InputValues.reduce((a, b) => a + b, 0) + 1;

      //Now lets see where does the Inscription goes in output

      let newInscriptionIndex;
      let CurrentOutputSum = 0;

      for (const [i, Outputs] of DoginalsTransactionData.outputs.entries()) {
        const OutputValue = Outputs.value;
        if (OutputValue + CurrentOutputSum > SumInputValues) {
          newInscriptionIndex = i;
          break;
        }
        CurrentOutputSum += OutputValue;
      }

      const InscriptionId =
        DoginalsTransactionData.InscriptionUTXOs.inscribed_id;

      const InscriptionContent_ = InscriptionContent[InscriptionId];

      if (!InscriptionContent_)
        throw new Error(`Content for Inscription: ${InscriptionId} not found`);

      const DecodedContent: DOGEDRC | undefined =
        DecodeJSON(InscriptionContent_);

      if (!DecodedContent)
        throw new Error("Decoded Inscribe-Transfer Json problem exist !!!");

      if (newInscriptionIndex !== undefined) {
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

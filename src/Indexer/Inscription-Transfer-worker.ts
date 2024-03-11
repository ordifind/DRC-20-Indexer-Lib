import BalanceQuery from "../Shared/db-lib/conn/Balance-Query";
import DataQuery from "../Shared/db-lib/conn/Data-Query";
import Provider from "../Shared/dogecoin-core";
import Decoder from "../Shared/dogecoin-core/decoder";
import { HOST, PASS, PORT, USER } from "../Shared/indexer-helper/config";
import {
  DecodeJSON,
  OutputScriptToAddress,
  ReverseHash,
} from "../Shared/indexer-helper/function-helper";
import {
  DOGEDRC,
  Doginals,
  DoginalsInputTransaction,
  InscribedData,
  ValidMethods,
} from "../Shared/indexer-helper/types";

interface TransactionsInput {
  index: number;
  txid: string;
  vin: number;
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
      e.inputs.map((a: TransactionsInput) => {
        const IndexedUsed = ReverseHash(a.txid);
        const vin = a.vin;
        if (vin !== 0) return;

        if (InputHash[InputHash.length - 1].length <= MAX_ARRAYCACHE) {
          InputHash[InputHash.length - 1].push(IndexedUsed);
        } else {
          InputHash.push([IndexedUsed]);
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
      for (const [i, inputs] of Transactions.inputs.entries()) {
        const inputhash = ReverseHash(inputs.txid);
        const vinInput = inputs.vin;

        const Key = `${inputhash}:${vinInput}`;

        const IsDoginalsTransfer = Inscribe_Transfer.has(Key);

        if (!IsDoginalsTransfer) continue;

        const DoginalsData = DoginalsDataWithKey[Key];

        DoginalsTransactions.push({
          txid: Transactions.txid,
          inputs: Transactions.inputs,
          outputs: Transactions.outputs,
          blockNumber: Transactions.blockNumber,
          InscriptionPresentIndex: i,
          InscriptionUTXOs: {
            hash: DoginalsData.hash,
            index: 0,
            address: DoginalsData.address,
            inscribed_id: DoginalsData.inscribed_id,
          },
          index: Transactions.index,
          time: Transactions.time,
          coinbase: Transactions.coinbase,
        });

        Inscriptions.push(DoginalsData.inscribed_id);

        const InputsHash = Transactions.inputs.map((e: any) =>
          ReverseHash(e.txid)
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
      const key = e.id;
      const content = e.inscription.data;
      InscriptionContent[key] = content;
    });

    //Lets sets Transactionkey

    const InputKey = new Set();
    const InputTransactionsets: Record<string, any> = {};

    LoadTransactionForInputs.map((e) => {
      const txid = e.txid;
      InputKey.add(txid);
      InputTransactionsets[txid] = e;
    });

    for (const DoginalsTransactionData of DoginalsTransactions) {
      if (DoginalsTransactionData.coinbase) continue;

      for (const InputsData of DoginalsTransactionData.inputs) {
        const hash = ReverseHash(InputsData.txid);
        const Index = InputsData.index;
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
          (a: { amount: number; index: number }) => {
            if (Number(Index) === Number(a.index)) {
              return a.amount;
            }
          }
        );

        const InputKeyValue: string = `${hash}:${InputDatasValues.index}`;

        InputsValueIndex[InputKeyValue] = InputDatasValues.amount;
      }

      const InscriptionInputHash = DoginalsTransactionData.inputs
        .slice(0, DoginalsTransactionData.InscriptionPresentIndex)
        .map((e) => {
          return {
            hash: ReverseHash(e.txid),
            index: Number(e.index),
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
        const OutputValue = Outputs.amount;
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
            hash: DoginalsTransactionData.txid,
            block: DoginalsTransactionData.blockNumber,
            sender: DoginalsTransactionData.InscriptionUTXOs.address,
            receiver: OutputScriptToAddress(NewOutput.script),
            inscriptionId:
              DoginalsTransactionData.InscriptionUTXOs.inscribed_id,
            time: DoginalsTransactionData.time,
            index: DoginalsTransactionData.index,
            location: `${DoginalsTransactionData.txid}:${newInscriptionIndex}`,
          },
          DRCData: { ...DecodedContent, op: ValidMethods.transfer },
        });
      } else {
        /*If the sum of input is less then output then the
        inscription burned but in case of token it return back to sender. */

        DoginalsTransfer.push({
          inscriptionData: {
            hash: DoginalsTransactionData.txid,
            block: DoginalsTransactionData.blockNumber,
            sender: DoginalsTransactionData.InscriptionUTXOs.address,
            receiver: DoginalsTransactionData.InscriptionUTXOs.address,
            inscriptionId:
              DoginalsTransactionData.InscriptionUTXOs.inscribed_id,
            time: DoginalsTransactionData.time,
            index: DoginalsTransactionData.index,
            location: `${DoginalsTransactionData.txid}:${newInscriptionIndex}`,
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

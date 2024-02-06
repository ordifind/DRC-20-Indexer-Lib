import DataQuery from "../Shared/db-lib/conn/Data-Query";
import { Doginals, ValidMethods } from "../Shared/indexer-helper/types";

interface TransactionsInput {
  index: number;
  hash: string;
}

const InscriptionTransferWorker = async (
  SameBlockDoginalsData: Doginals[],
  BlocksToIndex: number[]
) => {
  try {
    const Inscribe_Transfer_Data = SameBlockDoginalsData.filter(
      (a) => a.DRCData.op === ValidMethods.inscribe_transfer
    );

    //Lets Load All BlockTransaction

    const BlockTransaction = await DataQuery.LoadTransactions(BlocksToIndex);

    //Now lets gather all the Input TX used in these Transactions

    const InputHash: string[] = [];
    BlockTransaction?.map((e) => {
      e.Inputs.map((a: TransactionsInput) => {
        const IndexedUsed = a.hash.split(":")[1];
        if (Number(IndexedUsed) !== 0) return;
        InputHash.push(a.hash.replaceAll(":0", ""));
      });
    });

    console.log(Inscribe_Transfer_Data);
  } catch (error) {
    throw error;
  }
};

export default InscriptionTransferWorker;

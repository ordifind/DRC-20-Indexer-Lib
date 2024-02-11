import {
  DecodeJSON,
  ValidatePayloads,
} from "../Shared/indexer-helper/function-helper";
import { DOGEDRC, Doginals } from "../Shared/indexer-helper/types";
import InscriptionTransferWorker from "./Inscription-Transfer-worker";

const InscriptionsWorker = async (
  data: any[],
  BlocksToIndex: number[]
): Promise<Doginals[]> => {
  const ValidDoginals: Doginals[] = [];

  for (const Inscription of data) {
    const { inscriptionId, time, txid, block, content, Outputs, index } =
      Inscription;

    const DecodedInscriptionData: DOGEDRC | undefined = DecodeJSON(content);

    if (!DecodedInscriptionData) continue;

    const IsValidPayload = ValidatePayloads(DecodedInscriptionData);

    if (!IsValidPayload) continue;

    const Address: string = Outputs.sort(
      (a: any, b: any) => a.value - b.value
    )[0]?.address;

    ValidDoginals.push({
      inscriptionData: {
        inscriptionId: inscriptionId,
        sender: Address,
        index: index,
        block: block,
        time: time,
        hash: txid,
      },
      DRCData: DecodedInscriptionData,
    });
  }

  const TransferDoginals = await InscriptionTransferWorker(
    ValidDoginals,
    BlocksToIndex
  );

  const DoginalsIncludesTransfer = TransferDoginals.concat(ValidDoginals);

  //Now lets sort them based in Index and Block

  const DoginalsDataSorted = DoginalsIncludesTransfer.sort((a, b) => {
    if (a.inscriptionData.block !== b.inscriptionData.block) {
      return a.inscriptionData.block - b.inscriptionData.block;
    } else {
      return a.inscriptionData.index - b.inscriptionData.index;
    }
  });

  return DoginalsDataSorted;
};
export default InscriptionsWorker;

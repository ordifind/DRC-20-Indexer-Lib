import {
  DecodeJSON,
  ExtractOtherDoginals,
  ValidatePayloads,
} from "../Shared/indexer-helper/function-helper";
import {
  DOGEDRC,
  Doginals,
  OtherDoginalsBox,
} from "../Shared/indexer-helper/types";
import InscriptionTransferWorker from "./Inscription-Transfer-worker";

const InscriptionsWorker = async (
  data: any[],
  BlocksToIndex: number[]
): Promise<{ DRC20: Doginals[]; OtherDoginals: OtherDoginalsBox[] }> => {
  const ValidDoginals: Doginals[] = [];
  const OtherDoginals: OtherDoginalsBox[] = [];

  for (const Inscriptions of data) {
    const { id, time, txid, block, inscription, location, index, minter } =
      Inscriptions;

    const Address: string = minter;

    const OtherDoginalsContent = ExtractOtherDoginals(inscription.data);

    if (OtherDoginalsContent) {
      OtherDoginals.push({
        inscriptionData: {
          inscriptionId: id,
          sender: Address,
          index: index,
          block: block,
          time: time,
          hash: txid,
          location: location,
        },
        doginal: OtherDoginalsContent,
      });
      continue;
    }

    const DecodedInscriptionData: DOGEDRC | undefined = DecodeJSON(
      inscription.data
    );

    if (!DecodedInscriptionData) continue;

    const IsValidPayload = ValidatePayloads(DecodedInscriptionData);

    if (!IsValidPayload) continue;

    ValidDoginals.push({
      inscriptionData: {
        inscriptionId: id,
        sender: Address,
        index: index,
        block: block,
        time: time,
        hash: txid,
        location: location,
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

  const OtherDoginalsStored = OtherDoginals.sort((a, b) => {
    if (a.inscriptionData.block !== b.inscriptionData.block) {
      return a.inscriptionData.block - b.inscriptionData.block;
    } else {
      return a.inscriptionData.index - b.inscriptionData.index;
    }
  });

  return { DRC20: DoginalsDataSorted, OtherDoginals: OtherDoginalsStored };
};
export default InscriptionsWorker;

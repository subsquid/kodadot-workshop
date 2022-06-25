import { ExtrinsicHandlerContext, Store } from "@subsquid/substrate-processor";
import { Interaction } from "./model";

const PREFIXES = ["0x726d726b", "0x524d524b", "rmrk", "RMRK"];

const startsWithRemark = (
  value: string,
  prefixes: string[] = PREFIXES
): boolean =>
  prefixes.length < 1 || prefixes.some((word) => value.startsWith(word));

export interface RemarkResult extends BaseCall {
  value: string;
  //   extra?: ExtraCall[];
}

interface BaseCall {
  caller: string;
  blockNumber: string;
  timestamp: Date;
}

function toRemarkResult(value: string, base: BaseCall): RemarkResult {
  return {
    value,
    ...base,
  };
}
function toBaseCall(context: ExtrinsicHandlerContext): BaseCall {
  const caller = context.extrinsic.signer.toString();
  const blockNumber = context.block.height.toString();
  const timestamp = new Date(context.block.timestamp);

  return { caller, blockNumber, timestamp };
}

export function extractRemark(
  processed: string,
  extrinsic: ExtrinsicHandlerContext
): RemarkResult[] {
  if (startsWithRemark(processed)) {
    return [toRemarkResult(processed, toBaseCall(extrinsic))];
  }

  return [];
}

// async function mainFrame(records: Records, context: ExtrinsicHandlerContext): Promise<void> {
//     for (const remark of records) {
//       try {
//         const decoded = hexToString(remark.value)
//         const event: RmrkEvent = getAction(decoded)
//         logger.pending(`[${remark.blockNumber}] Event ${event} `)

//         switch (event) {
//           case RmrkEvent.MINT:
//             await mint(remark, context)
//             break
//           case RmrkEvent.MINTNFT:
//             await mintNFT(remark, context)
//             break
//           case RmrkEvent.SEND:
//             await send(remark, context)
//             break
//           case RmrkEvent.BUY:
//             await buy(remark, context)
//             break
//           case RmrkEvent.CONSUME:
//             await consume(remark, context)
//             break
//           case RmrkEvent.LIST:
//             await list(remark, context)
//             break
//           case RmrkEvent.CHANGEISSUER:
//             await changeIssuer(remark, context)
//             break
//           case RmrkEvent.EMOTE:
//             await emote(remark, context)
//             break
//           default:
//             logger.error(
//               `[SKIP] ${event}::${remark.value}::${remark.blockNumber}`
//             )
//         }
//         await updateCache(remark.timestamp,context.store)
//       } catch (e) {
//         logger.warn(
//           `[MALFORMED] ${remark.blockNumber}::${hexToString(remark.value)}`
//         )
//       }
//     }
//   }

export function isHex(text: string) {
  return text.startsWith("0x");
}

export function hexToString(text: string) {
  return isHex(text)
    ? Buffer.from(text.replace(/^0x/, ""), "hex").toString()
    : text;
}

export function getAction(rmrkString: string): Interaction {
  if (RmrkActionRegex.MINT.test(rmrkString)) {
    return Interaction.MINT;
  }

  if (RmrkActionRegex.MINTNFT.test(rmrkString)) {
    return Interaction.MINTNFT;
  }

  if (RmrkActionRegex.SEND.test(rmrkString)) {
    return Interaction.SEND;
  }

  if (RmrkActionRegex.BUY.test(rmrkString)) {
    return Interaction.BUY;
  }

  if (RmrkActionRegex.CONSUME.test(rmrkString)) {
    return Interaction.CONSUME;
  }

  if (RmrkActionRegex.CHANGEISSUER.test(rmrkString)) {
    return Interaction.CHANGEISSUER;
  }

  if (RmrkActionRegex.LIST.test(rmrkString)) {
    return Interaction.LIST;
  }

  if (RmrkActionRegex.EMOTE.test(rmrkString)) {
    return Interaction.EMOTE;
  }

  throw new EvalError(`[NFTUtils] Unable to get action from ${rmrkString}`);
}

export class RmrkActionRegex {
  static MINTNFT = /^[rR][mM][rR][kK]::MINTNFT::/;
  static MINT = /^[rR][mM][rR][kK]::MINT::/;
  static SEND = /^[rR][mM][rR][kK]::SEND::/;
  static BUY = /^[rR][mM][rR][kK]::BUY::/;
  static CONSUME = /^[rR][mM][rR][kK]::CONSUME::/;
  static CHANGEISSUER = /^[rR][mM][rR][kK]::CHANGEISSUER::/;
  static LIST = /^[rR][mM][rR][kK]::LIST::/;
  static EMOTE = /^[rR][mM][rR][kK]::EMOTE::/;
}

async function getOrCreate<T extends { id: string }>(
  store: Store,
  EntityConstructor: EntityConstructor<T>,
  id: string
): Promise<T> {
  let entity = await store.get<T>(EntityConstructor, {
    where: { id },
  });

  if (entity == null) {
    entity = new EntityConstructor();
    entity.id = id;
  }

  return entity;
}

type EntityConstructor<T> = {
  new (...args: any[]): T;
};

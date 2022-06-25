import {
  ExtrinsicHandlerContext,
  Store,
  SubstrateProcessor,
} from "@subsquid/substrate-processor";
import { lookupArchive } from "@subsquid/archive-registry";
import { SystemRemarkCall } from "./types/calls";
import { extractRemark, getAction, hexToString } from "./utils";
import { Interaction } from "./model";

const processor = new SubstrateProcessor("kusama_remark");
processor.setBlockRange({from:5756453});

processor.setBatchSize(500);
processor.setDataSource({
  archive: lookupArchive("kusama")[0].url,
  chain: "wss://kusama-rpc.polkadot.io",
});

processor.addExtrinsicHandler("system.remark", handleRemark);

processor.run();

async function handleRemark(ctx: ExtrinsicHandlerContext): Promise<void>{
  const remark = new SystemRemarkCall(ctx).asV1020.remark
  const records = extractRemark(remark.toString(), ctx)
  for (const remark of records) {
    try {
      const decoded = hexToString(remark.value)
      const event_type: Interaction = getAction(decoded)

      if (event_type == Interaction.MINTNFT) {
        let nft: NFT | null = null
        try {
          nft = NFTUtils.unwrap(remark.value) as NFT
          canOrElseError<string>(exists, nft.collection, true)
          const collection = ensure<CollectionEntity>(
            await get<CollectionEntity>(store, CollectionEntity, nft.collection)
          )
          canOrElseError<CollectionEntity>(exists, collection, true)
          isOwnerOrElseError(collection, remark.caller)
          const final = create<NFTEntity>(NFTEntity, collection.id, {})
          const id = getNftId(nft, remark.blockNumber)
          final.id = id
          final.hash = md5(id)
          final.issuer = remark.caller
          final.currentOwner = remark.caller
          final.blockNumber = BigInt(remark.blockNumber)
          final.name = nft.name
          final.instance = nft.instance
          final.transferable = nft.transferable
          final.collection = collection
          final.sn = nft.sn
          final.metadata = nft.metadata
          final.price = BigInt(0)
          final.burned = false
          final.createdAt = remark.timestamp
          final.updatedAt = remark.timestamp

          const metadata = await handleMetadata(final.metadata, final.name, store)
          final.meta = metadata

          console.log(`[MINT] ${final.id}`);
          await ctx.store.save(final)
          await createEvent(final, RmrkEvent.MINTNFT, remark, '', ctx.store)

        } catch (e) {
          console.log(`[MINT] ${e.message}, ${JSON.stringify(nft)}`)
          // await logFail(JSON.stringify(nft), e.message, RmrkEvent.MINTNFT)
        }
      }
    } catch (e) {
      logger.warn(
        `[MALFORMED] ${remark.blockNumber}::${hexToString(remark.value)}`
      )
    }
  }
}

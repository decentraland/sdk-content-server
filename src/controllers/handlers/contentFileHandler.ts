import { IHttpServerComponent } from "@well-known-components/interfaces"
import { IPFSv2 } from "@dcl/schemas"
import { HandlerContextWithPath } from "../../types"
import { ContentItem } from "@dcl/catalyst-storage"

function contentItemHeaders(content: ContentItem, hashId: string) {
  const ret: Record<string, string> = {
    "Content-Type": "application/octet-stream",
    ETag: JSON.stringify(hashId), // by spec, the ETag must be a double-quoted string
    "Access-Control-Expose-Headers": "ETag",
    "Cache-Control": "public,max-age=31536000,s-maxage=31536000,immutable",
  }
  if (content.encoding) {
    ret["Content-Encoding"] = content.encoding
  }
  if (content.size) {
    ret["Content-Length"] = content.size.toString()
  }
  return ret
}

export async function getContentFile(
  ctx: HandlerContextWithPath<"storage", "/content/contents/:hashId">
): Promise<IHttpServerComponent.IResponse> {
  if (!IPFSv2.validate(ctx.params.hashId)) return { status: 400 }

  const file = await ctx.components.storage.retrieve(ctx.params.hashId)

  if (!file) return { status: 404 }

  return { status: 200, headers: contentItemHeaders(file, ctx.params.hashId), body: await file.asRawStream() }
}

export async function headContentFile(
  ctx: HandlerContextWithPath<"storage", "/content/contents/:hashId">
): Promise<IHttpServerComponent.IResponse> {
  if (!IPFSv2.validate(ctx.params.hashId)) return { status: 400 }

  const file = await ctx.components.storage.retrieve(ctx.params.hashId)

  if (!file) return { status: 404 }

  return { status: 200, headers: contentItemHeaders(file, ctx.params.hashId) }
}

export async function availableContentHandler(
  ctx: HandlerContextWithPath<"storage", "/content/available-content">
): Promise<IHttpServerComponent.IResponse> {
  const params = new URLSearchParams(ctx.url.search)
  const cids = params.getAll("cid")

  const results = Array.from((await ctx.components.storage.existMultiple(cids)).entries())

  return {
    status: 200,
    body: results.map(([cid, available]) => ({
      cid,
      available,
    })),
  }
}

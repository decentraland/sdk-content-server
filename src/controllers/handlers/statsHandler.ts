import { HandlerContextWithPath } from "../../types"
import { S3 } from "aws-sdk";

export async function statsHandler({ components: { config } }: Pick<HandlerContextWithPath<"config", "/stats">, "components" | "params" | "url">) {
  const region = await config.requireString("AWS_REGION");
  const s3 = new S3({ region })
  const params: S3.Types.ListObjectsV2Request = {
    Bucket: 'orco-backups',
    ContinuationToken: undefined
  };

  const objects = []
  let fetched: S3.ListObjectsV2Output
  do {
    fetched = await s3.listObjectsV2(params).promise()
    objects.push(...fetched.Contents!)
    params.ContinuationToken = fetched.NextContinuationToken
  } while (fetched.IsTruncated)

  let keys = objects
      .map(o => o.Key!)
      .filter(o => o.endsWith('.dcl.eth'));

  return {
    status: 200,
    body: keys,
  }
}

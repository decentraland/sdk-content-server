# SDK Content Server

This is the simplest content server API needed to deploy and retrieve scenes.

It uses the `@dcl/catalyst-storage` library to store the deployments directly on the disk or S3.

# Deploying entities to this server

The deployments accepted by this server only run one validation: Allowlist of signer address.

The validations are performed against https://config.decentraland.org/allowed-pushers-px.json, this can be easily configured in the file [src/logic/fetch-allowed-addresses.ts](src/logic/fetch-allowed-addresses.ts)

Besides the schema and hashing validity of the entities, no other ownership or file size checks are performed.

## Deploying using the CLI tool

Once your signer address is added to the allow-list, then you should be able to deploy to this server. The recommended approach is by the CLI tool. You must specify the URL of this server as `--content-server` to make it work, like this:

```bash
# cd into your scene
cd my-scene

# then deploy
export DCL_PRIVATE_KEY=0x....
dcl deploy --target-content https://sdk-content-server.decentraland.org
```

Upon successful deployment, the latest version of the CLI should print some helpful information about how to preview the scene along with the addressable URN of the deployment.

### Addressable URN

A deployment in Decentraland can live anywhere as long as it complies with the format. To consistently identify deployments and their location in servers, the concept of addressable URN is introduced.

Let a valid deployment URN be:
```
urn:decentraland:entity:bafkreihpipyhrt75xyquwrynrtjadwb373xfosy7a5rhlh5vogjajye3im
```

That deployment will be downloaded from the configured content server by default. But for testing purposes, the content servers are not always the most straight forward way to test. To help the operations, a baseUrl query parameter can be added: `?baseUrl=https://sdk-content-server.decentraland.org/ipfs/` yielding a full URN like this:

```
urn:decentraland:entity:bafkreihpipyhrt75xyquwrynrtjadwb373xfosy7a5rhlh5vogjajye3im?baseUrl=https://sdk-content-server.decentraland.org/ipfs/
```

Now the explorers know where to look for when downloading that entity, bypassing the content servers. Or more precisely, pointing to this server which acts as content server.

# Using Addressable URNs

As of the moment of writing this document, there are two ways to use the addressable URNs: as global portable experiences and as single scene instead of loading the genesis city.

The first one is used to generate experiences for all users, like the pride event calendar. It can be tested by adding the `GLOBAL_PX=<urn>` query parameter to the explorer. Like this https://play.decentraland.zone/?GLOBAL_PX=urn:decentraland:entity:bafkreihpipyhrt75xyquwrynrtjadwb373xfosy7a5rhlh5vogjajye3im?baseUrl=https://sdk-content-server.decentraland.org/ipfs/

The second use case is to load a singular scene instead of the full genesis city. Likewise, it is done via adding a `SPACE=<urn>` query parameter, like this: https://play.decentraland.zone/?SPACE=urn:decentraland:entity:bafkreihpipyhrt75xyquwrynrtjadwb373xfosy7a5rhlh5vogjajye3im?baseUrl=https://sdk-content-server.decentraland.org/ipfs/

Portable experiences and single scenes (spaces) can be used at the same time to generate dynamic experiences.

These flows are designed to improve the user experience in the areas like onboarding experiences, helper calendars for events, and for debugging purposes among others.
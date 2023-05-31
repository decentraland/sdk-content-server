import { createWorldsIndexerComponent } from '../../src/adapters/worlds-indexer'
import { createLogComponent } from '@well-known-components/logger'
import { IConfigComponent } from '@well-known-components/interfaces'
import { createConfigComponent } from '@well-known-components/env-config-provider'
import { createInMemoryStorage } from '@dcl/catalyst-storage'
import { createWorldsManagerComponent } from '../../src/adapters/worlds-manager'
import { bufferToStream, streamToBuffer } from '@dcl/catalyst-storage/dist/content-item'
import { stringToUtf8Bytes } from 'eth-connect'
import { WorldData } from '../../src/types'

describe('All data from worlds', function () {
  let config: IConfigComponent
  let logs
  let storage
  let worldsManager
  let worldsIndexer

  beforeEach(async () => {
    config = await createConfigComponent({})
    logs = await createLogComponent({ config })
    storage = await createInMemoryStorage()
    worldsManager = await createWorldsManagerComponent({ logs, storage })
    worldsIndexer = await createWorldsIndexerComponent({
      logs,
      storage,
      worldsManager
    })
  })

  it('creates an index of all the data from all the worlds deployed in the server', async () => {
    await storage.storeStream(
      'name-world-name.dcl.eth',
      bufferToStream(
        Buffer.from(
          stringToUtf8Bytes(JSON.stringify({ entityId: 'bafkreielwj3ki46munydwn4ayazdvmjln76khmz2xyaf5v6dkmo6yoebbi' }))
        )
      )
    )
    await storage.storeStream(
      'name-another-world-name.dcl.eth',
      bufferToStream(
        Buffer.from(
          stringToUtf8Bytes(JSON.stringify({ entityId: 'bafkreic6ix3pdwf7g24reg4ktlyjpmtbqbc2nq4zocupkmul37am4vlt6y' }))
        )
      )
    )
    await storage.storeStream(
      'name-missing-world-name.dcl.eth',
      bufferToStream(Buffer.from(stringToUtf8Bytes(JSON.stringify({ acl: [] }))))
    )
    await storage.storeStream(
      'bafkreielwj3ki46munydwn4ayazdvmjln76khmz2xyaf5v6dkmo6yoebbi',
      bufferToStream(
        Buffer.from(
          stringToUtf8Bytes(
            '{"version":"v3","type":"scene","pointers":["20,24"],"timestamp":1683909215429,"content":[{"file":"0ee02d9e-7d23-42d9-a0c9-e1394ac0a98a/FloorBaseSand_01/FloorBaseSand_01.glb","hash":"bafkreieklxug2qtq25c3iwhrgtmp7fr6mmluuhzsru3f4xpl7h7rtadahy"},{"file":"0ee02d9e-7d23-42d9-a0c9-e1394ac0a98a/FloorBaseSand_01/Floor_Sand01.png.001.png","hash":"bafkreiflckzgpjcirb2hprlbrhtaalci3saxrph5jtg27bwh5mko5y2u5u"},{"file":"0ee02d9e-7d23-42d9-a0c9-e1394ac0a98a/FloorBaseSand_01/thumbnail.png","hash":"bafkreible6vy32awvf4baxzmvkg23fhztayxfdg5jg4cielcytu6pdnq4u"},{"file":"390b876e-4b3a-4e78-bd03-5be21b1ecc67/WaterPatchFull_01/PiratesPack_TX.png.png","hash":"bafkreibtlcu5xu4u7qloyhi6s36e722qu7y7ths2xaspwqgqynpnl5aukq"},{"file":"390b876e-4b3a-4e78-bd03-5be21b1ecc67/WaterPatchFull_01/WaterPatchFull_01.glb","hash":"bafkreiek2guc7hc3jqiiemotaikiynfuoff3bsc625xtqh7dq5ohy6eei4"},{"file":"390b876e-4b3a-4e78-bd03-5be21b1ecc67/WaterPatchFull_01/thumbnail.png","hash":"bafkreigm3ap3bnkuqfuince27foke6u4bw3hyrqusl7evutcdibh7tzfke"},{"file":"60e6cab6-ad1b-460e-875a-8c55bc8f3892/RockBig_03/PiratesPack_TX.png.png","hash":"bafkreibtlcu5xu4u7qloyhi6s36e722qu7y7ths2xaspwqgqynpnl5aukq"},{"file":"60e6cab6-ad1b-460e-875a-8c55bc8f3892/RockBig_03/RockBig_03.glb","hash":"bafkreiblvcmkynigyhhxfe3mbaaimxubktwad4wlxjalhqtg5hqbx4g6ya"},{"file":"60e6cab6-ad1b-460e-875a-8c55bc8f3892/RockBig_03/thumbnail.png","hash":"bafkreigrit52si3j5hvdxpffqwuch3tgkizgm3ahhrh4u55iwnje744nxy"},{"file":"6922eea0-67a6-4559-917c-df33aa1d9954/Bamboo_01/Bamboo_01.glb","hash":"bafkreihmrdfpkn7inikjujuidhdzuflwlureqm5pmzfquky5vsa6dyrbay"},{"file":"6922eea0-67a6-4559-917c-df33aa1d9954/Bamboo_01/PiratesPack_TX.png.png","hash":"bafkreibtlcu5xu4u7qloyhi6s36e722qu7y7ths2xaspwqgqynpnl5aukq"},{"file":"6922eea0-67a6-4559-917c-df33aa1d9954/Bamboo_01/thumbnail.png","hash":"bafkreiegcthjclfo3lzcgqrbnhokfvyqa662hpum3nh6tvhe6jcwzcdcie"},{"file":"75f2ea4e-e061-4627-ae43-9460aa106066/WaterPatchCurve_02/PiratesPack_TX.png","hash":"bafkreidzr6ankbumaiw5clcony5vsygkvycv4whxeorjgcc4ixcmg4w6py"},{"file":"75f2ea4e-e061-4627-ae43-9460aa106066/WaterPatchCurve_02/WaterPatchCurve_02.glb","hash":"bafkreiezwmpkinrtbzgglxuowddzh5eflrdw2jo6vngtt3s7tzijynbkbq"},{"file":"75f2ea4e-e061-4627-ae43-9460aa106066/WaterPatchCurve_02/thumbnail.png","hash":"bafkreidpt2ss6szjbug4zdrqesim3cweet6kcwjndmwz44bcg4jbwmhhoe"},{"file":"bin/game.js","hash":"bafkreicamuc5d73gwl7nefr5jofj4hxm3u7cuy5k3abo26j5cw7tkdorn4"},{"file":"bin/game.js.lib","hash":"bafkreihrd4gdem2o2hgkw4u2xnf5pxagubpluu5p6dqbf7hyyyhwwsvvhe"},{"file":"black_image.png","hash":"bafkreidduubi76bntd27dewz4cvextrfl3qyd4td6mtztuisxi26q64dnq"},{"file":"builder.json","hash":"bafkreid2e3o3utgi54u3xtsj7ome6oxwhcqm7nyjzvt7fcmeumesai7mhu"},{"file":"materials/sky-photo-beautiful-sunset.jpg","hash":"bafybeiahb23pt7sj3ksureogcoagrjs74k6a22wfhwkw562wmva34jkvoy"},{"file":"scene-thumbnail.png","hash":"bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku"},{"file":"scene.json","hash":"bafkreigs7nswgu75awhxi4wqgztzylkx4h7rzpwihgcsjoxh7qblnlpejy"},{"file":"scene.json.catalyst","hash":"bafkreie3crrqqgiho7mxt5zqypevjrlqxpzka77vqxtbvctcgruwzr4ouq"},{"file":"scene.json.worlds","hash":"bafkreicblzdoz5zq4bnnbyoe5a2ff456cfgxjqkkys3p2tori5byct7a7q"}],"metadata":{"display":{"title":"Mi propia escena","description":"Mi lugar en el mundo","favicon":"favicon_asset","navmapThumbnail":"scene-thumbnail.png"},"owner":"","contact":{"name":"Po","email":""},"main":"bin/game.js","tags":[],"worldConfiguration":{"name":"world-name.dcl.eth","miniMapConfig":{"visible":false,"dataImage":"black_image.png","estateImage":"black_image.png"},"skyboxConfig":{"fixedHour":36000,"textures":["black_image.png"]}},"source":{"version":1,"origin":"builder","projectId":"70bbe5e9-460c-4d1b-bb9f-7597e71747df","point":{"x":0,"y":0},"rotation":"east","layout":{"rows":1,"cols":1}},"scene":{"base":"20,24","parcels":["20,24"]}}}'
          )
        )
      )
    )
    await storage.storeStream(
      'bafkreic6ix3pdwf7g24reg4ktlyjpmtbqbc2nq4zocupkmul37am4vlt6y',
      bufferToStream(
        Buffer.from(
          stringToUtf8Bytes(
            '{"version":"v3","type":"scene","pointers":["20,24"],"timestamp":1684263239610,"content":[{"file":"0ee02d9e-7d23-42d9-a0c9-e1394ac0a98a/FloorBaseSand_01/FloorBaseSand_01.glb","hash":"bafkreieklxug2qtq25c3iwhrgtmp7fr6mmluuhzsru3f4xpl7h7rtadahy"},{"file":"0ee02d9e-7d23-42d9-a0c9-e1394ac0a98a/FloorBaseSand_01/Floor_Sand01.png.001.png","hash":"bafkreiflckzgpjcirb2hprlbrhtaalci3saxrph5jtg27bwh5mko5y2u5u"},{"file":"0ee02d9e-7d23-42d9-a0c9-e1394ac0a98a/FloorBaseSand_01/thumbnail.png","hash":"bafkreible6vy32awvf4baxzmvkg23fhztayxfdg5jg4cielcytu6pdnq4u"},{"file":"390b876e-4b3a-4e78-bd03-5be21b1ecc67/WaterPatchFull_01/PiratesPack_TX.png.png","hash":"bafkreibtlcu5xu4u7qloyhi6s36e722qu7y7ths2xaspwqgqynpnl5aukq"},{"file":"390b876e-4b3a-4e78-bd03-5be21b1ecc67/WaterPatchFull_01/WaterPatchFull_01.glb","hash":"bafkreiek2guc7hc3jqiiemotaikiynfuoff3bsc625xtqh7dq5ohy6eei4"},{"file":"390b876e-4b3a-4e78-bd03-5be21b1ecc67/WaterPatchFull_01/thumbnail.png","hash":"bafkreigm3ap3bnkuqfuince27foke6u4bw3hyrqusl7evutcdibh7tzfke"},{"file":"60e6cab6-ad1b-460e-875a-8c55bc8f3892/RockBig_03/PiratesPack_TX.png.png","hash":"bafkreibtlcu5xu4u7qloyhi6s36e722qu7y7ths2xaspwqgqynpnl5aukq"},{"file":"60e6cab6-ad1b-460e-875a-8c55bc8f3892/RockBig_03/RockBig_03.glb","hash":"bafkreiblvcmkynigyhhxfe3mbaaimxubktwad4wlxjalhqtg5hqbx4g6ya"},{"file":"60e6cab6-ad1b-460e-875a-8c55bc8f3892/RockBig_03/thumbnail.png","hash":"bafkreigrit52si3j5hvdxpffqwuch3tgkizgm3ahhrh4u55iwnje744nxy"},{"file":"6922eea0-67a6-4559-917c-df33aa1d9954/Bamboo_01/Bamboo_01.glb","hash":"bafkreihmrdfpkn7inikjujuidhdzuflwlureqm5pmzfquky5vsa6dyrbay"},{"file":"6922eea0-67a6-4559-917c-df33aa1d9954/Bamboo_01/PiratesPack_TX.png.png","hash":"bafkreibtlcu5xu4u7qloyhi6s36e722qu7y7ths2xaspwqgqynpnl5aukq"},{"file":"6922eea0-67a6-4559-917c-df33aa1d9954/Bamboo_01/thumbnail.png","hash":"bafkreiegcthjclfo3lzcgqrbnhokfvyqa662hpum3nh6tvhe6jcwzcdcie"},{"file":"75f2ea4e-e061-4627-ae43-9460aa106066/WaterPatchCurve_02/PiratesPack_TX.png","hash":"bafkreidzr6ankbumaiw5clcony5vsygkvycv4whxeorjgcc4ixcmg4w6py"},{"file":"75f2ea4e-e061-4627-ae43-9460aa106066/WaterPatchCurve_02/WaterPatchCurve_02.glb","hash":"bafkreiezwmpkinrtbzgglxuowddzh5eflrdw2jo6vngtt3s7tzijynbkbq"},{"file":"75f2ea4e-e061-4627-ae43-9460aa106066/WaterPatchCurve_02/thumbnail.png","hash":"bafkreidpt2ss6szjbug4zdrqesim3cweet6kcwjndmwz44bcg4jbwmhhoe"},{"file":"bin/game.js","hash":"bafkreicamuc5d73gwl7nefr5jofj4hxm3u7cuy5k3abo26j5cw7tkdorn4"},{"file":"bin/game.js.lib","hash":"bafkreihrd4gdem2o2hgkw4u2xnf5pxagubpluu5p6dqbf7hyyyhwwsvvhe"},{"file":"black_image.png","hash":"bafkreidduubi76bntd27dewz4cvextrfl3qyd4td6mtztuisxi26q64dnq"},{"file":"builder.json","hash":"bafkreid2e3o3utgi54u3xtsj7ome6oxwhcqm7nyjzvt7fcmeumesai7mhu"},{"file":"materials/sky-photo-beautiful-sunset.jpg","hash":"bafybeiahb23pt7sj3ksureogcoagrjs74k6a22wfhwkw562wmva34jkvoy"},{"file":"scene-thumbnail.png","hash":"bafkreidduubi76bntd27dewz4cvextrfl3qyd4td6mtztuisxi26q64dnq"},{"file":"scene.json","hash":"bafkreihyku6f2fwyhbssqrnrfgcrcnh5xeimfjmeiaenbnjytvfxufqq7a"},{"file":"scene.json.catalyst","hash":"bafkreie3crrqqgiho7mxt5zqypevjrlqxpzka77vqxtbvctcgruwzr4ouq"},{"file":"scene.json.worlds","hash":"bafkreifr55tstlkvv5jmphoe67x4rnqfrw5abki7ca3tmlfclzzxl6zi6q"}],"metadata":{"display":{"title":"Mi propia escena","description":"Mi lugar en el mundo","favicon":"favicon_asset","navmapThumbnail":"scene-thumbnail.png"},"owner":"","contact":{"name":"Po","email":""},"main":"bin/game.js","tags":[],"worldConfiguration":{"name":"another-world-name.dcl.eth","miniMapConfig":{"visible":false,"dataImage":"black_image.png","estateImage":"black_image.png"},"skyboxConfig":{"fixedHour":36000,"textures":["black_image.png"]},"placesConfig":{"optOut":true}},"source":{"version":1,"origin":"builder","projectId":"70bbe5e9-460c-4d1b-bb9f-7597e71747df","point":{"x":0,"y":0},"rotation":"east","layout":{"rows":1,"cols":1}},"scene":{"base":"20,24","parcels":["20,24"]}}}'
          )
        )
      )
    )

    await worldsIndexer.getIndex()

    expect(storage.exist('global-index.json')).toBeTruthy()

    const content = await storage.retrieve('global-index.json')
    const stored = JSON.parse((await streamToBuffer(await content.asStream())).toString())
    expect(stored).toEqual({
      index: [
        {
          name: 'world-name.dcl.eth',
          scenes: [
            {
              description: 'Mi lugar en el mundo',
              id: 'bafkreielwj3ki46munydwn4ayazdvmjln76khmz2xyaf5v6dkmo6yoebbi',
              pointers: ['20,24'],
              thumbnail: 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
              timestamp: 1683909215429,
              title: 'Mi propia escena'
            }
          ]
        },
        {
          name: 'another-world-name.dcl.eth',
          scenes: [
            {
              description: 'Mi lugar en el mundo',
              id: 'bafkreic6ix3pdwf7g24reg4ktlyjpmtbqbc2nq4zocupkmul37am4vlt6y',
              pointers: ['20,24'],
              thumbnail: 'bafkreidduubi76bntd27dewz4cvextrfl3qyd4td6mtztuisxi26q64dnq',
              timestamp: 1684263239610,
              title: 'Mi propia escena'
            }
          ]
        }
      ],
      timestamp: expect.any(Number)
    })
  })

  it('retrieves last created index', async () => {
    const worldData1: WorldData = {
      name: 'world-name.dcl.eth',
      scenes: [
        {
          id: 'bafkreielwj3ki46munydwn4ayazdvmjln76khmz2xyaf5v6dkmo6yoebbi',
          title: 'Mi propia escena',
          description: 'Mi lugar en el mundo',
          thumbnail: 'https://localhost:3000/contents/bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
          pointers: ['20,24'],
          timestamp: 1683916946483
        }
      ]
    }
    const worldData2: WorldData = {
      name: 'another-world-name.dcl.eth',
      scenes: [
        {
          description: 'Mi lugar en el mundo',
          id: 'bafkreic6ix3pdwf7g24reg4ktlyjpmtbqbc2nq4zocupkmul37am4vlt6y',
          pointers: ['20,24'],
          thumbnail: 'bafkreidduubi76bntd27dewz4cvextrfl3qyd4td6mtztuisxi26q64dnq',
          timestamp: 1684263239610,
          title: 'Mi propia escena'
        }
      ]
    }

    await storage.storeStream(
      'global-index.json',
      bufferToStream(
        Buffer.from(stringToUtf8Bytes(JSON.stringify({ index: [worldData1, worldData2], timestamp: Date.now() })))
      )
    )
    const index = await worldsIndexer.getIndex()

    expect(index).toEqual({
      index: [worldData1, worldData2],
      timestamp: expect.any(Number)
    })
  })

  it('recreates the index if too old', async () => {
    const worldData1: WorldData = {
      name: 'world-name.dcl.eth',
      scenes: [
        {
          id: 'bafkreielwj3ki46munydwn4ayazdvmjln76khmz2xyaf5v6dkmo6yoebbi',
          title: 'Mi propia escena',
          description: 'Mi lugar en el mundo',
          thumbnail: 'bafkreihdwdcefgh4dqkjv67uzcmw7ojee6xedzdetojuzjevtenxquvyku',
          pointers: ['20,24'],
          timestamp: 1683916946483
        }
      ]
    }

    await storage.storeStream(
      'global-index.json',
      bufferToStream(
        Buffer.from(stringToUtf8Bytes(JSON.stringify({ index: [worldData1], timestamp: Date.now() - 20 * 60 * 1000 })))
      )
    )
    const index = await worldsIndexer.getIndex()

    // The index should have no worlds because in the test we never stored the entity
    expect(index).toEqual({
      index: [],
      timestamp: expect.any(Number)
    })
    expect(index.timestamp).toBeGreaterThan(Date.now() - 60 * 1000)
  })
})

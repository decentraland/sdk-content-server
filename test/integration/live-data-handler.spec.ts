import { test } from '../components'

test('GET /live-data', function ({ components }) {
  it('returns the live data', async () => {
    const { localFetch } = components

    const r = await localFetch.fetch('/live-data')

    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      data: {
        totalUsers: 2,
        perWorld: [
          {
            worldName: 'world-name.dcl.eth',
            users: 2
          }
        ]
      },
      lastUpdated: expect.any(String)
    })
  })
})

import { buildUrl } from "../../src/logic/url-generation"

describe('url-generation', () => {
    it('should work when no prefix', () => {
        const currentUrl = new URL('https://worlds-content-server.decentraland.zone/entities')
        expect(buildUrl(currentUrl, '/entities', '/ipfs')).toBe('https://worlds-content-server.decentraland.zone/ipfs')
        expect(buildUrl(currentUrl, '/entities', 'ipfs')).toBe('https://worlds-content-server.decentraland.zone/ipfs')
        expect(buildUrl(currentUrl, '/entities', '')).toBe('https://worlds-content-server.decentraland.zone/')
        expect(buildUrl(currentUrl, '/entities', '/')).toBe('https://worlds-content-server.decentraland.zone/')
    });

    it('should work when using prefix', () => {
        const currentUrl = new URL('https://worlds-content-server.decentraland.zone/content/entities')
        expect(buildUrl(currentUrl, '/entities', 'ipfs')).toBe('https://worlds-content-server.decentraland.zone/content/ipfs')
        expect(buildUrl(currentUrl, '/entities', '/ipfs')).toBe('https://worlds-content-server.decentraland.zone/content/ipfs')
        expect(buildUrl(currentUrl, '/entities', '')).toBe('https://worlds-content-server.decentraland.zone/content/')
        expect(buildUrl(currentUrl, '/entities', '/')).toBe('https://worlds-content-server.decentraland.zone/content/')
    });

    it('should work when using prefix that ends with /', () => {
        const currentUrl = new URL('https://worlds-content-server.decentraland.zone/content/entities/')
        expect(buildUrl(currentUrl, '/entities/', 'ipfs')).toBe('https://worlds-content-server.decentraland.zone/content/ipfs')
        expect(buildUrl(currentUrl, '/entities/', '/ipfs')).toBe('https://worlds-content-server.decentraland.zone/content/ipfs')
        expect(buildUrl(currentUrl, '/entities/', '')).toBe('https://worlds-content-server.decentraland.zone/content/')
        expect(buildUrl(currentUrl, '/entities/', '/')).toBe('https://worlds-content-server.decentraland.zone/content/')
    });

    it('should throw error when current path is not part of current url', () => {
        const currentUrl = new URL('https://worlds-content-server.decentraland.zone/content/anything')
        expect(() => buildUrl(currentUrl, '/entities', 'ipfs'))
            .toThrowError('Current path /entities is not part of current url https://worlds-content-server.decentraland.zone/content/anything')
    })
})

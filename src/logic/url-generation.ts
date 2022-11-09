export const buildUrl = (currentUrl: URL, currentRequestPath: string, newPath: string) => {
    const startOfCurrentPath = currentUrl.pathname.indexOf(currentRequestPath)
    if (startOfCurrentPath < 0) {
        throw Error(`Current path ${currentRequestPath} is not part of current url ${currentUrl.toString()}`)
    }
    const pathPrefix = currentUrl.pathname.substring(0, startOfCurrentPath)
    const separator = !pathPrefix.endsWith('/') && !newPath.startsWith('/') ? '/' : '';
    return new URL(`${pathPrefix}${separator}${newPath}`, `${currentUrl.protocol}//${currentUrl.host}`).toString()
}

interface SitesEnvironment {
  ASSETS: {
    fetch(request: Request): Promise<Response>
  }
}

export default {
  fetch(request: Request, environment: SitesEnvironment): Promise<Response> {
    return environment.ASSETS.fetch(request)
  },
}

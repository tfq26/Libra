// ~/server/api/auth/[...].ts
import { NuxtAuthHandler } from '#auth'
import MicrosoftEntraID from '@auth/core/providers/microsoft-entra-id'

const runtimeConfig = useRuntimeConfig()

export default NuxtAuthHandler({
  secret: runtimeConfig.authSecret,
  providers: [
    MicrosoftEntraID({
      clientId: runtimeConfig.public.azureClientId,
      clientSecret: runtimeConfig.azureClientSecret,
      issuer: `https://login.microsoftonline.com/${runtimeConfig.public.azureTenantId}/v2.0`, // 👈 tenant goes here
    }) as any, // TS workaround until sidebase supports oidc type
  ],
})

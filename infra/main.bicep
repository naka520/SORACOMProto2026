targetScope = 'resourceGroup'

@description('Deployment location')
param location string = resourceGroup().location

@description('Project short name used in resource naming')
param projectName string = 'monooki'

@description('Environment name (dev, stg, prod)')
param environment string = 'dev'

@description('Storage account SKU')
@allowed([
  'Standard_LRS'
  'Standard_GRS'
  'Standard_ZRS'
])
param storageSku string = 'Standard_LRS'

@description('Blob container name for uploaded images')
param containerName string = 'mono-oki-images'

@description('Allow anonymous read access to blobs. Keep false for production.')
param enableBlobPublicRead bool = false

@description('Create Azure Functions resources')
param createFunctionApp bool = true

@description('Create Azure Static Web Apps resource')
param createStaticWebApp bool = true

@description('Static Web Apps SKU')
@allowed([
  'Free'
  'Standard'
])
param staticWebAppSku string = 'Free'

@description('Static Web Apps control plane location')
param staticWebAppLocation string = 'East Asia'

@description('Optional repository URL for Static Web Apps build integration')
param staticWebAppRepositoryUrl string = ''

@description('Branch used by Static Web Apps build integration')
param staticWebAppBranch string = 'main'

@description('Tags applied to all resources')
param tags object = {}

var suffix = toLower(uniqueString(resourceGroup().id, projectName, environment))
var storageAccountName = take('st${suffix}', 24)
var functionPlanName = '${projectName}-${environment}-func-plan'
var functionAppName = '${projectName}-${environment}-func'
var appInsightsName = '${projectName}-${environment}-appi'
var logAnalyticsName = '${projectName}-${environment}-log'
var staticWebAppName = '${projectName}-${environment}-swa'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: storageSku
  }
  kind: 'StorageV2'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: enableBlobPublicRead
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  name: '${storageAccount.name}/default'
}

resource imageContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: '${storageAccount.name}/default/${containerName}'
  properties: {
    publicAccess: enableBlobPublicRead ? 'Blob' : 'None'
  }
  dependsOn: [
    blobService
  ]
}

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (createFunctionApp) {
  name: logAnalyticsName
  location: location
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (createFunctionApp) {
  name: appInsightsName
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
  }
}

resource functionPlan 'Microsoft.Web/serverfarms@2023-12-01' = if (createFunctionApp) {
  name: functionPlanName
  location: location
  tags: tags
  kind: 'functionapp'
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  properties: {
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = if (createFunctionApp) {
  name: functionAppName
  location: location
  tags: tags
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'Node|20'
      ftpsState: 'FtpsOnly'
      appSettings: [
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'WEBSITE_RUN_FROM_PACKAGE'
          value: '1'
        }
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=${environment().suffixes.storage}'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        {
          name: 'AZURE_STORAGE_ACCOUNT_NAME'
          value: storageAccount.name
        }
        {
          name: 'AZURE_STORAGE_CONTAINER_NAME'
          value: containerName
        }
        {
          name: 'AZURE_BLOB_READ_SAS_TOKEN'
          value: ''
        }
        {
          name: 'SORACOM_FLUX_WEBHOOK_URL'
          value: ''
        }
        {
          name: 'SORACOM_FLUX_WEATHER_WEBHOOK_URL'
          value: ''
        }
      ]
    }
  }
}

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = if (createStaticWebApp) {
  name: staticWebAppName
  location: staticWebAppLocation
  tags: tags
  sku: {
    name: staticWebAppSku
    tier: staticWebAppSku
  }
  properties: empty(staticWebAppRepositoryUrl)
    ? {}
    : {
        repositoryUrl: staticWebAppRepositoryUrl
        branch: staticWebAppBranch
      }
}

output storageAccountName string = storageAccount.name
output blobContainerName string = imageContainer.name
output functionAppName string = createFunctionApp ? functionApp.name : ''
output staticWebAppName string = createStaticWebApp ? staticWebApp.name : ''
output staticWebAppDefaultHostname string = createStaticWebApp ? staticWebApp.properties.defaultHostname : ''

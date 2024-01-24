# aws-url-shortener
Base API Gateway-driven URL shortener built on AWS with no compute resources

## Install
```
npm i aws-url-shortener
```

## Usage
See documentation on `UrlShortener` construct.

### Example with default properties
```typescript
const app = new App()
const stack = new Stack(app, 'UrlShortenerStack')
const cert = new Certificate(testStack, 'UrlShortenerCertificate', {
    domainName: 'example.com'
})
new UrlShortener(testStack, 'UrlShortener', {
    certificate: cert,
    domain: {
        base: 'example.com',
        subdomain: 'link'
    }
})
```

### Example with access log
```typescript
const app = new App()
const stack = new Stack(app, 'UrlShortenerStack')
const cert = new Certificate(testStack, 'UrlShortenerCertificate', {
    domainName: 'example.com'
})
const accessLogGroup = new LogGroup(testStack, 'UrlShortenerAccessLogGroup', {
    logGroupName: `/aws/apigateway/url-shortener-access`,
    removalPolicy: RemovalPolicy.DESTROY,
    retention: RetentionDays.ONE_MONTH
})
new UrlShortener(testStack, 'UrlShortener', {
    apiDeployOptions: {
        loggingLevel: MethodLoggingLevel.INFO,
        accessLogDestination: new LogGroupLogDestination(accessLogGroup)
    },
    certificate: cert,
    domain: {
        base: 'example.com',
        subdomain: 'link'
    }
})
```

## License
Licensed under [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0)

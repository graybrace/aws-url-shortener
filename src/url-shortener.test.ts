import { App, RemovalPolicy, Stack } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { LogGroupLogDestination, MethodLoggingLevel } from "aws-cdk-lib/aws-apigateway";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { APIGATEWAY_REQUEST_VALIDATOR_UNIQUE_ID } from "aws-cdk-lib/cx-api";
import { UrlShortener } from "./url-shortener";

describe('default stack', () => {
    let template: Template
    beforeAll(() => {
        const [ testStack, testCert ] = createTestStackBase()
        new UrlShortener(testStack, 'TestUrlShortener', {
            certificate: testCert,
            domain: {
                base: 'example.com',
                subdomain: 'link'
            }
        })
        template = Template.fromStack(testStack)
    })

    /*
        Testing that the main components are present with high-level properties set
     */

    test('dynamodb table specified as expected', () => {
        template.resourceCountIs('AWS::DynamoDB::Table', 1)
        template.hasResourceProperties('AWS::DynamoDB::Table', {
            AttributeDefinitions: [
                {
                    AttributeName: 'path',
                    AttributeType: 'S'
                }
            ],
            KeySchema: [
                {
                    AttributeName: 'path',
                    KeyType: 'HASH'
                }
            ],
            TimeToLiveSpecification: {
                AttributeName: 'ttl',
                Enabled: true
            }
        })
    })

    test('dynamodb updateitem role created', () => {
        getDynamoDbUpdateRoleId(template) // asserts it exists
    })

    test('gateway domain name created', () => {
        template.resourceCountIs('AWS::ApiGateway::DomainName', 1)
        template.hasResourceProperties('AWS::ApiGateway::DomainName', {
            DomainName: 'link.example.com'
        })
    })

    test('rest api with prod deployment created', () => {
        template.resourceCountIs('AWS::ApiGateway::RestApi', 1)
        template.hasResourceProperties('AWS::ApiGateway::Stage', {
            RestApiId: {
                Ref: getResourceId(template, 'AWS::ApiGateway::RestApi')
            },
            StageName: 'prod'
        })
    })

    test('rest api POST endpoint created', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            AuthorizationType: 'NONE',
            HttpMethod: 'POST',
            Integration: {
                Credentials: {
                    'Fn::GetAtt': [
                        getDynamoDbUpdateRoleId(template),
                        'Arn'
                    ]
                },
                IntegrationHttpMethod: 'POST',
                Uri: {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            {
                                Ref: 'AWS::Partition'
                            },
                            ':apigateway:',
                            {
                                Ref: 'AWS::Region'
                            },
                            ':dynamodb:action/UpdateItem'
                        ]
                    ]
                }
            },
            RestApiId: {
                Ref: getResourceId(template, 'AWS::ApiGateway::RestApi')
            }
        })
    })

    test('rest api GET endpoint created', () => {
        template.hasResourceProperties('AWS::ApiGateway::Method', {
            AuthorizationType: 'NONE',
            HttpMethod: 'GET',
            Integration: {
                Credentials: {
                    'Fn::GetAtt': [
                        getDynamoDbUpdateRoleId(template),
                        'Arn'
                    ]
                },
                IntegrationHttpMethod: 'POST',
                Uri: {
                    'Fn::Join': [
                        '',
                        [
                            'arn:',
                            {
                                Ref: 'AWS::Partition'
                            },
                            ':apigateway:',
                            {
                                Ref: 'AWS::Region'
                            },
                            ':dynamodb:action/UpdateItem'
                        ]
                    ]
                }
            },
            RestApiId: {
                Ref: getResourceId(template, 'AWS::ApiGateway::RestApi')
            }
        })
    })
})

describe('customized stack', () => {
    test('including hosted zone adds route53 record', () => {
        const [ testStack, testCert ] = createTestStackBase()
        new UrlShortener(testStack, 'TestUrlShortener', {
            certificate: testCert,
            domain: {
                base: 'example.com',
                subdomain: 'link'
            },
            hostedZone: new HostedZone(testStack, 'TestUrlShortenerHostedZone', {
                zoneName: 'TestHostedZone'
            })
        })
        const template = Template.fromStack(testStack)
        template.hasResourceProperties('AWS::Route53::RecordSet', {
            AliasTarget: {
                DNSName: {
                    "Fn::GetAtt": [
                        getResourceId(template, 'AWS::ApiGateway::DomainName'),
                        "RegionalDomainName"
                    ]
                },
                HostedZoneId: {
                    "Fn::GetAtt": [
                        getResourceId(template, 'AWS::ApiGateway::DomainName'),
                        "RegionalHostedZoneId"
                    ]
                }
            },
            HostedZoneId: {
                Ref: getResourceId(template, 'AWS::Route53::HostedZone')
            },
            Name: "link.TestHostedZone.",
            Type: "A"
        })
    })

    test('setting execution log retention creates log retention object', () => {
        const [ testStack, testCert ] = createTestStackBase()
        new UrlShortener(testStack, 'TestUrlShortener', {
            certificate: testCert,
            domain: {
                base: 'example.com',
                subdomain: 'link'
            },
            executionLogRetention: RetentionDays.FIVE_DAYS
        })
        const template = Template.fromStack(testStack)
        template.hasResourceProperties('Custom::LogRetention', {
            LogGroupName: {
                'Fn::Join': [
                    '',
                    [
                        'API-Gateway-Execution-Logs_',
                        {
                            Ref: getResourceId(template, 'AWS::ApiGateway::RestApi')
                        },
                        '/',
                        {
                            Ref: getResourceId(template, 'AWS::ApiGateway::Stage')
                        }
                    ]
                ]
            },
            RetentionInDays: 5
        })
    })

    test('custom deploy options are passed through to api', () => {
        const [ testStack, testCert ] = createTestStackBase()
        const accessLogGroup = new LogGroup(testStack, 'UrlShortenerAccessLogGroup', {
            logGroupName: `/aws/apigateway/url-shortener-access`,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_MONTH
        })
        new UrlShortener(testStack, 'TestUrlShortener', {
            apiDeployOptions: {
                loggingLevel: MethodLoggingLevel.INFO,
                accessLogDestination: new LogGroupLogDestination(accessLogGroup)
            },
            certificate: testCert,
            domain: {
                base: 'example.com',
                subdomain: 'link'
            }
        })
        const template = Template.fromStack(testStack)
        template.hasResourceProperties('AWS::ApiGateway::Stage', {
            AccessLogSetting: {
                DestinationArn: {
                    'Fn::GetAtt': [
                        getResourceId(template, 'AWS::Logs::LogGroup'),
                        "Arn"
                    ]
                }
            },
            MethodSettings: [
                {
                    DataTraceEnabled: false,
                    HttpMethod: '*',
                    LoggingLevel: 'INFO',
                    ResourcePath: '/*'
                }
            ],
        })
    })
})

const createTestStackBase = (): [ Stack, Certificate ] => {
    const testApp = new App()
    const testStack = new Stack(testApp, 'TestUrlShortenerStack')
    testStack.node.setContext(APIGATEWAY_REQUEST_VALIDATOR_UNIQUE_ID, true)
    const testCert = new Certificate(testStack, 'TestUrlShortenerCertificate', {
        domainName: 'example.com'
    })
    return [ testStack, testCert ]
}

const getDynamoDbUpdateRoleId = (template: Template) => {
    const roles = template.findResources('AWS::IAM::Role', Match.objectLike({
        Properties: {
            AssumeRolePolicyDocument: {
                Statement: [
                    {
                        Action: 'sts:AssumeRole',
                        Effect: 'Allow',
                        Principal: {
                            Service: 'apigateway.amazonaws.com'
                        }
                    }
                ]
            },
            Policies: [
                {
                    PolicyDocument: {
                        Statement: [
                            {
                                Action: 'dynamodb:UpdateItem',
                                Effect: 'Allow',
                                Resource: {
                                    'Fn::GetAtt': [
                                        getResourceId(template, 'AWS::DynamoDB::Table'),
                                        'Arn'
                                    ]
                                }
                            }
                        ]
                    }
                }
            ]
        }
    }))
    const ids = Object.keys(roles)
    expect(ids.length).toBe(1)
    return ids[0]
}

const getResourceId = (template: Template, type: string) => {
    template.resourceCountIs(type, 1)
    const resources = template.findResources(type)
    return Object.keys(resources)[0]
}
import { readFileSync } from "fs";
import { resolve } from "path";

import { AwsIntegration } from "aws-cdk-lib/aws-apigateway";
import { IRole } from "aws-cdk-lib/aws-iam";

interface DynamoCreateIntegrationProps {
    domain: string
    tableAccessRole: IRole
    tableName: string
}

export class DynamoCreateIntegration extends AwsIntegration {
    constructor({ domain, tableAccessRole, tableName }: DynamoCreateIntegrationProps) {
        super({
            service: 'dynamodb',
            action: 'UpdateItem',
            integrationHttpMethod: 'POST',
            options: {
                credentialsRole: tableAccessRole,
                requestTemplates: {
                    /*
                      Request body:
                      {
                        slashtag?: string
                        url: string
                        expiration?: number
                      }
                     */
                    'application/json': readResourceFile('postRequest.vm', {
                        TABLE_NAME: tableName
                    })
                },
                integrationResponses: [
                    /*
                      Default is to give a 201 response with response body containing url attribute with full URL value
                      Otherwise, give a 400
                     */
                    {
                        statusCode: '201',
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'",
                        },
                        responseTemplates: {
                            'application/json': readResourceFile('postResponse.vm', {
                                DOMAIN: domain
                            })
                        }
                    },
                    /*
                      If we get a non-200 response from DDB, return a 400
                     */
                    {
                        selectionPattern: '^(?!2).*$',
                        statusCode: '400',
                        responseTemplates: {
                            'text/plain': readResourceFile('postFailureResponse.vm')
                        }
                    }
                ]
            }
        })
    }
}

const readResourceFile = (fileName: string, replacements: {[key: string]: string} = {}): string => {
    const base = readFileSync(resolve(__dirname, `./res/${fileName}`), 'utf8');
    return Object.keys(replacements).reduce((prev, key) => {
        return prev.replace(key, replacements[key]);
    }, base);
}
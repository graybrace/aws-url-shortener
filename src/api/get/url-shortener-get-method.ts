import { Model, RestApi } from "aws-cdk-lib/aws-apigateway";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { DynamoGetIntegration } from "./dynamo-get-integration";

interface UrlShortenerGetMethodProps {
    api: RestApi
    tableAccessRole: IRole
    tableName: string
}

export class UrlShortenerGetMethod extends Construct {
    constructor(scope: Construct, id: string, { api, tableAccessRole, tableName }: UrlShortenerGetMethodProps) {
        super(scope, id)

        const updateIntegration = new DynamoGetIntegration({
            tableAccessRole,
            tableName
        })

        const resource = api.root.addResource('{path}')
        resource.addMethod('GET', updateIntegration, {
            requestParameters: {
                'method.request.path.path': true
            },
            requestValidatorOptions: {
                validateRequestBody: true, // Get CDK Nag off our back -- there's no body to validate anyway
                validateRequestParameters: true
            },
            methodResponses: [
                {
                    statusCode: '302',
                    responseModels: {
                        'application/json': Model.EMPTY_MODEL
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    }
                },
                {
                    statusCode: '404',
                    responseModels: {
                        'application/json': Model.EMPTY_MODEL
                    }
                },
                {
                    statusCode: '500',
                    responseModels: {
                        'application/json': Model.EMPTY_MODEL
                    }
                }
            ]
        })
    }
}
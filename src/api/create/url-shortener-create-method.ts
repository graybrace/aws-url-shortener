import { RestApi } from "aws-cdk-lib/aws-apigateway";
import { IRole } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

import { DynamoCreateIntegration } from "./dynamo-create-integration";
import { addFailureModel, addRequestModel, addSuccessModel } from "./model";

interface UrlShortenerCreateMethodProps {
    api: RestApi
    domain: string
    tableAccessRole: IRole
    tableName: string
}

export class UrlShortenerCreateMethod extends Construct {
    constructor(scope: Construct, id: string, { api, domain, tableAccessRole, tableName }: UrlShortenerCreateMethodProps) {
        super(scope, id)

        const postIntegration = new DynamoCreateIntegration({
            domain,
            tableAccessRole,
            tableName
        })

        const createLinkRequestModel = addRequestModel(api, 'UrlShortenerCreationRequestModel')
        const createLinkResponseModel = addSuccessModel(api, 'UrlShortenerCreationModel')
        const createLinkFailureModel = addFailureModel(api, 'UrlShortenerCreationFailureModel')

        api.root.addMethod('POST', postIntegration, {
            requestModels: {
                'application/json': createLinkRequestModel
            },
            requestValidatorOptions: {
                validateRequestBody: true
            },
            methodResponses: [
                {
                    statusCode: '201',
                    responseModels: {
                        'application/json': createLinkResponseModel
                    },
                    responseParameters: {
                        'method.response.header.Access-Control-Allow-Origin': true
                    }
                },
                {
                    statusCode: '400',
                    responseModels: {
                        'text/plain': createLinkFailureModel
                    }
                },
                {
                    statusCode: '500',
                    responseModels: {
                        'text/plain': createLinkFailureModel
                    }
                }
            ]
        })
    }
}
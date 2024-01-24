import { JsonSchemaType, JsonSchemaVersion, RestApi } from "aws-cdk-lib/aws-apigateway";
import { IModel } from "aws-cdk-lib/aws-apigateway/lib/model";

export const addRequestModel = (api: RestApi, id: string): IModel => {
    return api.addModel(id, {
        contentType: 'application/json',
        modelName: 'UrlShortenerCreationRequestModel',
        schema: {
            schema: JsonSchemaVersion.DRAFT4,
            title: 'UrlShortenerLinkRequest',
            type: JsonSchemaType.OBJECT,
            required: [ "url" ],
            properties: {
                slashtag: {
                    type: JsonSchemaType.STRING,
                    minLength: 1,
                    pattern: "^[^\"]$"
                },
                url: {
                    type: JsonSchemaType.STRING,
                    minLength: 1,
                    pattern: "^[^\"]$"
                },
                expiration: {
                    type: JsonSchemaType.INTEGER
                }
            }
        }
    })
}

export const addSuccessModel = (api: RestApi, id: string): IModel => {
    return api.addModel(id, {
        contentType: 'application/json',
        modelName: 'UrlShortenerCreationResponseModel',
        schema: {
            schema: JsonSchemaVersion.DRAFT4,
            title: 'UrlShortenerLinkResponse',
            type: JsonSchemaType.OBJECT,
            properties: {
                url: {
                    type: JsonSchemaType.STRING
                }
            }
        }
    })
}

export const addFailureModel = (api: RestApi, id: string): IModel => {
    return api.addModel(id, {
        contentType: 'application/json',
        modelName: 'UrlShortenerCreationFailureResponseModel',
        schema: {
            schema: JsonSchemaVersion.DRAFT4,
            title: 'UrlShortenerLinkFailureResponse',
            type: JsonSchemaType.STRING
        }
    })
}
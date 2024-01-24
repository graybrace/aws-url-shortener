import { AwsIntegration } from "aws-cdk-lib/aws-apigateway";
import { IRole } from "aws-cdk-lib/aws-iam";
import { readFileSync } from "fs";
import { resolve } from "path";

interface DynamoGetIntegrationProps {
    tableAccessRole: IRole
    tableName: string
}

export class DynamoGetIntegration extends AwsIntegration {
    constructor({ tableAccessRole, tableName }: DynamoGetIntegrationProps) {
        super({
            service: 'dynamodb',
            action: 'UpdateItem',
            integrationHttpMethod: 'POST',
            options: {
                credentialsRole: tableAccessRole,
                /*
                  Map the request in to a request to DynamoDB with the HTTP method + action specified above
                  Takes the {path} from the request URL, increments numClicks on the associated item, and
                  returns all attributes from the associated item so we can get the url to redirect to
                 */
                requestTemplates: {
                    'application/json': JSON.stringify({
                        Key: {
                            path: {
                                S: "$method.request.path.path"
                            }
                        },
                        TableName: tableName,
                        UpdateExpression: "SET numClicks = if_not_exists(numClicks, :initial) + :numClicksChange",
                        ConditionExpression: "#path = :path",
                        ExpressionAttributeNames: {
                            "#path": "path"
                        },
                        ExpressionAttributeValues: {
                            ":initial": {
                                N: "0"
                            },
                            ":numClicksChange": {
                                N: "1"
                            },
                            ":path": {
                                S: "$method.request.path.path"
                            }
                        },
                        // We just need the url attribute, so theoretically this could be ALL_OLD or ALL_NEW, but we need ALL
                        ReturnValues: "ALL_NEW"
                    })
                },
                /*
                  Map the responses in to a response sent back to the end user
                 */
                integrationResponses: [
                    /*
                      Default is to give a 302 response and set the Location header to the associated item's url value
                      Otherwise, give a 404
                     */
                    {
                        statusCode: '302',
                        responseTemplates: {
                            'application/json': readFileSync(resolve(__dirname, `./res/getResponse.vm`), 'utf8')
                        },
                        responseParameters: {
                            'method.response.header.Access-Control-Allow-Origin': "'*'"
                        }
                    },
                    /*
                      If we get a non-200 response from DDB, return a 404
                     */
                    {
                        selectionPattern: '^(?!2).*$',
                        statusCode: '404',
                        responseTemplates: {
                            'text/html': 'Not Found'
                        }
                    }
                ]
            }
        })
    }
}
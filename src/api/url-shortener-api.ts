import { Cors, EndpointType, RestApi } from "aws-cdk-lib/aws-apigateway";
import { RestApiProps } from "aws-cdk-lib/aws-apigateway/lib/restapi";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { IRole } from "aws-cdk-lib/aws-iam";
import { LogRetention, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

import { UrlShortenerCreateMethod } from "./create/url-shortener-create-method";
import { UrlShortenerGetMethod } from "./get/url-shortener-get-method";

interface UrlShortenerApiProps extends Omit<RestApiProps, 'domainName'> {
    domain: string
    certificate: ICertificate
    tableAccessRole: IRole
    tableName: string
    executionLogRetention?: RetentionDays
}

export class UrlShortenerApi extends RestApi {
    constructor(scope: Construct, id: string, {
        domain,
        certificate,
        tableAccessRole,
        tableName,
        deployOptions,
        executionLogRetention,
        ...props
    }: UrlShortenerApiProps) {
        super(scope, id, {
            defaultCorsPreflightOptions: props.defaultCorsPreflightOptions || {
                allowOrigins: Cors.ALL_ORIGINS,
                allowMethods: Cors.ALL_METHODS
            },
            domainName: {
                domainName: domain,
                certificate: certificate,
                endpointType: EndpointType.REGIONAL,
            },
            deployOptions,
            ...props
        })

        if (executionLogRetention) {
            new LogRetention(scope, `${scope.node.id}LogRetention`, {
                logGroupName: getApiGatewayExecutionLogGroupName(this.restApiId, this.deploymentStage.stageName),
                retention: executionLogRetention
            })
        }

        new UrlShortenerCreateMethod(scope, `${id}Post`, {
            api: this,
            domain,
            tableAccessRole,
            tableName
        })

        new UrlShortenerGetMethod(scope, `${id}Get`, {
            api: this,
            tableAccessRole,
            tableName
        })
    }
}

const getApiGatewayExecutionLogGroupName = (restApiId: string, stageName: string) => {
    return `API-Gateway-Execution-Logs_${restApiId}/${stageName}`
}
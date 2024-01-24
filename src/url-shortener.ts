import { IRestApi, RestApiProps } from "aws-cdk-lib/aws-apigateway/lib/restapi";
import { StageOptions } from "aws-cdk-lib/aws-apigateway/lib/stage";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { IHostedZone } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";
import { UrlShortenerApi } from "./api/url-shortener-api";
import { ApiDomain } from "./domain/api-domain";
import { UrlTable, UrlTableProps } from "./table/url-table";
import { UrlTableUpdateRole } from "./table/url-table-update-role";

interface DomainProps {
    base: string
    subdomain: string
}

interface UrlShortenerProps {
    /*
        Deploy options to pass through to the RestApi properties
        Takes precedence over apiOptions.deployOptions
        Default: CDK default deploy options
     */
    apiDeployOptions?: StageOptions
    /*
        API options to pass through to the RestApi properties
     */
    apiOptions?: RestApiProps
    /*
        Certificate to associate with the RestApi domain name config
        Default: CORS configured for all origins and methods and domain configured
     */
    certificate: ICertificate
    /*
        Domain name to associated with the API
     */
    domain: DomainProps
    /*
        Retention (in days) to set on the API Gateway execution log group
        Default: CDK default API execution log retention
     */
    executionLogRetention?: RetentionDays
    /*
        Hosted zone to add a Route 53 domain record to
        Default: no record created
     */
    hostedZone?: IHostedZone
    /*
        DynamoDB table to use for URL record storage/retrieval
        Default: table created with CDK default table options
     */
    table?: ITable
    /*
        Options to use for creating new DynamoDB table
        If table is specified, these options are ignored
     */
    tableOptions?: UrlTableProps
}

export class UrlShortener extends Construct {
    public readonly table: ITable
    public readonly restApi: IRestApi

    constructor(scope: Construct, id: string, props: UrlShortenerProps) {
        super(scope, id)

        // Create the table, if one is not provided
        this.table = props.table || new UrlTable(this, 'UrlShortenerTable', props.tableOptions)

        const tableAccessRole = new UrlTableUpdateRole(this, 'UrlShortenerTableAccessRole', {
            principal: new ServicePrincipal('apigateway.amazonaws.com'),
            table: this.table
        })

        // Create the URL shortener API
        const api = new UrlShortenerApi(this, 'UrlShortenerApi', {
            certificate: props.certificate,
            ...props.apiOptions,
            deployOptions: {
                ...props.apiOptions?.deployOptions,
                ...props.apiDeployOptions
            },
            domain: `${props.domain.subdomain}.${props.domain.base}`,
            executionLogRetention: props.executionLogRetention,
            tableAccessRole,
            tableName: this.table.tableName
        })
        this.restApi = api

        // Create the domain record, if desired
        if (props.hostedZone) {
            new ApiDomain(this, 'UrlShortenerDomain', {
                api,
                hostedZone: props.hostedZone,
                subdomain: props.domain.subdomain
            })
        }
    }
}
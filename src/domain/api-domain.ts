import { aws_route53_targets } from "aws-cdk-lib";
import { RestApiBase } from "aws-cdk-lib/aws-apigateway";
import { ARecord, IHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ARecordProps } from "aws-cdk-lib/aws-route53/lib/record-set";
import { Construct } from "constructs";

interface ApiDomainProps extends Omit<ARecordProps, 'recordName' | 'target' | 'zone'> {
    api: RestApiBase
    hostedZone: IHostedZone
    subdomain: string
}

export class ApiDomain extends Construct {
    constructor(scope: Construct, id: string, { api, hostedZone, subdomain, ...props }: ApiDomainProps) {
        super(scope, id)

        new ARecord(this, 'UrlShortenerARecord', {
            zone: hostedZone,
            recordName: subdomain,
            target: RecordTarget.fromAlias(new aws_route53_targets.ApiGateway(api)),
            ...props
        })
    }
}
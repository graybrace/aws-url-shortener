import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Effect, IPrincipal, PolicyDocument, PolicyStatement, Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

interface UrlTableAccessRoleProps {
    principal: IPrincipal
    table: ITable
}

export class UrlTableUpdateRole extends Role {
    constructor(scope: Construct, id: string, { principal, table }: UrlTableAccessRoleProps) {
        super(scope, id, {
            assumedBy: principal,
            inlinePolicies: {
                dynamoDbItemPolicy: new PolicyDocument({
                    statements: [
                        new PolicyStatement({
                            actions: [ 'dynamodb:UpdateItem' ],
                            effect: Effect.ALLOW,
                            resources: [ table.tableArn ]
                        })
                    ]
                })
            }
        })
    }
}
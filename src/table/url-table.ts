import { AttributeType, Table, TableProps } from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export type UrlTableProps = Omit<TableProps, 'partitionKey' | 'sortKey' | 'timeToLiveAttribute'>

export class UrlTable extends Table {
    constructor(scope: Construct, id: string, props: UrlTableProps) {
        super(scope, id, {
            partitionKey: {
                name: 'path',
                type: AttributeType.STRING
            },
            timeToLiveAttribute: 'ttl',
            ...props
        })
    }
}
import type {RunSqlResult} from "@/components/sql/types";
import type {
    ColumnDef,
} from "@tanstack/react-table"
import {Button} from "@/components/ui/button";
import {ArrowDown, ArrowUp, ArrowUpDown} from "lucide-react"
import React, {useMemo} from "react";
import {DataTable} from "../data-table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import {useTranslations} from "next-intl";

type RunSqlPreviewProps = {
    result: RunSqlResult
}


function transformColumns(columns: RunSqlResult['columns']): ColumnDef<any>[] {
    if (!columns || !columns.length) {
        return [];
    }
    return columns.map((originalColumn) => ({
        accessorKey: originalColumn.name,
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    {originalColumn.name}
                    {column.getIsSorted() ? (
                        column.getIsSorted() === "asc" ? (
                            <ArrowDown className="ml-2 size-4" />
                        ) : (
                            <ArrowUp className="ml-2 size-4" />
                        )
                    ) : (
                        <ArrowUpDown className="ml-2 size-4" />
                    )}
                </Button>
            )
        },
        cell: (info) => {
            const value = info.getValue();
            return typeof value === 'string' ? value : JSON.stringify(value);
        }
    }));
}

export function RunSqlPreview({ result }: RunSqlPreviewProps) {
    const t = useTranslations('runSqlPreview');
    const columns = useMemo(() => transformColumns(result.columns), [result.columns]);

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
                <AccordionTrigger>
                    {t('rawResult', {count: result?.records?.length || 0})}
                </AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-balance">
                    <DataTable columns={columns} data={result.records || []} />
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
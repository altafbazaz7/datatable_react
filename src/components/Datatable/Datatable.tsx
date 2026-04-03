import type { JSX } from "react";
import { useState, useEffect, useRef, useCallback } from "react";

type ColumnType = "string" | "number" | "dropdown" | "checkbox";

export type THead = {
    name: string;
    type: ColumnType;
    options?: string[];
};

type SortDirection = "asc" | "desc" | null;

type FilterCondition = {
    column: number;
    value: string;
    operator: "contains" | "equals" | "greater" | "less";
};

type DatatableProps = {
    theaders?: THead[];
    tbody?: string[][];
    onCellChange?: (rowIdx: number, colIdx: number, value: string) => void;
    onLoadMore?: () => Promise<string[][]>;
    hasMore?: boolean;
    pageSize?: number;
};

const typeMap = (
    value: string,
    column?: THead,
    rowIdx?: number,
    colIdx?: number,
    onCellChange?: (r: number, c: number, v: string) => void
): JSX.Element => {
    switch (column?.type) {
        case "checkbox":
            return (
                <input
                    type="checkbox"
                    checked={value === "true"}
                    className="w-4 h-4"
                    onChange={() => {
                        if (rowIdx !== undefined && colIdx !== undefined && onCellChange) {
                            onCellChange(rowIdx, colIdx, value === "true" ? "false" : "true");
                        }
                    }}
                />
            );

        case "dropdown":
            return (
                <select
                    className="border border-gray-300 px-2 py-1 rounded text-sm"
                    value={value}
                    onChange={(e) => {
                        if (rowIdx !== undefined && colIdx !== undefined && onCellChange) {
                            onCellChange(rowIdx, colIdx, e.target.value);
                        }
                    }}
                >
                    {column?.options?.map((opt) => (
                        <option key={opt} value={opt}>
                            {opt}
                        </option>
                    ))}
                </select>
            );

        case "number":
        case "string":
        default:
            return <span className="text-sm">{value}</span>;
    }
};

const filterData = (data: string[][], filters: FilterCondition[]): string[][] => {
    if (filters.length === 0) return data;

    return data.filter((row) => {
        return filters.every((filter) => {
            const cellValue = row[filter.column];
            const filterValue = filter.value.toLowerCase();

            if (!filterValue) return true;

            switch (filter.operator) {
                case "contains":
                    return cellValue.toLowerCase().includes(filterValue);
                case "equals":
                    return cellValue.toLowerCase() === filterValue;
                case "greater":
                    const numCell = parseFloat(cellValue);
                    const numFilter = parseFloat(filterValue);
                    return !isNaN(numCell) && !isNaN(numFilter) && numCell > numFilter;
                case "less":
                    const numCellLess = parseFloat(cellValue);
                    const numFilterLess = parseFloat(filterValue);
                    return !isNaN(numCellLess) && !isNaN(numFilterLess) && numCellLess < numFilterLess;
                default:
                    return true;
            }
        });
    });
};

const sortData = (data: string[][], sortColumn: number | null, sortDirection: SortDirection): string[][] => {
    if (sortColumn === null || sortDirection === null) return data;

    const sorted = [...data];
    const columnType = (theaders: THead[], col: number) => {
        if (!theaders[col]) return "string";
        return theaders[col].type;
    };

    sorted.sort((a, b) => {
        let aVal: string | number = a[sortColumn];
        let bVal: string | number = b[sortColumn];

        if (columnType([], sortColumn) === "number") {
            aVal = parseFloat(aVal as string);
            bVal = parseFloat(bVal as string);
        }

        if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
        if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    return sorted;
};

const Datatable = ({ 
    theaders = [], 
    tbody = [], 
    onCellChange, 
    onLoadMore, 
    hasMore = false, 
    pageSize = 20 
}: DatatableProps) => {
    const [allData, setAllData] = useState<string[][]>(tbody);
    const [displayedData, setDisplayedData] = useState<string[][]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [sortColumn, setSortColumn] = useState<number | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>(null);
    const [filters, setFilters] = useState<FilterCondition[]>([]);
    const [searchInputs, setSearchInputs] = useState<{ [key: number]: string }>({});
    const [filterOperators, setFilterOperators] = useState<{ [key: number]: "contains" | "equals" | "greater" | "less" }>({});
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setAllData(tbody);
        setCurrentPage(1);
    }, [tbody]);

    const getFilteredAndSortedData = useCallback(() => {
        let processed = filterData(allData, filters);
        processed = sortData(processed, sortColumn, sortDirection);
        return processed;
    }, [allData, filters, sortColumn, sortDirection]);

    useEffect(() => {
        const processed = getFilteredAndSortedData();
        const startIdx = 0;
        const endIdx = currentPage * pageSize;
        setDisplayedData(processed.slice(startIdx, endIdx));
    }, [getFilteredAndSortedData, currentPage, pageSize]);

    const loadMoreData = useCallback(async () => {
        if (loading || !hasMore || !onLoadMore) return;

        setLoading(true);
        try {
            const newData = await onLoadMore();
            setAllData((prev) => [...prev, ...newData]);
            setCurrentPage((prev) => prev + 1);
        } catch (error) {
            console.error("Failed to load more data:", error);
        } finally {
            setLoading(false);
        }
    }, [loading, hasMore, onLoadMore]);

    useEffect(() => {
        if (!onLoadMore) return;

        if (observerRef.current) {
            observerRef.current.disconnect();
        }

        observerRef.current = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading) {
                    loadMoreData();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreTriggerRef.current) {
            observerRef.current.observe(loadMoreTriggerRef.current);
        }

        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, [hasMore, loading, loadMoreData, onLoadMore]);

    const handleSort = (colIdx: number) => {
        if (sortColumn === colIdx) {
            if (sortDirection === "asc") {
                setSortDirection("desc");
            } else if (sortDirection === "desc") {
                setSortColumn(null);
                setSortDirection(null);
            }
        } else {
            setSortColumn(colIdx);
            setSortDirection("asc");
        }
        setCurrentPage(1);
    };

    const handleFilter = (colIdx: number, value: string) => {
        setSearchInputs((prev) => ({ ...prev, [colIdx]: value }));
        
        const operator = filterOperators[colIdx] || "contains";
        
        if (value.trim() === "") {
            setFilters((prev) => prev.filter((f) => f.column !== colIdx));
        } else {
            setFilters((prev) => {
                const existing = prev.findIndex((f) => f.column === colIdx);
                const newFilter: FilterCondition = {
                    column: colIdx,
                    value: value,
                    operator: operator,
                };
                
                if (existing !== -1) {
                    const updated = [...prev];
                    updated[existing] = newFilter;
                    return updated;
                }
                return [...prev, newFilter];
            });
        }
        setCurrentPage(1);
    };

    const handleOperatorChange = (colIdx: number, operator: "contains" | "equals" | "greater" | "less") => {
        setFilterOperators((prev) => ({ ...prev, [colIdx]: operator }));
        
        const currentValue = searchInputs[colIdx] || "";
        if (currentValue.trim() !== "") {
            setFilters((prev) => {
                const existing = prev.findIndex((f) => f.column === colIdx);
                const newFilter: FilterCondition = {
                    column: colIdx,
                    value: currentValue,
                    operator: operator,
                };
                
                if (existing !== -1) {
                    const updated = [...prev];
                    updated[existing] = newFilter;
                    return updated;
                }
                return [...prev, newFilter];
            });
        }
    };

    const showTable = theaders.length > 0;

    if (!showTable) {
        return <p className="text-gray-500 text-sm">No data available</p>;
    }

    const getSortIcon = (colIdx: number) => {
        if (sortColumn !== colIdx) return "↕️";
        if (sortDirection === "asc") return "↑";
        if (sortDirection === "desc") return "↓";
        return "↕️";
    };

    const getOperatorSymbol = (operator: string) => {
        switch (operator) {
            case "contains": return "⊃";
            case "equals": return "=";
            case "greater": return ">";
            case "less": return "<";
            default: return "⊃";
        }
    };

    return (
        <div className="w-full">
            <div ref={tableContainerRef} className="w-full overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full border-collapse font-sans">
                    <thead className="sticky top-0 bg-white z-10">
                        <tr>
                            {theaders.map((thead, idx) => (
                                <th
                                    key={`h-${idx}`}
                                    className="border border-gray-300 px-3 py-2 bg-gray-100 text-gray-800 font-semibold"
                                >
                                    <div className="flex flex-col gap-2">
                                        <div 
                                            className="flex items-center justify-between cursor-pointer hover:bg-gray-200 px-1 rounded"
                                            onClick={() => handleSort(idx)}
                                        >
                                            <span>{thead.name}</span>
                                            <span className="text-xs ml-2">{getSortIcon(idx)}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <select
                                                className="text-xs border border-gray-300 rounded px-1 py-0.5 bg-white"
                                                value={filterOperators[idx] || "contains"}
                                                onChange={(e) => handleOperatorChange(idx, e.target.value as any)}
                                            >
                                                <option value="contains">⊃</option>
                                                <option value="equals">=</option>
                                                {thead.type === "number" && (
                                                    <>
                                                        <option value="greater">&gt;</option>
                                                        <option value="less">&lt;</option>
                                                    </>
                                                )}
                                            </select>
                                            <input
                                                type={thead.type === "number" ? "number" : "text"}
                                                placeholder={`Filter...`}
                                                className="text-xs border border-gray-300 rounded px-2 py-0.5 w-24"
                                                value={searchInputs[idx] || ""}
                                                onChange={(e) => handleFilter(idx, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedData.map((row, rowIdx) => (
                            <tr
                                key={`r-${rowIdx}`}
                                className={`${rowIdx % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors`}
                            >
                                {row.map((cell, colIdx) => {
                                    const column = theaders[colIdx];
                                    const originalRowIdx = allData.findIndex((origRow) => 
                                        JSON.stringify(origRow) === JSON.stringify(getFilteredAndSortedData()[rowIdx])
                                    );
                                    return (
                                        <td key={`r${rowIdx}-c${colIdx}`} className="border border-gray-300 px-3 py-2 text-gray-900">
                                            {typeMap(cell, column, originalRowIdx, colIdx, onCellChange)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {onLoadMore && (
                    <div ref={loadMoreTriggerRef} className="py-4 text-center">
                        {loading ? (
                            <div className="flex justify-center items-center gap-2">
                                <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                <span className="text-sm text-gray-500">Loading more...</span>
                            </div>
                        ) : hasMore ? (
                            <span className="text-sm text-gray-400">Scroll to load more</span>
                        ) : allData.length > 0 ? (
                            <span className="text-sm text-gray-400">No more data</span>
                        ) : null}
                    </div>
                )}
                {displayedData.length === 0 && allData.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-gray-500 text-sm">No data available</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Datatable;
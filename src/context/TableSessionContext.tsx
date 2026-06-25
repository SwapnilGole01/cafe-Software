import React, { createContext, useContext, useState, useEffect } from "react";

interface TableSessionContextType {
  tableId: number | null;
  setTableId: (id: number | null) => void;
}

const TableSessionContext = createContext<TableSessionContextType | undefined>(undefined);

export function TableSessionProvider({ children }: { children: React.ReactNode }) {
  const [tableId, setTableIdState] = useState<number | null>(() => {
    // 1. Try to parse from path first: /table/123 or /table/[id]
    const match = window.location.pathname.match(/^\/table\/(\d+)/);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed)) {
        localStorage.setItem("cafe_table_id", parsed.toString());
        return parsed;
      }
    }

    // 2. Fallback to search query param: ?table=123
    const params = new URLSearchParams(window.location.search);
    const tableParam = params.get("table");
    if (tableParam) {
      const parsed = parseInt(tableParam, 10);
      if (!isNaN(parsed)) {
        localStorage.setItem("cafe_table_id", parsed.toString());
        return parsed;
      }
    }

    // 3. Fallback to localStorage
    const stored = localStorage.getItem("cafe_table_id");
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  });

  const setTableId = (id: number | null) => {
    setTableIdState(id);
    if (id !== null) {
      localStorage.setItem("cafe_table_id", id.toString());
    } else {
      localStorage.removeItem("cafe_table_id");
    }
  };

  // Sync URL if needed or handle changes
  useEffect(() => {
    const handlePopState = () => {
      const match = window.location.pathname.match(/^\/table\/(\d+)/);
      if (match) {
        const parsed = parseInt(match[1], 10);
        if (!isNaN(parsed) && parsed !== tableId) {
          setTableIdState(parsed);
          localStorage.setItem("cafe_table_id", parsed.toString());
        }
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [tableId]);

  return (
    <TableSessionContext.Provider value={{ tableId, setTableId }}>
      {children}
    </TableSessionContext.Provider>
  );
}

export function useTableSession() {
  const context = useContext(TableSessionContext);
  if (context === undefined) {
    throw new Error("useTableSession must be used within a TableSessionProvider");
  }
  return context;
}
